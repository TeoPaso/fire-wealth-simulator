import type { BonusRegime, MarketPath, PayrollBreakdown, PayrollInput, Plan, RebalancingMode, TaxRules, YearRow } from './types';
import { irpefIndexFactor } from './tax/irpef';
import { computePayroll, inpsCeiling, productivityBonusEligible, productivityBonusRegime } from './tax/payroll';
import { netPensionIncome } from './tax/pensionIncome';
import { exitTaxRatePct, yieldTaxRatePct } from './tax/pensionFund';
import { tfrQuota, tfrRevaluationRatePct, tfrSeparateTaxRatePct } from './tax/tfr';
import { allocateBuys, latentTax, rebalanceAnnual, sellForNet } from './portfolio';

/**
 * Year-by-year simulation of one plan on one market path with one retirement age (docs/SPEC.md §5.1–5.7).
 * Nominal euros, one step per calendar year, flows at mid-year. The plan must have passed validatePlan().
 */

/** Modelling constants of the simulation (SPEC §5; not legal parameters, which all live in TaxRules). */
export const SIM_MODEL = {
  /** A year fails when the need not covered by accessible assets exceeds this amount (€). */
  shortfallThreshold: 0.5,
  /** Guardrails: the cut applies when withdrawals / start accessible wealth > swr × this multiple. */
  guardrailTriggerMultiple: 1.2,
  /** Montante estimate when unknown: contributionYears × accrual rate × RAL₀ × this career-average factor. */
  montanteEstimateFactor: 0.85,
} as const;

/* ───────────────────────────── Prepared plan ───────────────────────────── */

export interface PreparedPhase {
  index: number;
  startAge: number;
  untilAge: number;
  ralToday: number;
  /** 1 + real raise. */
  growth: number;
  bonusToday: number;
  /** Effective regime ('pensionFund' becomes 'productivity' when the fund is disabled). */
  regime: BonusRegime;
  employeePct: number;
  employerPct: number;
  tfrToFundPct: number;
}

export interface PreparedPlan {
  plan: Plan;
  rules: TaxRules;
  currentAge: number;
  lifeExpectancy: number;
  startYear: number;
  /** Number of simulated years (rows): lifeExpectancy − currentAge + 1. */
  years: number;
  nAssets: number;
  weights: Float64Array;
  ter: Float64Array;
  taxRates: Float64Array;
  initValues: Float64Array;
  initBasis: Float64Array;
  rebalancing: RebalancingMode;
  phases: PreparedPhase[];
  events: { age: number; years: number; amountToday: number }[];
  monthlyToday: number;
  retirementFactor: number;
  efMonths: number;
  voluntaryMode: Plan['savingsPolicy']['voluntaryPension'];
  voluntaryFixedToday: number;
  cap: number;
  pfEnabled: boolean;
  pfBalance0: number;
  pfBasis0: number;
  pfCost: number;
  pfYieldTax: number;
  pfAccessAge: number;
  pfCapitalShare: number;
  pfAnnuityRate: number;
  pfMembershipStartYear: number;
  oldAgeAge: number;
  spMode: Plan['statePension']['mode'];
  spMonthlyNetToday: number;
  spClaimAge: number;
  spGdp: number;
  spIndexation: number;
  installments: number;
  coefficientAges: number[];
  contributionYears0: number;
  montante0: number;
  montanteEstimated: boolean;
  cash0: number;
  cashRate: number;
  cashTax: number;
  stampPct: number;
  cashStamp: number;
  cashStampThreshold: number;
  companyTfr0: number;
  companyTfrYears0: number;
  swrPct: number;
  guardrails: boolean;
  cutPct: number;
}

/** Precomputes the static parts of a (valid) plan. Cheap; call once per plan in loops. */
export function preparePlan(plan: Plan): PreparedPlan {
  const rules = plan.taxRules;
  const assets = plan.portfolio.assets;
  const n = assets.length;
  const index = new Map(assets.map((a, i) => [a.id, i]));
  const initValues = new Float64Array(n);
  const initBasis = new Float64Array(n);
  for (const h of plan.assets.holdings) {
    const i = index.get(h.assetId);
    if (i === undefined) continue;
    initValues[i] += h.value;
    initBasis[i] += h.costBasis;
  }
  const pfEnabled = plan.pensionFund.enabled;
  let startAge = plan.profile.currentAge;
  const phases: PreparedPhase[] = plan.career.map((p, i) => {
    const phase: PreparedPhase = {
      index: i,
      startAge,
      untilAge: p.untilAge,
      ralToday: p.ralToday,
      growth: 1 + p.realRaisePct / 100,
      bonusToday: p.bonusGrossToday,
      regime: p.bonusRegime === 'pensionFund' && !pfEnabled ? 'productivity' : p.bonusRegime,
      employeePct: p.employeePensionPct,
      employerPct: p.employerPensionPct,
      tfrToFundPct: p.tfrToFundPct,
    };
    startAge = p.untilAge;
    return phase;
  });
  const coefficientAges = Object.keys(rules.statePension.transformationCoefficients)
    .map(Number)
    .filter((a) => Number.isFinite(a))
    .sort((a, b) => a - b);
  const currentAge = plan.profile.currentAge;
  const firstRal = phases.length > 0 ? phaseAt(phases, currentAge).ralToday : 0;
  const montanteKnown = plan.assets.inps.montante > 0;
  const montante0 =
    plan.statePension.mode !== 'contributivo'
      ? 0
      : montanteKnown
        ? plan.assets.inps.montante
        : (plan.assets.inps.contributionYears * rules.inps.pensionAccrualRatePct * firstRal * SIM_MODEL.montanteEstimateFactor) / 100;
  return {
    plan,
    rules,
    currentAge,
    lifeExpectancy: plan.profile.lifeExpectancy,
    startYear: plan.profile.startYear,
    years: plan.profile.lifeExpectancy - currentAge + 1,
    nAssets: n,
    weights: Float64Array.from(assets.map((a) => a.allocationPct / 100)),
    ter: Float64Array.from(assets.map((a) => a.terPct / 100)),
    taxRates: Float64Array.from(assets.map((a) => a.taxRatePct / 100)),
    initValues,
    initBasis,
    rebalancing: plan.portfolio.rebalancing,
    phases,
    events: plan.spending.events.map((e) => ({ age: e.age, years: e.years, amountToday: e.amountToday })),
    monthlyToday: plan.spending.monthlyToday,
    retirementFactor: plan.spending.retirementPct / 100,
    efMonths: plan.savingsPolicy.emergencyFundMonths,
    voluntaryMode: plan.savingsPolicy.voluntaryPension,
    voluntaryFixedToday: plan.savingsPolicy.voluntaryPensionFixedToday,
    cap: rules.pensionFund.deductionCap,
    pfEnabled,
    pfBalance0: plan.assets.pensionFund.balance,
    pfBasis0: Math.min(plan.assets.pensionFund.taxableBasis, plan.assets.pensionFund.balance),
    pfCost: plan.pensionFund.costPct / 100,
    pfYieldTax: yieldTaxRatePct(plan.pensionFund.govBondSharePct, rules) / 100,
    pfAccessAge: plan.pensionFund.accessAge,
    pfCapitalShare: plan.pensionFund.capitalSharePct / 100,
    pfAnnuityRate: plan.pensionFund.annuityRatePct / 100,
    pfMembershipStartYear: plan.assets.pensionFund.membershipStartYear,
    oldAgeAge: rules.statePension.oldAgeAge,
    spMode: plan.statePension.mode,
    spMonthlyNetToday: plan.statePension.monthlyNetToday,
    spClaimAge: plan.statePension.claimAge,
    spGdp: plan.statePension.realGdpGrowthPct / 100,
    spIndexation: plan.statePension.indexationPct / 100,
    installments: rules.statePension.installmentsPerYear,
    coefficientAges,
    contributionYears0: plan.assets.inps.contributionYears,
    montante0,
    montanteEstimated: plan.statePension.mode === 'contributivo' && !montanteKnown,
    cash0: plan.assets.cash,
    cashRate: plan.market.cashRatePct / 100,
    cashTax: rules.investments.cashInterestTaxPct / 100,
    stampPct: rules.investments.stampDutyPct / 100,
    cashStamp: rules.investments.cashStampDuty,
    cashStampThreshold: rules.investments.cashStampDutyThreshold,
    companyTfr0: plan.assets.companyTfr,
    companyTfrYears0: plan.assets.companyTfrYears,
    swrPct: plan.withdrawal.swrPct,
    guardrails: plan.withdrawal.strategy === 'guardrails',
    cutPct: plan.withdrawal.guardrailCutPct,
  };
}

/** Career phase in force at `age`: the first with untilAge > age, else the last one (SPEC §5.1). */
export function phaseAt(phases: PreparedPhase[], age: number): PreparedPhase {
  for (const p of phases) if (p.untilAge > age) return p;
  return phases[phases.length - 1];
}

/** Transformation coefficient (%) for a claim age: exact key, linear interpolation in gaps, clamped at the ends. */
export function transformationCoefficient(prep: PreparedPlan, age: number): number {
  const table = prep.rules.statePension.transformationCoefficients;
  const ages = prep.coefficientAges;
  if (ages.length === 0) return 0;
  if (age <= ages[0]) return table[String(ages[0])];
  const last = ages[ages.length - 1];
  if (age >= last) return table[String(last)];
  for (let i = 1; i < ages.length; i++) {
    if (ages[i] >= age) {
      const lo = ages[i - 1];
      const hi = ages[i];
      const a = table[String(lo)];
      const b = table[String(hi)];
      return a + ((b - a) * (age - lo)) / (hi - lo);
    }
  }
  return table[String(last)];
}

/** Contribution years accrued by `age` when work stops at `retirementAge` (one per working year). */
export function contributionYearsAt(prep: PreparedPlan, age: number, retirementAge: number): number {
  return prep.contributionYears0 + Math.max(0, Math.min(age, retirementAge) - prep.currentAge);
}

/**
 * Age at which the state pension starts (SPEC §5.4), or null when the minimum contribution years are not reached.
 * - estimate: the user's claim age.
 * - contributivo: max(claimAge, oldAgeAge) with >= oldAgeMinYears, else max(fallbackAge, claimAge) with
 *   >= fallbackMinYears, else none.
 * In both modes the pension cannot start while still working (the old-age pension requires leaving the job), so the
 * result is at least the retirement age.
 */
export function statePensionClaimAge(prep: PreparedPlan, retirementAge: number): number | null {
  const sp = prep.rules.statePension;
  if (prep.spMode === 'estimate') return Math.max(prep.spClaimAge, retirementAge);
  const base = Math.max(prep.spClaimAge, sp.oldAgeAge);
  if (contributionYearsAt(prep, base, retirementAge) >= sp.oldAgeMinYears) return Math.max(base, retirementAge);
  const fallback = Math.max(sp.fallbackAge, prep.spClaimAge);
  if (contributionYearsAt(prep, fallback, retirementAge) >= sp.fallbackMinYears) return Math.max(fallback, retirementAge);
  return null;
}

/** Retirement age used when 'auto' finds no FI age: the (nominal) state-pension age. */
export function fallbackRetirementAge(prep: PreparedPlan): number {
  return prep.spMode === 'contributivo' ? Math.max(prep.spClaimAge, prep.oldAgeAge) : prep.spClaimAge;
}

/* ───────────────────────────── Working-year cache ───────────────────────────── */

/** Everything about a working year that does not depend on the retirement age (only on the path). */
export interface WorkYear {
  phaseIndex: number;
  ral: number;
  bonusGross: number;
  productivityBonus: number;
  bonusToFund: number;
  welfare: number;
  priorYearIncome: number;
  employee: number;
  employer: number;
  payroll: PayrollBreakdown;
  tfrQuota: number;
  tfrToFund: number;
  tfrToCompany: number;
  /** Increase of the fund's taxable basis: deductible employee + min(employer, cap) + TFR to fund. */
  pfTaxableAdd: number;
  /** Employment income of the year (for next year's productivity-bonus eligibility). */
  employmentIncome: number;
  bonusAboveCap: boolean;
  bonusCap: number;
  bonusIneligible: boolean;
  contributionAboveCap: boolean;
}

/**
 * Per-(plan, path) cache of the price index and of the working years. Years before the retirement age are
 * working years for every candidate retirement age, so their payroll is computed once and shared (Monte Carlo
 * common random numbers, FI-age scan).
 */
export interface WorkCache {
  derived: boolean;
  path: MarketPath;
  /** P_t at the start of year t, t = 0 … years (the last entry is the index at the end of the horizon). */
  priceIndex: Float64Array;
  work: (WorkYear | undefined)[];
}

export function createWorkCache(prep: PreparedPlan, path: MarketPath, derived: boolean): WorkCache {
  const priceIndex = new Float64Array(prep.years + 1);
  priceIndex[0] = 1;
  for (let t = 0; t < prep.years; t++) priceIndex[t + 1] = priceIndex[t] * (1 + path.inflation[t]);
  return { derived, path, priceIndex, work: new Array(prep.years) };
}

function employmentIncomeOf(p: PayrollBreakdown): number {
  return p.gross - p.inps - p.deductiblePension + p.employerExcessTaxable;
}

export function workYear(prep: PreparedPlan, cache: WorkCache, t: number): WorkYear {
  const cached = cache.work[t];
  if (cached) return cached;
  const rules = prep.rules;
  const age = prep.currentAge + t;
  const year = prep.startYear + t;
  const P = cache.priceIndex[t];
  const ph = phaseAt(prep.phases, age);
  const growth = Math.pow(ph.growth, age - ph.startAge);
  const ral = ph.ralToday * growth * P;
  const bonus = ph.bonusToday * growth * P;
  const regime = ph.regime;

  let employer = 0;
  let employee = 0;
  if (prep.pfEnabled) {
    employer = ph.employeePct > 0 ? (ral * ph.employerPct) / 100 : 0;
    const base = (ral * ph.employeePct) / 100;
    let voluntary = 0;
    if (prep.voluntaryMode === 'fillCap') voluntary = Math.max(0, prep.cap - employer - base);
    else if (prep.voluntaryMode === 'fixed') voluntary = prep.voluntaryFixedToday * P;
    employee = base + voluntary;
  }
  const productivityBonus = regime === 'productivity' ? bonus : 0;
  const input: PayrollInput = {
    ral,
    ordinaryBonus: regime === 'ordinary' ? bonus : 0,
    productivityBonus,
    priorYearIncome: 0,
    employeePensionContribution: employee,
    employerPensionContribution: employer,
    calendarYear: year,
    priceIndex: P,
  };
  if (t > 0) {
    input.priorYearIncome = workYear(prep, cache, t - 1).employmentIncome;
  } else if (productivityBonus > 0) {
    // No history before t = 0: the year's own employment income is the best estimate of the prior year's.
    input.priorYearIncome = employmentIncomeOf(computePayroll(input, rules, { derived: false }));
  }
  const payroll = computePayroll(input, rules, { derived: cache.derived });
  const quota = tfrQuota(ral, rules);
  const toFund = prep.pfEnabled ? (quota * ph.tfrToFundPct) / 100 : 0;
  const eligible = productivityBonusEligible(input.priorYearIncome, rules);
  const bonusCap = productivityBonusRegime(rules, year).cap;
  const entry: WorkYear = {
    phaseIndex: ph.index,
    ral,
    bonusGross: bonus,
    productivityBonus,
    bonusToFund: regime === 'pensionFund' ? bonus : 0,
    welfare: regime === 'welfare' ? bonus : 0,
    priorYearIncome: input.priorYearIncome,
    employee,
    employer,
    payroll,
    tfrQuota: quota,
    tfrToFund: toFund,
    tfrToCompany: quota - toFund,
    pfTaxableAdd: payroll.deductiblePension + Math.min(employer, prep.cap) + toFund,
    employmentIncome: employmentIncomeOf(payroll),
    bonusAboveCap: productivityBonus > 0 && eligible && productivityBonus > bonusCap + 0.005,
    bonusCap,
    bonusIneligible: productivityBonus > 0 && !eligible,
    contributionAboveCap: payroll.nonDeductiblePension > 0.005 || payroll.employerExcessTaxable > 0.005,
  };
  cache.work[t] = entry;
  return entry;
}

/* ───────────────────────────── Simulation ───────────────────────────── */

export interface SimulateOptions {
  retirementAge: number;
  path: MarketPath;
  /** true = build YearRow[] (UI); false = only the outcome (Monte Carlo / FI-age scan). */
  detail: boolean;
  /** Stop at the first failed year (only `success` / `depletionAge` are then meaningful). */
  stopOnShortfall?: boolean;
  /** Shared working-year cache for this plan and path (created if absent). */
  cache?: WorkCache;
  /** Writes end-of-year net worth / accessible wealth in today's € at record.*[offset + t]. */
  record?: { netWorth: Float64Array; accessible: Float64Array; offset: number };
}

/** First occurrences used for post-run issues (detail runs only). */
export interface SimulationSignals {
  negativeSavingsWhileWorking: { age: number } | null;
  bonusAboveCap: { age: number; phaseIndex: number; cap: number } | null;
  bonusIneligibleIncome: { age: number; phaseIndex: number } | null;
  contributionAboveCap: { age: number; phaseIndex: number } | null;
  /** Membership years at the first payment of the fund (null if nothing was paid). */
  pfMembershipAtAccess: number | null;
}

export interface SimulationResult {
  rows: YearRow[] | null;
  success: boolean;
  depletionAge: number | null;
  retirementAge: number;
  statePensionClaimAge: number | null;
  /** Net state pension of the first year, nominal and in today's € (0 if not reached within the horizon). */
  statePensionNetAtClaim: number;
  statePensionNetAtClaimToday: number;
  pensionFundAccessAge: number;
  signals: SimulationSignals;
}

const PF_ACCUMULATING = 0;
const PF_RITA = 1;
const PF_ANNUITY = 2;
const PF_DONE = 3;

function clamp01(x: number): number {
  return x > 1 ? 1 : x > 0 ? x : 0;
}

/** Runs the yearly loop of SPEC §5 for a prepared plan. */
export function simulatePrepared(prep: PreparedPlan, opts: SimulateOptions): SimulationResult {
  const { path, detail } = opts;
  const R = opts.retirementAge;
  const rules = prep.rules;
  const cache = opts.cache ?? createWorkCache(prep, path, detail);
  const n = prep.nAssets;
  const weights = prep.weights;
  const taxRates = prep.taxRates;
  const mode = prep.rebalancing;
  const V = prep.initValues.slice();
  const basis = prep.initBasis.slice();
  const mid = new Float64Array(n);
  const growth = new Float64Array(n);
  const buys = new Float64Array(n);
  const sells = new Float64Array(n);
  const gainTax = new Float64Array(n);

  let cash = prep.cash0;

  // Pension fund
  let pf = prep.pfBalance0;
  let pfBasis = prep.pfBasis0;
  let lossCarry = 0;
  let pfStage = PF_ACCUMULATING;
  const accessAge = Math.max(prep.pfAccessAge, R);
  const rita = accessAge < prep.oldAgeAge;
  let annuityGross = 0;
  let annuityTaxRate = 0;
  const minMembership = rules.pensionFund.minMembershipYears;

  // TFR kept by the employer
  let companyTfr = prep.companyTfr0;
  let tfrPrincipal = prep.companyTfr0;
  let tfrYears = prep.companyTfrYears0;
  let tfrPaid = false;

  // State pension
  const claimAge = statePensionClaimAge(prep, R);
  const contributivo = prep.spMode === 'contributivo';
  let montante = prep.montante0;
  let claimed = false;
  let spGross = 0;
  let spNetAtClaim = 0;
  let spNetAtClaimToday = 0;

  const rows: YearRow[] | null = detail ? [] : null;
  const signals: SimulationSignals = {
    negativeSavingsWhileWorking: null,
    bonusAboveCap: null,
    bonusIneligibleIncome: null,
    contributionAboveCap: null,
    pfMembershipAtAccess: null,
  };
  let depletionAge: number | null = null;
  const record = opts.record;

  for (let t = 0; t < prep.years; t++) {
    const age = prep.currentAge + t;
    const year = prep.startYear + t;
    const P = cache.priceIndex[t];
    const Pnext = cache.priceIndex[t + 1];
    const pi = path.inflation[t];
    const working = age < R;
    const w = working ? workYear(prep, cache, t) : null;
    const irpefF = irpefIndexFactor(rules, P);

    /* ── TFR kept by the employer (§5.2) ── */
    let tfrRevaluationNet = 0;
    let tfrRevaluationTax = 0;
    let tfrPayoutNet = 0;
    let tfrPayoutTax = 0;
    if (!tfrPaid) {
      if (w) {
        const reval = (companyTfr * tfrRevaluationRatePct(pi * 100, rules)) / 100;
        tfrRevaluationTax = (Math.max(0, reval) * rules.tfr.revalTaxPct) / 100;
        tfrRevaluationNet = reval - tfrRevaluationTax;
        companyTfr += tfrRevaluationNet + w.tfrToCompany;
        tfrPrincipal += w.tfrToCompany;
        if (w.tfrToCompany > 0) tfrYears += 1;
      } else {
        // Job exit: paid at the start of the first year without work, taxed separately on the principal only.
        const rate = tfrSeparateTaxRatePct(tfrPrincipal, tfrYears, rules, irpefF) / 100;
        tfrPayoutTax = Math.min(companyTfr, tfrPrincipal * rate);
        tfrPayoutNet = companyTfr - tfrPayoutTax;
        companyTfr = 0;
        tfrPrincipal = 0;
        tfrPaid = true;
      }
    }

    /* ── Pension fund (§5.3) ── */
    const pfEmployee = w ? w.employee : 0;
    const pfEmployer = w ? w.employer : 0;
    const pfTfr = w ? w.tfrToFund : 0;
    const pfBonus = w ? w.bonusToFund : 0;
    let pfReturn = 0;
    let pfCosts = 0;
    let pfYieldTax = 0;
    let pfLumpSumNet = 0;
    let pfExitTax = 0;
    let pensionAnnuityNet = 0;
    if (pfStage === PF_ACCUMULATING && age >= accessAge) {
      const membership = Math.max(0, year - prep.pfMembershipStartYear);
      if (pf > 0 && signals.pfMembershipAtAccess === null) signals.pfMembershipAtAccess = membership;
      if (rita) {
        pfStage = PF_RITA;
      } else {
        const share = pf > 0 ? clamp01(pfBasis / pf) : 0;
        const exitRate = exitTaxRatePct(membership, rules) / 100;
        const lump = pf * prep.pfCapitalShare;
        const lumpTax = lump * share * exitRate;
        pfLumpSumNet += lump - lumpTax;
        pfExitTax += lumpTax;
        annuityGross = (pf - lump) * prep.pfAnnuityRate;
        annuityTaxRate = share * exitRate;
        pf = 0;
        pfBasis = 0;
        lossCarry = 0;
        pfStage = PF_ANNUITY;
      }
    }
    if (pfStage === PF_RITA) {
      // Rendita integrativa temporanea anticipata: equal shares of the remaining position until oldAgeAge.
      const remaining = prep.oldAgeAge - age;
      const instalment = remaining <= 1 ? pf : pf / remaining;
      const share = pf > 0 ? clamp01(pfBasis / pf) : 0;
      const exitRate = exitTaxRatePct(Math.max(0, year - prep.pfMembershipStartYear), rules) / 100;
      const tax = instalment * share * exitRate;
      pfLumpSumNet += instalment - tax;
      pfExitTax += tax;
      if (pf > 0) pfBasis -= (pfBasis * instalment) / pf;
      pf -= instalment;
      if (remaining <= 1) {
        pf = 0;
        pfBasis = 0;
        lossCarry = 0;
        pfStage = PF_DONE;
      }
    }
    if (pfStage === PF_ANNUITY && annuityGross > 0) {
      const tax = annuityGross * annuityTaxRate;
      pensionAnnuityNet = annuityGross - tax;
      pfExitTax += tax;
    }
    if (pfStage === PF_ACCUMULATING || pfStage === PF_RITA) {
      const contributions = pfEmployee + pfEmployer + pfTfr + pfBonus;
      if (pf !== 0 || contributions !== 0) {
        const r = path.pensionFundReturns[t];
        const G = Math.max(0, (1 + r) * (1 - prep.pfCost));
        const end = pf * G + contributions * Math.sqrt(G);
        const result = end - pf - contributions;
        pfCosts = pf * (1 + r) + contributions * Math.sqrt(Math.max(0, 1 + r)) - end;
        pfReturn = result + pfCosts;
        if (result > 0) {
          const offset = Math.min(lossCarry, result);
          lossCarry -= offset;
          pfYieldTax = (result - offset) * prep.pfYieldTax;
        } else {
          lossCarry -= result;
        }
        pf = end - pfYieldTax;
        if (w) pfBasis += w.pfTaxableAdd;
      }
    }

    /* ── State pension (§5.4) ── */
    let statePensionNet = 0;
    let statePensionGross = 0;
    let statePensionTax = 0;
    if (!claimed && claimAge !== null && age >= claimAge) {
      claimed = true;
      if (contributivo) {
        spGross = (montante * transformationCoefficient(prep, claimAge)) / 100;
        montante = 0;
      }
    }
    if (claimed) {
      if (contributivo) {
        const tax = netPensionIncome(spGross, rules, irpefF);
        statePensionGross = spGross;
        statePensionNet = tax.net;
        statePensionTax = tax.irpef + tax.surcharges;
        // Perequazione for next year (never negative).
        spGross *= 1 + prep.spIndexation * Math.max(0, pi);
      } else {
        statePensionNet = prep.spMonthlyNetToday * prep.installments * P;
        statePensionGross = statePensionNet;
      }
      if (spNetAtClaim === 0 && age === claimAge) {
        spNetAtClaim = statePensionNet;
        spNetAtClaimToday = statePensionNet / P;
      }
    } else if (contributivo) {
      // Revaluation (never below 1, DL 65/2015 art. 5) then this year's contributions.
      montante *= Math.max(1, 1 + pi + prep.spGdp);
      if (w) montante += (rules.inps.pensionAccrualRatePct / 100) * Math.min(w.ral, inpsCeiling(rules, P));
    }

    /* ── Living costs, events, cash (§5.5) ── */
    let livingExpenses = prep.monthlyToday * 12 * P * (working ? 1 : prep.retirementFactor);
    let eventsExpense = 0;
    let eventsInflow = 0;
    for (const ev of prep.events) {
      if (age >= ev.age && age < ev.age + ev.years) {
        const amount = ev.amountToday * P;
        if (amount >= 0) eventsExpense += amount;
        else eventsInflow -= amount;
      }
    }
    let portfolioStart = 0;
    for (let i = 0; i < n; i++) portfolioStart += V[i];
    const cashStart = cash;
    const cashInterestGross = cashStart * prep.cashRate;
    const cashInterestNet = cashInterestGross * (1 - prep.cashTax);
    const stampDuty = portfolioStart * prep.stampPct + (cashStart > prep.cashStampThreshold ? prep.cashStamp : 0);

    /* ── Waterfall (§5.6) ── */
    const netIncome = w ? w.payroll.netIncome : 0;
    const welfare = w ? w.welfare : 0;
    const inflows =
      netIncome + welfare + cashInterestNet + eventsInflow + statePensionNet + pensionAnnuityNet + pfLumpSumNet + tfrPayoutNet;
    let netSavings = inflows - livingExpenses - eventsExpense - stampDuty;
    let spendingCutPct = 0;
    if (!working && prep.guardrails && netSavings < 0 && prep.cutPct > 0) {
      const startAccessible = cashStart + portfolioStart - latentTax(V, basis, taxRates);
      const withdrawalRatePct = startAccessible > 0 ? (-netSavings / startAccessible) * 100 : Infinity;
      if (withdrawalRatePct > prep.swrPct * SIM_MODEL.guardrailTriggerMultiple) {
        spendingCutPct = prep.cutPct;
        const cut = (livingExpenses * prep.cutPct) / 100;
        livingExpenses -= cut;
        netSavings += cut;
      }
    }
    const efTarget = (prep.efMonths * livingExpenses) / 12;

    for (let i = 0; i < n; i++) {
      const G = Math.max(0, (1 + path.assetReturns[t][i]) * (1 - prep.ter[i]));
      growth[i] = G;
      mid[i] = V[i] * Math.sqrt(G);
    }
    buys.fill(0);
    sells.fill(0);
    let toPortfolio = 0;
    let withdrawalGross = 0;
    let withdrawalTax = 0;
    let shortfall = 0;
    if (netSavings >= 0) {
      const fill = Math.min(netSavings, Math.max(0, efTarget - cash));
      cash += fill;
      toPortfolio = netSavings - fill;
      allocateBuys(mid, weights, toPortfolio, mode, buys);
    } else {
      let need = -netSavings;
      const fromExcess = Math.min(need, Math.max(0, cash - efTarget));
      cash -= fromExcess;
      need -= fromExcess;
      if (need > 0) {
        for (let i = 0; i < n; i++) gainTax[i] = mid[i] > 0 ? Math.max(0, 1 - basis[i] / mid[i]) * taxRates[i] : 0;
        const sale = sellForNet(mid, gainTax, weights, need, mode, sells);
        withdrawalGross = sale.gross;
        withdrawalTax = sale.tax;
        need -= sale.gross - sale.tax;
        if (need < 0) {
          cash -= need; // rounding surplus of the gross-up stays in cash
          need = 0;
        }
      }
      if (need > 0) {
        const fromCash = Math.min(need, cash);
        cash -= fromCash;
        need -= fromCash;
      }
      if (need > 0) shortfall = need;
    }
    const toEmergencyFund = cash - cashStart;

    /* ── Portfolio growth (§5.7) ── */
    let portfolioReturn = 0;
    let portfolioCosts = 0;
    for (let i = 0; i < n; i++) {
      const r = path.assetReturns[t][i];
      const G = growth[i];
      const flow = buys[i] - sells[i];
      if (sells[i] > 0 && mid[i] > 0) basis[i] -= (basis[i] * Math.min(1, sells[i] / mid[i]));
      basis[i] += buys[i];
      const end = V[i] * G + flow * Math.sqrt(G);
      const grossEnd = V[i] * (1 + r) + flow * Math.sqrt(Math.max(0, 1 + r));
      portfolioReturn += grossEnd - V[i] - flow;
      portfolioCosts += grossEnd - end;
      V[i] = end > 0 ? end : 0;
      if (V[i] === 0 && basis[i] < 1e-9) basis[i] = 0;
    }
    const rebalancingTax = mode === 'annual' ? rebalanceAnnual(V, basis, taxRates, weights) : 0;

    if (shortfall > SIM_MODEL.shortfallThreshold && depletionAge === null) {
      depletionAge = age;
      if (opts.stopOnShortfall) break;
    }

    if (!record && !rows) continue;

    /* ── Balances & derived values ── */
    let portfolioValue = 0;
    let portfolioCostBasis = 0;
    for (let i = 0; i < n; i++) {
      portfolioValue += V[i];
      portfolioCostBasis += basis[i];
    }
    const portfolioLatentTax = latentTax(V, basis, taxRates);
    const pensionFundNet =
      pf > 0
        ? pf - Math.min(pfBasis, pf) * (exitTaxRatePct(Math.max(0, year + 1 - prep.pfMembershipStartYear), rules) / 100)
        : 0;
    const companyTfrNet = tfrPaid
      ? 0
      : companyTfr -
        Math.min(companyTfr, (tfrPrincipal * tfrSeparateTaxRatePct(tfrPrincipal, tfrYears, rules, irpefIndexFactor(rules, Pnext))) / 100);
    const accessibleNet = cash + portfolioValue - portfolioLatentTax;
    const lockedNet = pensionFundNet + companyTfrNet;
    const netWorth = accessibleNet + lockedNet;

    if (record) {
      record.netWorth[record.offset + t] = netWorth / Pnext;
      record.accessible[record.offset + t] = accessibleNet / Pnext;
    }
    if (!rows) continue;

    if (w) {
      if (netSavings < -0.005 && !signals.negativeSavingsWhileWorking) signals.negativeSavingsWhileWorking = { age };
      if (w.bonusAboveCap && !signals.bonusAboveCap) signals.bonusAboveCap = { age, phaseIndex: w.phaseIndex, cap: w.bonusCap };
      if (w.bonusIneligible && !signals.bonusIneligibleIncome) signals.bonusIneligibleIncome = { age, phaseIndex: w.phaseIndex };
      if (w.contributionAboveCap && !signals.contributionAboveCap) signals.contributionAboveCap = { age, phaseIndex: w.phaseIndex };
    }

    const payroll = w ? w.payroll : null;
    rows.push({
      t,
      age,
      calendarYear: year,
      status: working ? 'working' : 'retired',
      priceIndex: P,
      priceIndexEnd: Pnext,
      inflationPct: pi * 100,
      ral: w ? w.ral : 0,
      bonusGross: w ? w.bonusGross : 0,
      payroll,
      welfareBenefit: welfare,
      statePensionNet,
      statePensionGross,
      statePensionTax,
      pensionAnnuityNet,
      cashInterestNet,
      eventsInflow,
      livingExpenses,
      eventsExpense,
      stampDuty,
      netSavings,
      savingsRatePct: payroll && payroll.netIncome > 0 ? (netSavings / payroll.netIncome) * 100 : null,
      toEmergencyFund,
      toPortfolio,
      withdrawalGross,
      withdrawalTax,
      rebalancingTax,
      shortfall,
      spendingCutPct,
      pfEmployee,
      pfEmployer,
      pfTfr,
      pfBonus,
      pfReturn,
      pfCosts,
      pfYieldTax,
      pfLumpSumNet,
      pfExitTax,
      tfrAccrued: w ? w.tfrQuota : 0,
      tfrToFund: pfTfr,
      tfrToCompany: w ? w.tfrToCompany : 0,
      tfrRevaluationNet,
      tfrRevaluationTax,
      tfrPayoutNet,
      tfrPayoutTax,
      portfolioReturn,
      portfolioCosts,
      realizedGainsTax: withdrawalTax + rebalancingTax,
      cash,
      portfolioValue,
      portfolioCostBasis,
      portfolioByAsset: Array.from(V),
      pensionFund: pf,
      pensionFundTaxableBasis: pfBasis,
      companyTfr,
      inpsMontante: montante,
      portfolioLatentTax,
      pensionFundNet,
      companyTfrNet,
      accessibleNet,
      lockedNet,
      netWorth,
      fireTarget: (prep.monthlyToday * 12 * prep.retirementFactor * P) / (prep.swrPct / 100),
    });
  }

  return {
    rows,
    success: depletionAge === null,
    depletionAge,
    retirementAge: R,
    statePensionClaimAge: claimAge,
    statePensionNetAtClaim: spNetAtClaim,
    statePensionNetAtClaimToday: spNetAtClaimToday,
    pensionFundAccessAge: accessAge,
    signals,
  };
}

/** Convenience wrapper: simulate(plan, { retirementAge, path, detail }) (SPEC §4). */
export function simulate(plan: Plan, opts: SimulateOptions): SimulationResult {
  return simulatePrepared(preparePlan(plan), opts);
}
