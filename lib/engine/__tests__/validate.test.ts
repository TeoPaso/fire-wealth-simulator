import { describe, expect, it } from 'vitest';
import type { Issue, Plan } from '../types';
import { createExamplePlans } from '../defaults';
import { hasErrors, ISSUE_CODES, validatePlan } from '../validate';
import { runPlan } from '../fire';
import { basePlan } from './helpers';

const codes = new Set<string>(ISSUE_CODES);

function find(issues: Issue[], path: string, code?: string): Issue | undefined {
  return issues.find((i) => i.path === path && (code === undefined || i.code === code));
}

/** Every leaf path of a JSON value (objects and arrays), e.g. ['career', 1, 'untilAge']. */
function leafPaths(value: unknown, prefix: (string | number)[] = []): (string | number)[][] {
  if (Array.isArray(value)) return value.flatMap((v, i) => leafPaths(v, [...prefix, i])).concat(value.length === 0 ? [prefix] : []);
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    return entries.flatMap(([k, v]) => leafPaths(v, [...prefix, k])).concat(entries.length === 0 ? [prefix] : []);
  }
  return [prefix];
}

function setAt(root: unknown, path: (string | number)[], value: unknown): void {
  let node = root as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) node = node[path[i]] as Record<string | number, unknown>;
  node[path[path.length - 1]] = value;
}

describe('validatePlan — valid plans', () => {
  it('the example plans have no errors and no warnings except the expected infos', () => {
    for (const plan of createExamplePlans({ startYear: 2026 })) {
      const issues = validatePlan(plan);
      expect(hasErrors(issues)).toBe(false);
      expect(issues.map((i) => i.code)).toEqual(['montanteEstimated']);
    }
  });

  it('does not mutate the plan', () => {
    const plan = basePlan();
    plan.career[0].untilAge = 20;
    const before = JSON.stringify(plan);
    validatePlan(plan);
    expect(JSON.stringify(plan)).toBe(before);
  });
});

describe('validatePlan — never throws', () => {
  it('on garbage inputs', () => {
    const garbage: unknown[] = [
      null,
      undefined,
      42,
      'plan',
      [],
      {},
      { profile: 'x', career: {}, portfolio: [], assets: 3, taxRules: [] },
      { profile: { currentAge: '30' }, career: [null, 1, 'a', { untilAge: NaN }] },
      { portfolio: { assets: [null, { id: 3, allocationPct: Infinity }] }, assets: { holdings: [7, { assetId: {} }] } },
      { taxRules: { irpef: { brackets: [{ upTo: 'x' }, null] }, statePension: { transformationCoefficients: { x: 'y' } } } },
    ];
    for (const g of garbage) {
      let issues: Issue[] = [];
      expect(() => (issues = validatePlan(g))).not.toThrow();
      expect(hasErrors(issues)).toBe(true);
      for (const i of issues) expect(codes.has(i.code), i.code).toBe(true);
    }
    expect(validatePlan(null)).toEqual([{ level: 'error', path: '', code: 'invalidPlan' }]);
  });

  it('on every field of the plan replaced by garbage (fuzz), reporting only known codes', () => {
    const template = basePlan();
    const paths = leafPaths(template).filter((p) => p.length > 0);
    const values: unknown[] = [NaN, null, 'text', {}, [], -1, 1e12, undefined, true];
    let count = 0;
    for (const path of paths) {
      for (const value of values) {
        const plan = JSON.parse(JSON.stringify(template)) as Plan;
        setAt(plan, path, value);
        let issues: Issue[] = [];
        expect(() => (issues = validatePlan(plan)), path.join('.')).not.toThrow();
        for (const i of issues) expect(codes.has(i.code), `${i.code} @ ${path.join('.')}`).toBe(true);
        count++;
      }
    }
    expect(count).toBeGreaterThan(1000);
  });

  it('every fuzzed plan that passes validation runs without throwing and with finite results', () => {
    const template = basePlan();
    const paths = leafPaths(template).filter((p) => p.length > 0 && p[0] !== 'taxRules');
    let runs = 0;
    for (const path of paths) {
      for (const value of [0, -1, 1e7, 100, 0.5]) {
        const plan = JSON.parse(JSON.stringify(template)) as Plan;
        setAt(plan, path, value);
        if (hasErrors(validatePlan(plan))) continue;
        const result = runPlan(plan);
        runs++;
        for (const [k, v] of Object.entries(result.summary)) {
          if (typeof v === 'number') expect(Number.isFinite(v), `${k} @ ${path.join('.')}=${value}`).toBe(true);
        }
        const last = result.rows[result.rows.length - 1];
        expect(Number.isFinite(last.netWorth), `netWorth @ ${path.join('.')}=${value}`).toBe(true);
      }
    }
    expect(runs).toBeGreaterThan(100);
  });

  it('a getter that throws is reported, not propagated', () => {
    const plan = basePlan() as unknown as Record<string, unknown>;
    Object.defineProperty(plan, 'career', {
      get() {
        throw new Error('boom');
      },
    });
    expect(() => validatePlan(plan)).not.toThrow();
    expect(hasErrors(validatePlan(plan))).toBe(true);
  });
});

describe('validatePlan — precise paths and codes', () => {
  it('career order, first phase, ranges', () => {
    const plan = basePlan();
    plan.career[1].untilAge = 34;
    plan.career[0].mensilita = 15;
    plan.career[2].employeePensionPct = 120;
    plan.career[2].ralToday = -1;
    const issues = validatePlan(plan);
    expect(find(issues, 'career[1].untilAge')).toMatchObject({ level: 'error', code: 'careerOrder', params: { min: 36 } });
    expect(find(issues, 'career[0].mensilita', 'mensilitaRange')).toBeDefined();
    expect(find(issues, 'career[2].employeePensionPct', 'pctRange')).toMatchObject({ params: { min: 0, max: 100 } });
    expect(find(issues, 'career[2].ralToday', 'negativeAmount')).toBeDefined();
    const first = basePlan();
    first.career[0].untilAge = 30;
    expect(find(validatePlan(first), 'career[0].untilAge')).toMatchObject({ code: 'careerFirstPhase', params: { min: 31 } });
    const empty = basePlan();
    empty.career = [];
    expect(find(validatePlan(empty), 'career', 'careerEmpty')).toBeDefined();
  });

  it('portfolio allocation (per asset and sum), holdings, duplicate ids', () => {
    const plan = basePlan();
    plan.portfolio.assets[0].allocationPct = 120;
    let issues = validatePlan(plan);
    expect(find(issues, 'portfolio.assets[0].allocationPct', 'pctRange')).toBeDefined();
    expect(find(issues, 'portfolio.assets', 'allocationSum')).toMatchObject({ params: { sum: 150 } });
    const holdings = basePlan();
    holdings.assets.holdings.push({ assetId: 'gold', value: 100, costBasis: 100 });
    issues = validatePlan(holdings);
    expect(find(issues, 'assets.holdings[2].assetId')).toMatchObject({ code: 'unknownHoldingAsset', params: { assetId: 'gold' } });
    const dup = basePlan();
    dup.portfolio.assets[1].id = dup.portfolio.assets[0].id;
    expect(find(validatePlan(dup), 'portfolio.assets[1].id', 'duplicateAssetId')).toBeDefined();
  });

  it('profile, retirement, events, swr, runs, membership year', () => {
    const plan = basePlan();
    plan.profile.currentAge = 30.5;
    plan.profile.lifeExpectancy = 200;
    plan.retirement = { mode: 'fixedAge', fixedAge: 99 };
    plan.spending.events = [{ id: 'e', label: 'x', age: 10, amountToday: 1, years: 0 }];
    plan.withdrawal.swrPct = 0;
    plan.simulation.monteCarloRuns = 5;
    plan.assets.pensionFund.membershipStartYear = 2030;
    const issues = validatePlan(plan);
    expect(find(issues, 'profile.currentAge', 'notInteger')).toBeDefined();
    expect(find(issues, 'profile.lifeExpectancy', 'lifeExpectancyRange')).toBeDefined();
    expect(find(issues, 'spending.events[0].years', 'eventYears')).toBeDefined();
    expect(find(issues, 'withdrawal.swrPct', 'swrRange')).toBeDefined();
    expect(find(issues, 'simulation.monteCarloRuns', 'runsRange')).toBeDefined();
    expect(find(issues, 'assets.pensionFund.membershipStartYear', 'membershipYearRange')).toMatchObject({ params: { max: 2026 } });
    const ok = basePlan();
    ok.retirement = { mode: 'fixedAge', fixedAge: 99 };
    ok.spending.events = [{ id: 'e', label: 'x', age: 10, amountToday: 1, years: 1 }];
    const issues2 = validatePlan(ok);
    expect(find(issues2, 'retirement.fixedAge', 'fixedAgeRange')).toMatchObject({ params: { min: 30, max: 95 } });
    expect(find(issues2, 'spending.events[0].age', 'eventAgeRange')).toBeDefined();
  });

  it('pension fund access: too early, RITA windows, capital share, TFR rules', () => {
    const plan = basePlan();
    plan.pensionFund.accessAge = 60;
    expect(find(validatePlan(plan), 'pensionFund.accessAge')).toMatchObject({ level: 'error', code: 'pfAccessTooEarly', params: { min: 67 } });
    plan.pensionFund.accessMode = 'rita';
    expect(find(validatePlan(plan), 'pensionFund.accessAge')).toMatchObject({ level: 'warning', code: 'ritaRequiresUnemployment' });
    plan.pensionFund.accessAge = 56;
    expect(find(validatePlan(plan), 'pensionFund.accessAge')).toMatchObject({ level: 'error', code: 'pfAccessTooEarly', params: { min: 57 } });
    plan.pensionFund.accessAge = 62;
    expect(find(validatePlan(plan), 'pensionFund.accessAge')).toBeUndefined();
    plan.pensionFund.accessMode = 'retirement';
    plan.pensionFund.accessAge = 67;
    plan.pensionFund.capitalSharePct = 80;
    expect(find(validatePlan(plan), 'pensionFund.capitalSharePct', 'capitalShareAboveLegal')).toBeDefined();
    // A disabled fund with no money is not checked for access rules.
    plan.pensionFund.enabled = false;
    plan.assets.pensionFund.balance = 0;
    plan.pensionFund.accessAge = 40;
    expect(find(validatePlan(plan), 'pensionFund.accessAge')).toBeUndefined();

    const tfr = basePlan();
    tfr.career[1].tfrToFundPct = 50;
    tfr.career[2].tfrToFundPct = 0;
    const issues = validatePlan(tfr);
    expect(find(issues, 'career[1].tfrToFundPct')).toMatchObject({ level: 'warning', code: 'tfrBackToCompany', params: { previousPct: 100 } });
    expect(issues.filter((i) => i.path === 'career[1].tfrToFundPct').map((i) => i.code).sort()).toEqual(['tfrBackToCompany', 'tfrPartialCheckContract']);
    expect(find(issues, 'career[2].tfrToFundPct', 'tfrBackToCompany')).toBeDefined();
    const partial = basePlan();
    for (const p of partial.career) p.tfrToFundPct = 50;
    expect(validatePlan(partial).filter((i) => i.code === 'tfrPartialCheckContract' && i.level === 'info')).toHaveLength(3);
  });

  it('warnings and infos: returns, concentration, state pension, bonus to fund', () => {
    const plan = basePlan();
    plan.portfolio.assets[0].expectedReturnPct = 9;
    plan.portfolio.assets[0].allocationPct = 90;
    plan.portfolio.assets[1].allocationPct = 10;
    plan.statePension.claimAge = 64;
    plan.pensionFund.enabled = false;
    plan.career[0].bonusRegime = 'pensionFund';
    const issues = validatePlan(plan);
    expect(hasErrors(issues)).toBe(false);
    expect(find(issues, 'portfolio.assets[0].expectedReturnPct', 'returnVeryHigh')).toBeDefined();
    expect(find(issues, 'portfolio.assets[0].allocationPct', 'singleAssetConcentration')).toBeDefined();
    expect(find(issues, 'statePension.claimAge', 'claimBeforeOldAge')).toMatchObject({ level: 'warning', params: { oldAgeAge: 67 } });
    expect(find(issues, 'career[0].bonusRegime', 'bonusToFundDisabled')).toMatchObject({ level: 'info' });
    const real = basePlan();
    real.market.inflationPct = 6;
    expect(find(validatePlan(real), 'portfolio.assets', 'realReturnNonPositive')).toBeDefined();
  });

  it('tax rules: missing fields, bad bands, coefficients', () => {
    const plan = basePlan();
    plan.taxRules.irpef.brackets[1].upTo = 10000;
    plan.taxRules.inps.employeeRatePct = Number.NaN;
    (plan.taxRules.tfr as Partial<Plan['taxRules']['tfr']>).divisor = undefined;
    plan.taxRules.statePension.transformationCoefficients = {};
    plan.taxRules.pensionFund.yieldTaxPct = 120;
    const issues = validatePlan(plan);
    expect(find(issues, 'taxRules.irpef.brackets[1].upTo', 'bandOrder')).toBeDefined();
    expect(find(issues, 'taxRules.inps.employeeRatePct', 'invalidNumber')).toBeDefined();
    expect(find(issues, 'taxRules.tfr.divisor', 'missingField')).toBeDefined();
    expect(find(issues, 'taxRules.statePension.transformationCoefficients', 'coefficientsEmpty')).toBeDefined();
    expect(find(issues, 'taxRules.pensionFund.yieldTaxPct', 'pctRange')).toBeDefined();
    // Optional rules may be absent.
    const optional = basePlan();
    delete optional.taxRules.irpef.supplementaryTreatment;
    delete optional.taxRules.pensionFund.ritaMaxYearsEarlyUnemployed;
    expect(hasErrors(validatePlan(optional))).toBe(false);
  });

  it('errors come first, then warnings, then infos', () => {
    const plan = basePlan();
    plan.career[0].tfrToFundPct = 50;
    plan.portfolio.assets[0].expectedReturnPct = 9;
    plan.profile.currentAge = 5;
    const levels = validatePlan(plan).map((i) => i.level);
    expect(levels).toEqual([...levels].sort((a, b) => ['error', 'warning', 'info'].indexOf(a) - ['error', 'warning', 'info'].indexOf(b)));
  });

  it('ISSUE_CODES has no duplicates', () => {
    expect(new Set(ISSUE_CODES).size).toBe(ISSUE_CODES.length);
  });
});
