import type { AssetClass, AssetKind, BonusRegime, CareerPhase, Holding, PayrollInput, Plan, TaxRules } from './types';
import { createDefaultPlan } from './defaults';
import { computePayroll, deductiblePensionRoom } from './tax/payroll';
import { tfrQuota } from './tax/tfr';

/**
 * Migration of the v1 localStorage payload (key `fire_wealth_simulator_v1`, commit 51eee8d) to v2 plans
 * (docs/SPEC.md §6). Best effort and never throws: unusable scenarios are skipped, missing values take the v2
 * defaults, and every migrated plan carries an Italian note asking the user to check what v1 did not know (age,
 * expenses, contribution and membership years). Values are copied as they are, never "repaired": an invalid v1 value
 * shows up as a validation issue in v2.
 */

export interface MigrateOptions {
  startYear?: number;
  now?: string;
}

/* ── Legacy v1 types (copied from 51eee8d:lib/engine/types.ts and lib/store/scenario-store.ts; all optional because
 *    stored data may be partial or corrupted) ── */

type V1TfrDestination = 'PENSION_FUND' | 'COMPANY_RETAINED' | 'CUSTOM_SPLIT';
type V1BonusTaxType = 'DETASSAZIONE_5' | 'ORDINARIA_IRPEF' | 'CUSTOM';

interface V1SalaryPhase {
  id?: string;
  startYear?: number;
  endYear?: number;
  annualGrossRAL?: number;
  mensilita?: number;
  monthlyNetSavings?: number;
  extraSavings13th?: number;
  extraSavings14th?: number;
  annualBonusGross?: number;
  bonusTaxType?: V1BonusTaxType;
  bonusTaxRatePercent?: number;
  bonusInvestPercent?: number;
  tfrDestination?: V1TfrDestination;
  tfrPensionAllocationPercent?: number;
  savingsToPensionPercent?: number;
}

interface V1InvestmentBucket {
  id?: string;
  name?: string;
  allocationPercent?: number;
  expectedReturnPercent?: number;
  terPercent?: number;
  taxRatePercent?: number;
}

interface V1PensionFundConfig {
  enabled?: boolean;
  routeTfr?: boolean;
  tfrPensionAllocationPercent?: number;
  savingsToPensionPercent?: number;
  reinvestTaxRebate?: boolean;
  autoMaxDeductibility?: boolean;
  employeeContributionPercent?: number;
  employerContributionPercent?: number;
  expectedReturnPercent?: number;
  terPercent?: number;
  taxRatePercent?: number;
  annualYieldTaxRatePercent?: number;
}

interface V1TaxConfig {
  wealthTaxPercent?: number;
  pensionDeductionCap?: number;
  marginalIRPEFTaxRate?: number;
  tfrSubtractedPercentage?: number;
  tfrCompanyTaxRatePercent?: number;
  tfrCompanyFixedRevalRate?: number;
  tfrCompanyInflationWeight?: number;
  bonusSubstituteTaxRate?: number;
  pensionAnnualYieldTaxRate?: number;
}

interface V1InitialWealth {
  investedCapital?: number;
  cashLiquidity?: number;
  pensionBalance?: number;
  accumulatedTfr?: number;
}

/** v1 ScenarioParameters. */
export interface V1Scenario {
  id?: string;
  name?: string;
  description?: string;
  timeHorizonYears?: number;
  inflationEnabled?: boolean;
  inflationRatePercent?: number;
  tfrDivisor?: number;
  initialWealth?: V1InitialWealth;
  salaryPhases?: V1SalaryPhase[];
  pensionFund?: V1PensionFundConfig;
  investmentBuckets?: V1InvestmentBucket[];
  taxes?: V1TaxConfig;
}

/** v1 StorageSchemaV1. */
export interface V1State {
  version?: number;
  activeScenarioId?: string;
  comparisonScenarioIds?: string[];
  scenarios?: V1Scenario[];
  lastUpdated?: string;
}

/** Age assumed for migrated plans (v1 had no age): phase years 1…N become ages 30…29+N. */
export const V1_ASSUMED_AGE = 30;

/** Volatility assigned to migrated assets (v1 had none), %. */
const V1_VOLATILITY: Record<AssetKind, number> = { equity: 15, bond: 5, cash: 0, other: 10 };

type Obj = Record<string, unknown>;

function isObj(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Finite number or the fallback. */
function num(x: unknown, fallback: number): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : fallback;
}

function str(x: unknown, fallback: string): string {
  return typeof x === 'string' && x.trim() !== '' ? x : fallback;
}

function freshId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return `plan-${c.randomUUID()}`;
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The scenarios found in any v1-like payload: JSON text, the storage object, an array, or a single scenario. */
function extractScenarios(raw: unknown): unknown[] {
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(data)) return data;
  if (isObj(data)) {
    if (Array.isArray(data.scenarios)) return data.scenarios;
    if (Array.isArray(data.salaryPhases) || Array.isArray(data.investmentBuckets)) return [data];
  }
  return [];
}

function bonusRegime(type: unknown): BonusRegime {
  // DETASSAZIONE_5 = productivity-bonus substitute tax; ORDINARIA_IRPEF and CUSTOM (custom flat rate, not
  // representable) are taxed ordinarily in v2.
  return type === 'ORDINARIA_IRPEF' || type === 'CUSTOM' ? 'ordinary' : 'productivity';
}

/** v1 bucket → asset kind: by name when it is explicit, else by tax rate (≤ 15% = government-bond-like). */
function assetKind(bucket: V1InvestmentBucket): AssetKind {
  const name = str(bucket.name, '').toLowerCase();
  if (/\b(cash|liquidit|monetar|money market|conto deposito)/.test(name)) return 'cash';
  if (/(bond|obblig|govern|btp|treasur|aggregate|titoli di stato)/.test(name)) return 'bond';
  return num(bucket.taxRatePercent, 26) <= 15 ? 'bond' : 'equity';
}

interface Payroll0 {
  netIncome: number;
  bonusNet: number;
}

/** Year-0 net pay of a phase with the v2 rules (same contributions as the v2 engine would compute). */
function firstYearPayroll(phase: CareerPhase, plan: Plan): Payroll0 {
  const rules: TaxRules = plan.taxRules;
  const ral = Math.max(0, phase.ralToday);
  let base = 0;
  let employer = 0;
  if (plan.pensionFund.enabled) {
    employer = phase.employeePensionPct > 0 ? (ral * phase.employerPensionPct) / 100 : 0;
    base = (ral * phase.employeePensionPct) / 100;
  }
  const bonus = Math.max(0, phase.bonusGrossToday);
  const input: PayrollInput = {
    ral,
    ordinaryBonus: phase.bonusRegime === 'ordinary' ? bonus : 0,
    productivityBonus: phase.bonusRegime === 'productivity' ? bonus : 0,
    priorYearIncome: ral,
    employeePensionContribution: base,
    employerPensionContribution: employer,
    calendarYear: plan.profile.startYear,
    priceIndex: 1,
  };
  // fillCap: up to the deductible room, as in the engine's working year (simulate.ts workYear).
  if (plan.pensionFund.enabled && plan.savingsPolicy.voluntaryPension === 'fillCap') {
    input.employeePensionContribution = Math.max(base, deductiblePensionRoom(input, rules));
  }
  const withBonus = computePayroll(input, rules, { derived: false });
  const withoutBonus = computePayroll({ ...input, ordinaryBonus: 0, productivityBonus: 0 }, rules, { derived: false });
  return { netIncome: withBonus.netIncome, bonusNet: withBonus.netIncome - withoutBonus.netIncome };
}

function formatEuro(x: number): string {
  return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function migrateScenario(raw: unknown, index: number, opts: Required<MigrateOptions>): Plan | null {
  if (!isObj(raw)) return null;
  const v1 = raw as V1Scenario;
  const name = str(v1.name, `Scenario ${index + 1}`);
  const plan = createDefaultPlan({ id: freshId(), name, startYear: opts.startYear, now: opts.now });
  const age0 = V1_ASSUMED_AGE;
  plan.profile.currentAge = age0;

  const pf: V1PensionFundConfig = isObj(v1.pensionFund) ? v1.pensionFund : {};
  const taxes: V1TaxConfig = isObj(v1.taxes) ? v1.taxes : {};
  const wealth: V1InitialWealth = isObj(v1.initialWealth) ? v1.initialWealth : {};
  plan.pensionFund.enabled = pf.enabled === true;

  /* ── Tax rules: v2 defaults (v1 values were outdated) except the parameters v1 let the user change ── */
  if (num(v1.tfrDivisor, 0) > 0) plan.taxRules.tfr.divisor = num(v1.tfrDivisor, plan.taxRules.tfr.divisor);
  if (num(taxes.wealthTaxPercent, -1) >= 0) plan.taxRules.investments.stampDutyPct = num(taxes.wealthTaxPercent, 0.2);

  /* ── Career ── */
  const globalTfrPct = num(pf.tfrPensionAllocationPercent, pf.routeTfr ? 100 : 0);
  const phasesRaw = (Array.isArray(v1.salaryPhases) ? v1.salaryPhases : []).filter(isObj) as V1SalaryPhase[];
  const phases = phasesRaw
    .map((p, i) => ({ p, i }))
    .sort((a, b) => num(a.p.startYear, a.i) - num(b.p.startYear, b.i) || a.i - b.i)
    .map((x) => x.p);
  if (pf.autoMaxDeductibility === true) plan.savingsPolicy.voluntaryPension = 'fillCap';
  else plan.savingsPolicy.voluntaryPension = 'none';
  plan.career = phases.map((p, i): CareerPhase => {
    const tfrFromDestination =
      p.tfrDestination === 'PENSION_FUND' ? 100 : p.tfrDestination === 'COMPANY_RETAINED' ? 0 : undefined;
    return {
      id: str(p.id, `phase-${i + 1}`),
      label: `Fase ${i + 1}`,
      // v1 phases cover years startYear…endYear (1-indexed): year N is age age0 + N − 1, so the phase ends at age0 + endYear.
      untilAge: age0 + num(p.endYear, i + 1),
      ralToday: num(p.annualGrossRAL, 0),
      realRaisePct: 0,
      mensilita: num(p.mensilita, 13),
      bonusGrossToday: num(p.annualBonusGross, 0),
      bonusRegime: bonusRegime(p.bonusTaxType),
      employeePensionPct: num(pf.employeeContributionPercent, 0),
      employerPensionPct: num(pf.employerContributionPercent, 0),
      tfrToFundPct: num(p.tfrPensionAllocationPercent, tfrFromDestination ?? globalTfrPct),
    };
  });

  /* ── Expenses inferred from the first phase: net pay − what the user saved in v1 (monthly savings, 13th/14th
   *    extras, net bonus). v1's IRPEF rebate of the pension contributions is NOT a saving: it was a phantom inflow on
   *    top of what the user typed, while the v2 net pay already contains the deduction withheld at source
   *    (SPEC §5.1), so counting it again would understate the expenses. ── */
  const notes: string[] = [];
  const first = phases[0];
  const firstPhase = plan.career[0];
  let savingsToPension = 0;
  if (first && firstPhase) {
    const payroll = firstYearPayroll(firstPhase, plan);
    const mensilita = num(first.mensilita, 13);
    const yearlySavings =
      num(first.monthlyNetSavings, 0) * 12 +
      (mensilita >= 13 ? num(first.extraSavings13th, 0) : 0) +
      (mensilita >= 14 ? num(first.extraSavings14th, 0) : 0) +
      // v1 invested bonusInvestPercent of the net bonus and kept the rest in cash: the whole net bonus was saved.
      payroll.bonusNet;
    plan.spending.monthlyToday = Math.max(0, Math.round((payroll.netIncome - yearlySavings) / 12));
    const pensionPct = num(first.savingsToPensionPercent, num(pf.savingsToPensionPercent, 0));
    if (plan.pensionFund.enabled && pensionPct > 0 && plan.savingsPolicy.voluntaryPension === 'none') {
      savingsToPension = Math.round(yearlySavings * (pensionPct / 100));
      plan.savingsPolicy.voluntaryPension = 'fixed';
      plan.savingsPolicy.voluntaryPensionFixedToday = savingsToPension;
    }
  }

  /* ── Investments ── */
  const buckets = (Array.isArray(v1.investmentBuckets) ? v1.investmentBuckets : []).filter(isObj) as V1InvestmentBucket[];
  const usedIds = new Set<string>();
  plan.portfolio.assets = buckets.map((b, i): AssetClass => {
    let id = str(b.id, `asset-${i + 1}`);
    if (usedIds.has(id)) id = `${id}-${i + 1}`;
    usedIds.add(id);
    const kind = assetKind(b);
    return {
      id,
      name: str(b.name, `Asset ${i + 1}`),
      kind,
      allocationPct: num(b.allocationPercent, 0),
      expectedReturnPct: num(b.expectedReturnPercent, 0),
      volatilityPct: V1_VOLATILITY[kind],
      terPct: num(b.terPercent, 0),
      taxRatePct: num(b.taxRatePercent, 26),
    };
  });
  const invested = Math.max(0, num(wealth.investedCapital, 0));
  const allocSum = plan.portfolio.assets.reduce((s, a) => s + Math.max(0, a.allocationPct), 0);
  plan.assets.holdings = plan.portfolio.assets
    .map((a): Holding => {
      const value = allocSum > 0 ? (invested * Math.max(0, a.allocationPct)) / allocSum : 0;
      return { assetId: a.id, value, costBasis: value };
    })
    .filter((h) => h.value > 0);

  /* ── Balances ── */
  plan.assets.cash = num(wealth.cashLiquidity, 0);
  const pensionBalance = num(wealth.pensionBalance, 0);
  plan.assets.pensionFund = { balance: pensionBalance, taxableBasis: pensionBalance, membershipStartYear: opts.startYear };
  const companyTfr = num(wealth.accumulatedTfr, 0);
  const quota = firstPhase ? tfrQuota(firstPhase.ralToday, plan.taxRules) : 0;
  // Years of service behind the accrued TFR (needed for its separate taxation), estimated from the first RAL.
  const tfrYears = companyTfr > 0 && quota > 0 ? Math.max(1, Math.round(companyTfr / quota)) : 0;
  plan.assets.companyTfr = companyTfr;
  plan.assets.companyTfrYears = tfrYears;
  plan.assets.inps = { contributionYears: tfrYears, montante: 0 };

  /* ── Pension fund line ── */
  plan.pensionFund.expectedReturnPct = num(pf.expectedReturnPercent, plan.pensionFund.expectedReturnPct);
  plan.pensionFund.costPct = num(pf.terPercent, plan.pensionFund.costPct);
  const yieldTax = num(pf.annualYieldTaxRatePercent, num(taxes.pensionAnnualYieldTaxRate, NaN));
  if (Number.isFinite(yieldTax)) {
    // v1 had a flat yield tax: express it as the white-list share that gives the same effective rate.
    const full = plan.taxRules.pensionFund.yieldTaxPct;
    const gov = plan.taxRules.pensionFund.govBondYieldTaxPct;
    const share = full > gov ? ((full - yieldTax) / (full - gov)) * 100 : 0;
    plan.pensionFund.govBondSharePct = Math.round(Math.min(100, Math.max(0, share)));
  }

  /* ── Market ── */
  plan.market.inflationPct = v1.inflationEnabled === false ? 0 : num(v1.inflationRatePercent, plan.market.inflationPct);

  /* ── Note for the user (Italian: the app's default language; stored as plan content) ── */
  notes.push(
    `Piano importato dalla versione precedente (scenario «${name}»).`,
    `Controlla i dati che la versione precedente non conosceva: età attuale (impostata a ${age0} anni, quindi le fasi di carriera finiscono a ${plan.career
      .map((c) => c.untilAge)
      .join(', ')} anni), spese mensili (stimate in ${formatEuro(plan.spending.monthlyToday)} € come reddito netto meno i risparmi della prima fase), anni di contributi INPS e di TFR (stimati in ${tfrYears}) e anno di iscrizione al fondo pensione.`,
    'Tutti gli importi sono considerati in euro di oggi; le regole fiscali sono quelle aggiornate al 2026.',
  );
  if (savingsToPension > 0) {
    notes.push(`La quota dei risparmi destinata al fondo pensione è diventata un contributo volontario fisso di ${formatEuro(savingsToPension)} € l'anno.`);
  }
  if (phases.some((p) => p.bonusTaxType === 'CUSTOM')) {
    notes.push("I premi con aliquota personalizzata sono ora tassati in modo ordinario: verifica il regime del premio.");
  }
  if (phases.length === 0) notes.push('Lo scenario non conteneva fasi di carriera: aggiungine almeno una.');
  const description = str(v1.description, '');
  if (description) notes.push(`Descrizione originale: ${description}`);
  plan.notes = notes.join('\n');
  return plan;
}

/**
 * Converts the v1 localStorage payload into v2 plans (one per v1 scenario, each with a fresh id and the v1 name).
 * Accepts the parsed object, its JSON text, an array of scenarios or a single scenario. Never throws: returns [] if
 * nothing usable is found.
 */
export function migrateV1State(raw: unknown, opts: MigrateOptions = {}): Plan[] {
  try {
    const now = typeof opts.now === 'string' && opts.now !== '' ? opts.now : new Date().toISOString();
    const parsedYear = new Date(now).getUTCFullYear();
    const startYear = Number.isInteger(opts.startYear) ? (opts.startYear as number) : Number.isFinite(parsedYear) ? parsedYear : 2026;
    const out: Plan[] = [];
    extractScenarios(raw).forEach((scenario, i) => {
      try {
        const plan = migrateScenario(scenario, i, { now, startYear });
        if (plan) out.push(plan);
      } catch {
        // Skip a scenario that cannot be read at all.
      }
    });
    return out;
  } catch {
    return [];
  }
}
