import type { Issue, IssueLevel } from './types';
import { IT_2026 } from './rules/it2026';

/**
 * Plan validation (docs/SPEC.md §5.11). validatePlan never throws and never changes the plan: it accepts anything
 * (partial objects, NaN, strings, null) and reports Issues with the exact path of the offending field, e.g.
 * 'career[1].untilAge', 'portfolio.assets[0].allocationPct', 'portfolio.assets' (allocation sum),
 * 'assets.holdings[2].assetId', 'taxRules.irpef.brackets[1].upTo'.
 *
 * Errors block the computation (run* throw PlanValidationError); warnings and infos are shown but the plan runs.
 * Post-run issues (which depend on the simulation) are added by runPlan, see fire.ts.
 */

/**
 * Every issue code the engine can emit (validatePlan + runPlan post-run issues). The UI translates each one as
 * `issues.<code>`; params are listed next to each code.
 */
export const ISSUE_CODES = [
  // ── Errors: structure and types
  'invalidPlan', // the plan is not an object
  'missingField', // a required field/section is missing (undefined or null)
  'invalidType', // wrong type (e.g. a string where an object, a list or a yes/no is expected)
  'invalidNumber', // not a finite number (NaN, text, Infinity)
  'notInteger', // a whole number is required (ages, years, runs)
  'invalidOption', // value not among the allowed options {value}
  'negativeAmount', // amount < 0
  'pctRange', // percentage out of range {min, max}
  'valueRange', // number out of range {min, max}
  // ── Errors: SPEC §5.11
  'ageRange', // {min, max}
  'lifeExpectancyRange', // {min, max}
  'startYearRange', // {min, max}
  'careerEmpty',
  'careerFirstPhase', // first phase must end after the current age {min}
  'careerOrder', // phases must end at increasing ages {min}
  'mensilitaRange', // {min, max}
  'allocationSum', // allocations must sum to 100 {sum}
  'duplicateAssetId', // {id}
  'unknownHoldingAsset', // {assetId}
  'membershipYearRange', // {min, max}
  'fixedAgeRange', // {min, max}
  'eventAgeRange', // {min, max}
  'eventYears', // {min}
  'pfAccessTooEarly', // {min, mode}
  'swrRange', // {min, max}
  'runsRange', // {min, max}
  'bandOrder', // tax bands must have increasing upper bounds, only the last one unbounded
  'coefficientsEmpty', // no valid transformation coefficient
  // ── Warnings
  'tfrBackToCompany', // a later phase sends less TFR to the fund than an earlier one {previousPct}
  'returnVeryHigh', // expected return > 8% {max}
  'realReturnNonPositive', // portfolio real return (after TER) <= 0 {realReturnPct}
  'capitalShareAboveLegal', // {max}
  'ritaRequiresUnemployment', // RITA more than 5 years early needs > 24 months of unemployment {min, minUnemployed}
  'claimBeforeOldAge', // {oldAgeAge, mode}
  'singleAssetConcentration', // one equity asset > 80% {max}
  'negativeSavingsWhileWorking', // post-run {age}
  // post-run: accessible money runs out while still working (life events included), so no later retirement age can
  // succeed {age, amount (today's €, rounded), event (label of the largest expense event of that year, when any)}
  'shortfallWhileWorking',
  'bonusAboveCap', // post-run {age, cap}
  'bonusIneligibleIncome', // post-run {age, limit}
  'contributionAboveCap', // post-run {age, cap}
  'noStatePension', // post-run {minYears, oldAgeMinYears}
  'pfShortMembership', // post-run {years, min}
  'pfAccessAfterHorizon', // post-run: the fund is never paid within the horizon {age}
  // ── Infos
  'montanteEstimated', // montante contributivo unknown: estimated from contribution years and RAL
  'bonusToFundDisabled', // bonus regime 'pensionFund' with the fund disabled: treated as productivity bonus
  'tfrPartialCheckContract', // 0 < tfrToFundPct < 100
  'redemptionFallbackRita', // post-run {age, redemptionAge}
  'pfOrdinaryBenefit', // post-run: RITA/redemption impossible after the old-age age → ordinary benefit {age}
  'ritaDelayedToRetirement', // post-run: RITA starts when work stops, after accessAge {age}
  'statePensionAfterHorizon', // post-run: state pension claimed after lifeExpectancy {age}
] as const;

export type IssueCode = (typeof ISSUE_CODES)[number];

/** Sanity bounds of the inputs (modelling limits, not legal parameters: those live in TaxRules). */
export const VALIDATION_LIMITS = {
  currentAge: { min: 15, max: 100 },
  lifeExpectancyMax: 120,
  startYear: { min: 1950, max: 2200 },
  membershipStartYearMin: 1950,
  realRaisePct: { min: -20, max: 30 },
  mensilita: { min: 12, max: 14 },
  retirementPct: { min: 0, max: 300 },
  emergencyFundMonths: { min: 0, max: 120 },
  returnPct: { min: -50, max: 50 },
  volatilityPct: { min: 0, max: 100 },
  costPct: { min: 0, max: 10 },
  correlation: { min: -1, max: 1 },
  claimAge: { min: 50, max: 80 },
  realGdpGrowthPct: { min: -5, max: 10 },
  swrPct: { min: 0.1, max: 20 },
  inflationPct: { min: -5, max: 30 },
  inflationVolatilityPct: { min: 0, max: 20 },
  cashRatePct: { min: 0, max: 30 },
  monteCarloRuns: { min: 100, max: 10000 },
  successTargetPct: { min: 1, max: 100 },
  /** Warnings */
  returnVeryHighPct: 8,
  singleAssetConcentrationPct: 80,
  allocationTolerance: 0.01,
} as const;

const BONUS_REGIMES = ['productivity', 'ordinary', 'pensionFund', 'welfare'] as const;
const ASSET_KINDS = ['equity', 'bond', 'cash', 'other'] as const;
const RETIREMENT_MODES = ['auto', 'fixedAge'] as const;
const VOLUNTARY_MODES = ['none', 'fillCap', 'fixed'] as const;
const REBALANCING_MODES = ['flows', 'annual'] as const;
const ACCESS_MODES = ['retirement', 'rita', 'redemption'] as const;
const SP_MODES = ['estimate', 'contributivo'] as const;
const WITHDRAWAL_STRATEGIES = ['constantReal', 'guardrails'] as const;

type Obj = Record<string, unknown>;

function isObj(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

interface NumOpts {
  integer?: boolean;
  /** Report 'negativeAmount' when < 0. */
  nonNegative?: boolean;
  /** Range check with the given code and params {min, max}. */
  range?: { min: number; max: number; code: IssueCode };
  /** Accept null (returns undefined without an issue). */
  nullable?: boolean;
}

/** Issue collector with typed readers that never throw. */
class Checker {
  readonly issues: Issue[] = [];

  add(level: IssueLevel, path: string, code: IssueCode, params?: Record<string, string | number>): void {
    this.issues.push(params ? { level, path, code, params } : { level, path, code });
  }

  error(path: string, code: IssueCode, params?: Record<string, string | number>): void {
    this.add('error', path, code, params);
  }

  /** Object field; reports missingField / invalidType. */
  obj(parent: Obj | undefined, key: string, path: string): Obj | undefined {
    if (!parent) return undefined;
    const v = parent[key];
    if (isObj(v)) return v;
    this.error(path, v === undefined || v === null ? 'missingField' : 'invalidType');
    return undefined;
  }

  /** Array field; reports missingField / invalidType. */
  arr(parent: Obj | undefined, key: string, path: string): unknown[] | undefined {
    if (!parent) return undefined;
    const v = parent[key];
    if (Array.isArray(v)) return v;
    this.error(path, v === undefined || v === null ? 'missingField' : 'invalidType');
    return undefined;
  }

  /**
   * Finite number field. Returns the number when it is finite (even if out of range, so that dependent checks can
   * still run), undefined otherwise. Reports missingField / invalidNumber / notInteger / negativeAmount / range.
   */
  num(parent: Obj | undefined, key: string, path: string, opts: NumOpts = {}): number | undefined {
    if (!parent) return undefined;
    const v = parent[key];
    if (v === undefined || (v === null && !opts.nullable)) {
      this.error(path, 'missingField');
      return undefined;
    }
    if (v === null) return undefined;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      this.error(path, 'invalidNumber');
      return undefined;
    }
    if (opts.integer && !Number.isInteger(v)) this.error(path, 'notInteger');
    else if (opts.nonNegative && v < 0) this.error(path, 'negativeAmount');
    else if (opts.range && (v < opts.range.min || v > opts.range.max)) {
      this.error(path, opts.range.code, { min: opts.range.min, max: opts.range.max });
    }
    return v;
  }

  /** Percentage field in [min, max] ('pctRange'). */
  pct(parent: Obj | undefined, key: string, path: string, min: number, max: number): number | undefined {
    return this.num(parent, key, path, { range: { min, max, code: 'pctRange' } });
  }

  /** Non-negative amount ('negativeAmount'). */
  amount(parent: Obj | undefined, key: string, path: string): number | undefined {
    return this.num(parent, key, path, { nonNegative: true });
  }

  /** Enumerated string field ('invalidOption'). */
  option<T extends string>(parent: Obj | undefined, key: string, path: string, allowed: readonly T[]): T | undefined {
    if (!parent) return undefined;
    const v = parent[key];
    if (v === undefined || v === null) {
      this.error(path, 'missingField');
      return undefined;
    }
    if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
    this.error(path, 'invalidOption', { value: typeof v === 'string' ? v : String(v) });
    return undefined;
  }

  /** Boolean field ('invalidType'). */
  bool(parent: Obj | undefined, key: string, path: string): boolean | undefined {
    if (!parent) return undefined;
    const v = parent[key];
    if (typeof v === 'boolean') return v;
    this.error(path, v === undefined || v === null ? 'missingField' : 'invalidType');
    return undefined;
  }
}

/* ───────────────────────────── Sections ───────────────────────────── */

interface Context {
  currentAge?: number;
  lifeExpectancy?: number;
  startYear?: number;
  oldAgeAge?: number;
  pfEnabled?: boolean;
  spMode?: (typeof SP_MODES)[number];
  inflationPct?: number;
  assetIds: Set<string>;
}

function checkProfile(c: Checker, plan: Obj, ctx: Context): void {
  const p = c.obj(plan, 'profile', 'profile');
  const L = VALIDATION_LIMITS;
  ctx.currentAge = c.num(p, 'currentAge', 'profile.currentAge', {
    integer: true,
    range: { ...L.currentAge, code: 'ageRange' },
  });
  const okAge = ctx.currentAge !== undefined && Number.isInteger(ctx.currentAge) && ctx.currentAge >= L.currentAge.min && ctx.currentAge <= L.currentAge.max;
  if (!okAge) ctx.currentAge = undefined;
  const le = c.num(p, 'lifeExpectancy', 'profile.lifeExpectancy', { integer: true });
  if (le !== undefined && Number.isInteger(le)) {
    const min = (ctx.currentAge ?? L.currentAge.min) + 1;
    if (le < min || le > L.lifeExpectancyMax) c.error('profile.lifeExpectancy', 'lifeExpectancyRange', { min, max: L.lifeExpectancyMax });
    else ctx.lifeExpectancy = le;
  }
  const sy = c.num(p, 'startYear', 'profile.startYear', { integer: true, range: { ...L.startYear, code: 'startYearRange' } });
  if (sy !== undefined && Number.isInteger(sy) && sy >= L.startYear.min && sy <= L.startYear.max) ctx.startYear = sy;
}

function checkCareer(c: Checker, plan: Obj, ctx: Context): void {
  const career = c.arr(plan, 'career', 'career');
  if (!career) return;
  if (career.length === 0) {
    c.error('career', 'careerEmpty');
    return;
  }
  const L = VALIDATION_LIMITS;
  let previousUntil: number | undefined = ctx.currentAge;
  let maxTfrToFund = 0;
  career.forEach((raw, i) => {
    const base = `career[${i}]`;
    if (!isObj(raw)) {
      c.error(base, raw === undefined || raw === null ? 'missingField' : 'invalidType');
      previousUntil = undefined;
      return;
    }
    const until = c.num(raw, 'untilAge', `${base}.untilAge`, { integer: true });
    if (until !== undefined && Number.isInteger(until) && previousUntil !== undefined && until <= previousUntil) {
      c.error(`${base}.untilAge`, i === 0 ? 'careerFirstPhase' : 'careerOrder', { min: previousUntil + 1 });
    }
    previousUntil = until !== undefined && Number.isInteger(until) ? until : undefined;
    c.amount(raw, 'ralToday', `${base}.ralToday`);
    c.pct(raw, 'realRaisePct', `${base}.realRaisePct`, L.realRaisePct.min, L.realRaisePct.max);
    c.num(raw, 'mensilita', `${base}.mensilita`, { integer: true, range: { ...L.mensilita, code: 'mensilitaRange' } });
    c.amount(raw, 'bonusGrossToday', `${base}.bonusGrossToday`);
    const regime = c.option(raw, 'bonusRegime', `${base}.bonusRegime`, BONUS_REGIMES);
    if (regime === 'pensionFund' && ctx.pfEnabled === false) c.add('info', `${base}.bonusRegime`, 'bonusToFundDisabled');
    c.pct(raw, 'employeePensionPct', `${base}.employeePensionPct`, 0, 100);
    c.pct(raw, 'employerPensionPct', `${base}.employerPensionPct`, 0, 100);
    const tfr = c.pct(raw, 'tfrToFundPct', `${base}.tfrToFundPct`, 0, 100);
    if (tfr !== undefined && tfr >= 0 && tfr <= 100) {
      if (tfr > 0 && tfr < 100) c.add('info', `${base}.tfrToFundPct`, 'tfrPartialCheckContract');
      if (ctx.pfEnabled !== false && tfr < maxTfrToFund) {
        c.add('warning', `${base}.tfrToFundPct`, 'tfrBackToCompany', { previousPct: maxTfrToFund });
      }
      maxTfrToFund = Math.max(maxTfrToFund, tfr);
    }
  });
}

function checkRetirement(c: Checker, plan: Obj, ctx: Context): void {
  const r = c.obj(plan, 'retirement', 'retirement');
  const mode = c.option(r, 'mode', 'retirement.mode', RETIREMENT_MODES);
  const fixedAge = c.num(r, 'fixedAge', 'retirement.fixedAge', { integer: true });
  if (mode === 'fixedAge' && fixedAge !== undefined && Number.isInteger(fixedAge) && ctx.currentAge !== undefined && ctx.lifeExpectancy !== undefined) {
    if (fixedAge < ctx.currentAge || fixedAge > ctx.lifeExpectancy) {
      c.error('retirement.fixedAge', 'fixedAgeRange', { min: ctx.currentAge, max: ctx.lifeExpectancy });
    }
  }
}

function checkSpending(c: Checker, plan: Obj, ctx: Context): void {
  const s = c.obj(plan, 'spending', 'spending');
  const L = VALIDATION_LIMITS;
  c.amount(s, 'monthlyToday', 'spending.monthlyToday');
  c.pct(s, 'retirementPct', 'spending.retirementPct', L.retirementPct.min, L.retirementPct.max);
  const events = c.arr(s, 'events', 'spending.events');
  events?.forEach((raw, i) => {
    const base = `spending.events[${i}]`;
    if (!isObj(raw)) {
      c.error(base, raw === undefined || raw === null ? 'missingField' : 'invalidType');
      return;
    }
    const age = c.num(raw, 'age', `${base}.age`, { integer: true });
    if (age !== undefined && Number.isInteger(age) && ctx.currentAge !== undefined && ctx.lifeExpectancy !== undefined) {
      if (age < ctx.currentAge || age > ctx.lifeExpectancy) c.error(`${base}.age`, 'eventAgeRange', { min: ctx.currentAge, max: ctx.lifeExpectancy });
    }
    const years = c.num(raw, 'years', `${base}.years`, { integer: true });
    if (years !== undefined && Number.isInteger(years) && years < 1) c.error(`${base}.years`, 'eventYears', { min: 1 });
    c.num(raw, 'amountToday', `${base}.amountToday`);
  });
}

function checkSavingsPolicy(c: Checker, plan: Obj): void {
  const s = c.obj(plan, 'savingsPolicy', 'savingsPolicy');
  const L = VALIDATION_LIMITS;
  c.num(s, 'emergencyFundMonths', 'savingsPolicy.emergencyFundMonths', { range: { ...L.emergencyFundMonths, code: 'valueRange' } });
  c.option(s, 'voluntaryPension', 'savingsPolicy.voluntaryPension', VOLUNTARY_MODES);
  c.amount(s, 'voluntaryPensionFixedToday', 'savingsPolicy.voluntaryPensionFixedToday');
}

function checkPortfolio(c: Checker, plan: Obj, ctx: Context): void {
  const p = c.obj(plan, 'portfolio', 'portfolio');
  const L = VALIDATION_LIMITS;
  const assets = c.arr(p, 'assets', 'portfolio.assets');
  if (assets) {
    let sum = 0;
    let sumValid = true;
    let realReturn = 0;
    assets.forEach((raw, i) => {
      const base = `portfolio.assets[${i}]`;
      if (!isObj(raw)) {
        c.error(base, raw === undefined || raw === null ? 'missingField' : 'invalidType');
        sumValid = false;
        return;
      }
      const id = raw.id;
      if (typeof id !== 'string' || id === '') {
        c.error(`${base}.id`, id === undefined || id === null || id === '' ? 'missingField' : 'invalidType');
      } else if (ctx.assetIds.has(id)) {
        c.error(`${base}.id`, 'duplicateAssetId', { id });
      } else {
        ctx.assetIds.add(id);
      }
      const kind = c.option(raw, 'kind', `${base}.kind`, ASSET_KINDS);
      const alloc = c.pct(raw, 'allocationPct', `${base}.allocationPct`, 0, 100);
      const ret = c.pct(raw, 'expectedReturnPct', `${base}.expectedReturnPct`, L.returnPct.min, L.returnPct.max);
      c.pct(raw, 'volatilityPct', `${base}.volatilityPct`, L.volatilityPct.min, L.volatilityPct.max);
      const ter = c.pct(raw, 'terPct', `${base}.terPct`, L.costPct.min, L.costPct.max);
      c.pct(raw, 'taxRatePct', `${base}.taxRatePct`, 0, 100);
      if (alloc === undefined) sumValid = false;
      else sum += alloc;
      if (alloc !== undefined && ret !== undefined && ter !== undefined) realReturn += (alloc / 100) * (ret - ter);
      if (ret !== undefined && ret > L.returnVeryHighPct && ret <= L.returnPct.max) {
        c.add('warning', `${base}.expectedReturnPct`, 'returnVeryHigh', { max: L.returnVeryHighPct });
      }
      if (kind === 'equity' && alloc !== undefined && alloc > L.singleAssetConcentrationPct && alloc <= 100) {
        c.add('warning', `${base}.allocationPct`, 'singleAssetConcentration', { max: L.singleAssetConcentrationPct });
      }
    });
    if (sumValid && Math.abs(sum - 100) > L.allocationTolerance) {
      c.error('portfolio.assets', 'allocationSum', { sum: Math.round(sum * 100) / 100 });
    } else if (sumValid && ctx.inflationPct !== undefined && realReturn - ctx.inflationPct <= 0) {
      c.add('warning', 'portfolio.assets', 'realReturnNonPositive', { realReturnPct: Math.round((realReturn - ctx.inflationPct) * 100) / 100 });
    }
  }
  c.num(p, 'equityBondCorrelation', 'portfolio.equityBondCorrelation', { range: { ...L.correlation, code: 'valueRange' } });
  c.option(p, 'rebalancing', 'portfolio.rebalancing', REBALANCING_MODES);
}

function checkAssets(c: Checker, plan: Obj, ctx: Context): void {
  const a = c.obj(plan, 'assets', 'assets');
  c.amount(a, 'cash', 'assets.cash');
  const holdings = c.arr(a, 'holdings', 'assets.holdings');
  holdings?.forEach((raw, i) => {
    const base = `assets.holdings[${i}]`;
    if (!isObj(raw)) {
      c.error(base, raw === undefined || raw === null ? 'missingField' : 'invalidType');
      return;
    }
    const id = raw.assetId;
    if (typeof id !== 'string' || !ctx.assetIds.has(id)) {
      c.error(`${base}.assetId`, 'unknownHoldingAsset', { assetId: typeof id === 'string' ? id : String(id) });
    }
    c.amount(raw, 'value', `${base}.value`);
    c.amount(raw, 'costBasis', `${base}.costBasis`);
  });
  const pf = c.obj(a, 'pensionFund', 'assets.pensionFund');
  c.amount(pf, 'balance', 'assets.pensionFund.balance');
  c.amount(pf, 'taxableBasis', 'assets.pensionFund.taxableBasis');
  const ms = c.num(pf, 'membershipStartYear', 'assets.pensionFund.membershipStartYear', { integer: true });
  if (ms !== undefined && Number.isInteger(ms) && ctx.startYear !== undefined) {
    const min = VALIDATION_LIMITS.membershipStartYearMin;
    if (ms < min || ms > ctx.startYear) c.error('assets.pensionFund.membershipStartYear', 'membershipYearRange', { min, max: ctx.startYear });
  }
  c.amount(a, 'companyTfr', 'assets.companyTfr');
  c.amount(a, 'companyTfrYears', 'assets.companyTfrYears');
  const inps = c.obj(a, 'inps', 'assets.inps');
  c.amount(inps, 'contributionYears', 'assets.inps.contributionYears');
  const montante = c.amount(inps, 'montante', 'assets.inps.montante');
  if (ctx.spMode === 'contributivo' && montante === 0) c.add('info', 'assets.inps.montante', 'montanteEstimated');
}

function checkPensionFund(c: Checker, plan: Obj, ctx: Context): void {
  const pf = c.obj(plan, 'pensionFund', 'pensionFund');
  const L = VALIDATION_LIMITS;
  const rules = isObj(plan.taxRules) && isObj(plan.taxRules.pensionFund) ? plan.taxRules.pensionFund : undefined;
  const ret = c.pct(pf, 'expectedReturnPct', 'pensionFund.expectedReturnPct', L.returnPct.min, L.returnPct.max);
  if (ret !== undefined && ret > L.returnVeryHighPct && ret <= L.returnPct.max) {
    c.add('warning', 'pensionFund.expectedReturnPct', 'returnVeryHigh', { max: L.returnVeryHighPct });
  }
  c.pct(pf, 'volatilityPct', 'pensionFund.volatilityPct', L.volatilityPct.min, L.volatilityPct.max);
  c.pct(pf, 'costPct', 'pensionFund.costPct', L.costPct.min, L.costPct.max);
  c.pct(pf, 'govBondSharePct', 'pensionFund.govBondSharePct', 0, 100);
  c.num(pf, 'equityCorrelation', 'pensionFund.equityCorrelation', { range: { ...L.correlation, code: 'valueRange' } });
  const accessAge = c.num(pf, 'accessAge', 'pensionFund.accessAge', { integer: true });
  const mode = c.option(pf, 'accessMode', 'pensionFund.accessMode', ACCESS_MODES);
  const capital = c.pct(pf, 'capitalSharePct', 'pensionFund.capitalSharePct', 0, 100);
  c.pct(pf, 'annuityRatePct', 'pensionFund.annuityRatePct', 0, 100);

  const balance = isObj(plan.assets) && isObj(plan.assets.pensionFund) ? plan.assets.pensionFund.balance : undefined;
  const matters = ctx.pfEnabled === true || (typeof balance === 'number' && balance > 0);
  if (!matters || mode === undefined) return;
  const oldAge = ctx.oldAgeAge;
  const ritaEarly = rules && typeof rules.ritaMaxYearsEarly === 'number' && Number.isFinite(rules.ritaMaxYearsEarly) ? rules.ritaMaxYearsEarly : undefined;
  const ritaUnemployed =
    rules && typeof rules.ritaMaxYearsEarlyUnemployed === 'number' && Number.isFinite(rules.ritaMaxYearsEarlyUnemployed)
      ? rules.ritaMaxYearsEarlyUnemployed
      : ritaEarly !== undefined
        ? 2 * ritaEarly
        : undefined;
  if (accessAge !== undefined && Number.isInteger(accessAge) && oldAge !== undefined) {
    if (mode === 'retirement' && accessAge < oldAge) {
      c.error('pensionFund.accessAge', 'pfAccessTooEarly', { min: oldAge, mode });
    } else if (mode === 'rita' && ritaUnemployed !== undefined && accessAge < oldAge - ritaUnemployed) {
      c.error('pensionFund.accessAge', 'pfAccessTooEarly', { min: oldAge - ritaUnemployed, mode });
    } else if (mode === 'rita' && ritaEarly !== undefined && ritaUnemployed !== undefined && accessAge < oldAge - ritaEarly) {
      c.add('warning', 'pensionFund.accessAge', 'ritaRequiresUnemployment', { min: oldAge - ritaEarly, minUnemployed: oldAge - ritaUnemployed });
    }
  }
  const maxCapital = rules && typeof rules.maxCapitalSharePct === 'number' ? rules.maxCapitalSharePct : undefined;
  if (mode !== 'redemption' && capital !== undefined && maxCapital !== undefined && capital > maxCapital && capital <= 100) {
    c.add('warning', 'pensionFund.capitalSharePct', 'capitalShareAboveLegal', { max: maxCapital });
  }
}

function checkStatePension(c: Checker, plan: Obj, ctx: Context): void {
  const sp = c.obj(plan, 'statePension', 'statePension');
  const L = VALIDATION_LIMITS;
  const mode = ctx.spMode;
  c.amount(sp, 'monthlyNetToday', 'statePension.monthlyNetToday');
  const claim = c.num(sp, 'claimAge', 'statePension.claimAge', { integer: true, range: { ...L.claimAge, code: 'ageRange' } });
  if (claim !== undefined && Number.isInteger(claim) && ctx.oldAgeAge !== undefined && claim < ctx.oldAgeAge && claim >= L.claimAge.min && mode) {
    c.add('warning', 'statePension.claimAge', 'claimBeforeOldAge', { oldAgeAge: ctx.oldAgeAge, mode });
  }
  c.pct(sp, 'realGdpGrowthPct', 'statePension.realGdpGrowthPct', L.realGdpGrowthPct.min, L.realGdpGrowthPct.max);
  c.pct(sp, 'indexationPct', 'statePension.indexationPct', 0, 100);
}

function checkWithdrawal(c: Checker, plan: Obj): void {
  const w = c.obj(plan, 'withdrawal', 'withdrawal');
  c.num(w, 'swrPct', 'withdrawal.swrPct', { range: { ...VALIDATION_LIMITS.swrPct, code: 'swrRange' } });
  c.option(w, 'strategy', 'withdrawal.strategy', WITHDRAWAL_STRATEGIES);
  c.pct(w, 'guardrailCutPct', 'withdrawal.guardrailCutPct', 0, 100);
}

function checkMarket(c: Checker, plan: Obj, ctx: Context): void {
  const m = c.obj(plan, 'market', 'market');
  const L = VALIDATION_LIMITS;
  const infl = c.pct(m, 'inflationPct', 'market.inflationPct', L.inflationPct.min, L.inflationPct.max);
  if (infl !== undefined && infl >= L.inflationPct.min && infl <= L.inflationPct.max) ctx.inflationPct = infl;
  c.pct(m, 'inflationVolatilityPct', 'market.inflationVolatilityPct', L.inflationVolatilityPct.min, L.inflationVolatilityPct.max);
  c.pct(m, 'cashRatePct', 'market.cashRatePct', L.cashRatePct.min, L.cashRatePct.max);
}

function checkSimulation(c: Checker, plan: Obj): void {
  const s = c.obj(plan, 'simulation', 'simulation');
  const L = VALIDATION_LIMITS;
  c.num(s, 'monteCarloRuns', 'simulation.monteCarloRuns', { integer: true, range: { ...L.monteCarloRuns, code: 'runsRange' } });
  c.num(s, 'seed', 'simulation.seed');
  c.pct(s, 'successTargetPct', 'simulation.successTargetPct', L.successTargetPct.min, L.successTargetPct.max);
}

/* ───────────────────────────── Tax rules ───────────────────────────── */

/** Optional TaxRules fields (absent = not modelled / default). */
const OPTIONAL_RULES = new Set(['taxRules.irpef.supplementaryTreatment', 'taxRules.pensionFund.ritaMaxYearsEarlyUnemployed']);
/** TaxRules numbers that may be null. */
const NULLABLE_RULES = new Set(['taxRules.productivityBonus.validUntilYear']);
/** TaxRules numbers that must be whole numbers (ages, years). */
const INTEGER_RULES = new Set([
  'taxRules.referenceYear',
  'taxRules.statePension.oldAgeAge',
  'taxRules.statePension.fallbackAge',
  'taxRules.productivityBonus.validUntilYear',
]);

function checkBands(c: Checker, value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    c.error(path, value === undefined || value === null ? 'missingField' : 'invalidType');
    return;
  }
  if (value.length === 0) {
    c.error(path, 'missingField');
    return;
  }
  let previous = 0;
  value.forEach((band, i) => {
    const base = `${path}[${i}]`;
    if (!isObj(band)) {
      c.error(base, band === undefined || band === null ? 'missingField' : 'invalidType');
      return;
    }
    const upTo = c.num(band, 'upTo', `${base}.upTo`, { nullable: true, nonNegative: true });
    c.pct(band, 'ratePct', `${base}.ratePct`, 0, 100);
    if (band.upTo === null && i < value.length - 1) c.error(`${base}.upTo`, 'bandOrder');
    if (upTo !== undefined) {
      if (upTo <= previous && i > 0) c.error(`${base}.upTo`, 'bandOrder');
      previous = Math.max(previous, upTo);
    }
  });
}

function checkCoefficients(c: Checker, value: unknown, path: string): void {
  if (!isObj(value)) {
    c.error(path, value === undefined || value === null ? 'missingField' : 'invalidType');
    return;
  }
  let valid = 0;
  for (const [age, coeff] of Object.entries(value)) {
    const p = `${path}[${age}]`;
    if (!/^\d+$/.test(age)) {
      c.error(p, 'invalidOption', { value: age });
    } else if (typeof coeff !== 'number' || !Number.isFinite(coeff)) {
      c.error(p, 'invalidNumber');
    } else if (coeff <= 0 || coeff > 100) {
      c.error(p, 'pctRange', { min: 0, max: 100 });
    } else {
      valid++;
    }
  }
  if (valid === 0) c.error(path, 'coefficientsEmpty');
}

/** Walks the plan's TaxRules against the shape of IT_2026 (numbers finite and >= 0, *Pct <= 100, bands ordered). */
function checkRulesNode(c: Checker, template: unknown, value: unknown, path: string, key: string): void {
  if (key === 'sources' || key === 'id' || key === 'label') return;
  if (key === 'transformationCoefficients') return checkCoefficients(c, value, path);
  if (Array.isArray(template)) return checkBands(c, value, path);
  if (value === undefined && OPTIONAL_RULES.has(path)) return;
  if (isObj(template)) {
    if (!isObj(value)) {
      c.error(path, value === undefined || value === null ? 'missingField' : 'invalidType');
      return;
    }
    for (const k of Object.keys(template)) checkRulesNode(c, template[k], value[k], `${path}.${k}`, k);
    return;
  }
  if (typeof template === 'boolean') {
    if (typeof value !== 'boolean') c.error(path, value === undefined || value === null ? 'missingField' : 'invalidType');
    return;
  }
  if (typeof template === 'number' || NULLABLE_RULES.has(path)) {
    const holder: Obj = { v: value };
    const n = c.num(holder, 'v', path, { nullable: NULLABLE_RULES.has(path), integer: INTEGER_RULES.has(path), nonNegative: true });
    if (n !== undefined && n >= 0 && /Pct$/.test(key) && n > 100) c.error(path, 'pctRange', { min: 0, max: 100 });
  }
}

function checkTaxRules(c: Checker, plan: Obj, ctx: Context): void {
  const rules = c.obj(plan, 'taxRules', 'taxRules');
  if (!rules) return;
  checkRulesNode(c, IT_2026, rules, 'taxRules', 'taxRules');
  const sp = rules.statePension;
  if (isObj(sp) && typeof sp.oldAgeAge === 'number' && Number.isInteger(sp.oldAgeAge) && sp.oldAgeAge > 0) ctx.oldAgeAge = sp.oldAgeAge;
}

/* ───────────────────────────── Entry point ───────────────────────────── */

/**
 * Validates a plan (SPEC §5.11). Never throws, whatever the input; never mutates it. Returns every issue found,
 * errors first in field order, then warnings and infos.
 */
export function validatePlan(plan: unknown): Issue[] {
  const c = new Checker();
  try {
    if (!isObj(plan)) {
      c.error('', 'invalidPlan');
      return c.issues;
    }
    const ctx: Context = { assetIds: new Set<string>() };
    // Context needed by other sections first (tax rules → old-age age; flags read leniently).
    checkTaxRules(c, plan, ctx);
    const pf = plan.pensionFund;
    if (isObj(pf) && typeof pf.enabled === 'boolean') ctx.pfEnabled = pf.enabled;
    const sp = plan.statePension;
    if (isObj(sp) && typeof sp.mode === 'string' && (SP_MODES as readonly string[]).includes(sp.mode)) {
      ctx.spMode = sp.mode as (typeof SP_MODES)[number];
    }
    checkProfile(c, plan, ctx);
    checkMarket(c, plan, ctx);
    checkCareer(c, plan, ctx);
    checkRetirement(c, plan, ctx);
    checkSpending(c, plan, ctx);
    checkSavingsPolicy(c, plan);
    checkPortfolio(c, plan, ctx);
    checkAssets(c, plan, ctx);
    if (isObj(pf)) c.bool(plan.pensionFund as Obj, 'enabled', 'pensionFund.enabled');
    checkPensionFund(c, plan, ctx);
    if (isObj(sp)) c.option(sp, 'mode', 'statePension.mode', SP_MODES);
    checkStatePension(c, plan, ctx);
    checkWithdrawal(c, plan);
    checkSimulation(c, plan);
  } catch {
    // Defensive: a getter or proxy that throws must not crash the UI.
    c.error('', 'invalidPlan');
  }
  const order: Record<IssueLevel, number> = { error: 0, warning: 1, info: 2 };
  return c.issues.map((issue, i) => ({ issue, i })).sort((a, b) => order[a.issue.level] - order[b.issue.level] || a.i - b.i).map((x) => x.issue);
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
