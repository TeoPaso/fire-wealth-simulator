import { describe, expect, it } from 'vitest';
import { PlanValidationError } from '../types';
import { findFiAge, runPlan } from '../fire';
import { runSensitivity } from '../sensitivity';
import { ISSUE_CODES } from '../validate';
import { basePlan, rowAt } from './helpers';

describe('runPlan — default example plan', () => {
  const result = runPlan(basePlan());
  const s = result.summary;

  it('finds an FI age, runs the displayed retirement age successfully and reports consistent summary fields', () => {
    expect(s.fiAge).not.toBeNull();
    expect(s.retirementAge).toBe(s.fiAge);
    expect(s.yearsToFi).toBe((s.fiAge ?? 0) - 30);
    expect(s.success).toBe(true);
    expect(s.depletionAge).toBeNull();
    expect(result.rows).toHaveLength(66);
    expect(result.rows[0].priceIndex).toBe(1);
    expect(s.fireNumberToday).toBeCloseTo((1500 * 12) / 0.035, 6);
    expect(s.accessibleTodayStart).toBeCloseTo(20000, 6); // cash 5,000 + holdings 15,000 at cost
    expect(s.progressPct).toBeCloseTo((20000 / s.fireNumberToday) * 100, 9);
    const last = result.rows[result.rows.length - 1];
    expect(s.finalNetWorthToday).toBeCloseTo(last.netWorth / (last.priceIndexEnd ?? 1), 6);
    const lastWorking = rowAt(result.rows, s.retirementAge - 1);
    expect(s.netWorthAtRetirementToday).toBeCloseTo(lastWorking.netWorth / (lastWorking.priceIndexEnd ?? 1), 6);
    expect(s.statePensionClaimAge).toBe(67);
    expect(s.pensionFundAccessAge).toBe(67);
    expect(s.bridgeYears).toBe(67 - s.retirementAge);
    expect(s.statePensionAnnualNetToday).toBeGreaterThan(0);
    expect(s.avgSavingsRatePct).toBeGreaterThan(0);
    for (const v of Object.values(s.totals)) expect(Number.isFinite(v)).toBe(true);
    expect(s.totals.inps).toBeGreaterThan(0);
    expect(s.totals.employerContributions).toBeGreaterThan(0);
  });

  it('every row is finite and the status switches once, at the retirement age', () => {
    for (const r of result.rows) {
      for (const [k, v] of Object.entries(r)) if (typeof v === 'number') expect(Number.isFinite(v), `${k} @${r.age}`).toBe(true);
      expect(r.status).toBe(r.age < s.retirementAge ? 'working' : 'retired');
      expect(r.payroll === null).toBe(r.status === 'retired');
      expect(r.accessibleNet + r.lockedNet).toBeCloseTo(r.netWorth, 6);
    }
  });

  it('issues are warnings/infos with known codes', () => {
    for (const issue of result.issues) {
      expect(issue.level).not.toBe('error');
      expect(ISSUE_CODES as readonly string[]).toContain(issue.code);
    }
    expect(result.issues.some((i) => i.code === 'montanteEstimated')).toBe(true);
  });

  it('retiring one year before fiAge fails', () => {
    const plan = basePlan();
    plan.retirement = { mode: 'fixedAge', fixedAge: (s.fiAge ?? 0) - 1 };
    const early = runPlan(plan);
    expect(early.summary.success).toBe(false);
    expect(early.summary.depletionAge).not.toBeNull();
  });
});

describe('runPlan — modes and validation', () => {
  it("fixedAge mode simulates the fixed age; fiAge is still reported", () => {
    const plan = basePlan();
    plan.retirement = { mode: 'fixedAge', fixedAge: 60 };
    const r = runPlan(plan);
    expect(r.summary.retirementAge).toBe(60);
    expect(r.summary.fiAge).toBe(runPlan(basePlan()).summary.fiAge);
    expect(rowAt(r.rows, 59).status).toBe('working');
    expect(rowAt(r.rows, 60).status).toBe('retired');
    expect(rowAt(r.rows, 60).tfrPayoutNet).toBeGreaterThan(0);
  });

  it('auto mode without an FI age falls back to the state-pension age', () => {
    const plan = basePlan();
    plan.spending.monthlyToday = 3500;
    const r = runPlan(plan);
    expect(r.summary.fiAge).toBeNull();
    expect(r.summary.yearsToFi).toBeNull();
    expect(r.summary.retirementAge).toBe(67);
    expect(r.summary.success).toBe(false);
    expect(r.issues.some((i) => i.code === 'negativeSavingsWhileWorking')).toBe(true);
  });

  it('throws PlanValidationError with the issues when the plan has errors', () => {
    const plan = basePlan();
    plan.portfolio.assets[0].allocationPct = 50;
    expect(() => runPlan(plan)).toThrow(PlanValidationError);
    try {
      runPlan(plan);
    } catch (e) {
      expect((e as PlanValidationError).issues.find((i) => i.level === 'error')).toMatchObject({ path: 'portfolio.assets', code: 'allocationSum' });
    }
  });

  it('post-run issues: no state pension, short fund membership', () => {
    const plan = basePlan();
    plan.assets.inps.contributionYears = 0;
    plan.retirement = { mode: 'fixedAge', fixedAge: 30 }; // redemption at 34, in 2030: 4 years of membership
    plan.assets.pensionFund.membershipStartYear = 2026;
    plan.pensionFund.accessMode = 'redemption';
    const r = runPlan(plan);
    expect(r.issues.find((i) => i.code === 'noStatePension')).toMatchObject({ level: 'warning', path: 'assets.inps.contributionYears' });
    expect(r.issues.find((i) => i.code === 'pfShortMembership')).toMatchObject({ params: { years: 4, min: 5 } });
  });
});

describe('FI age monotonicity', () => {
  it('does not increase when spending decreases', () => {
    let previous = Infinity;
    for (const monthly of [2600, 2200, 1800, 1500, 1200, 900]) {
      const plan = basePlan();
      plan.spending.monthlyToday = monthly;
      const fi = findFiAge(plan) ?? Infinity;
      expect(fi).toBeLessThanOrEqual(previous);
      previous = fi;
    }
    expect(previous).toBeLessThan(45);
  });

  it('does not increase when returns increase', () => {
    let previous = Infinity;
    for (const delta of [-3, -2, -1, 0, 1, 2]) {
      const plan = basePlan();
      for (const a of plan.portfolio.assets) a.expectedReturnPct += delta;
      plan.pensionFund.expectedReturnPct += delta;
      const fi = findFiAge(plan) ?? Infinity;
      expect(fi).toBeLessThanOrEqual(previous);
      previous = fi;
    }
  });
});

describe('runSensitivity', () => {
  it('returns the 7 items of SPEC §5.10 with the base FI age, sorted by impact, without touching the plan', () => {
    const plan = basePlan();
    const before = JSON.stringify(plan);
    const items = runSensitivity(plan);
    expect(JSON.stringify(plan)).toBe(before);
    expect(items.map((i) => i.key).sort()).toEqual(
      ['inflation', 'lifeExpectancy', 'retirementSpending', 'returns', 'salary', 'spending', 'statePension'].sort(),
    );
    const base = findFiAge(plan);
    for (const i of items) expect(i.fiAgeBase).toBe(base);
    const spending = items.find((i) => i.key === 'spending');
    expect(spending).toMatchObject({ unit: 'pct', lowValue: -10, highValue: 10, lowDelta: '-10%', highDelta: '+10%' });
    expect(spending?.fiAgeLow ?? 0).toBeLessThanOrEqual(base ?? 0);
    expect(spending?.fiAgeHigh ?? 0).toBeGreaterThanOrEqual(base ?? 0);
    const returns = items.find((i) => i.key === 'returns');
    expect(returns?.fiAgeHigh ?? 0).toBeLessThanOrEqual(base ?? 0);
    const impact = (i: (typeof items)[number]) =>
      Math.max(Math.abs((i.fiAgeLow ?? 96) - (base ?? 96)), Math.abs((i.fiAgeHigh ?? 96) - (base ?? 96)));
    for (let k = 1; k < items.length; k++) expect(impact(items[k - 1])).toBeGreaterThanOrEqual(impact(items[k]));
  });
});
