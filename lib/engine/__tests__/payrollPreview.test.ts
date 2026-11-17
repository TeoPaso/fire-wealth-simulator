/**
 * phaseStartPayroll: the inputs panel's net-pay preview is the payroll the simulation itself uses for the first
 * year of each phase (no second implementation of SPEC §5.1 in the UI).
 */
import { describe, expect, it } from 'vitest';
import { phaseStartPayroll } from '../payrollPreview';
import { runPlan } from '../fire';
import { computePayroll } from '../tax/payroll';
import { basePlan } from './helpers';

describe('phaseStartPayroll', () => {
  it('equals the simulated payroll of the phase start year (deterministic path)', () => {
    const p = basePlan();
    p.retirement = { mode: 'fixedAge', fixedAge: 60 }; // every phase start is a working year
    const { rows } = runPlan(p);
    for (const index of [0, 1, 2]) {
      const preview = phaseStartPayroll(p, index)!;
      const row = rows.find((r) => r.age === preview.age)!;
      expect(row.status).toBe('working');
      expect(preview.calendarYear).toBe(row.calendarYear);
      expect(preview.priceIndex).toBeCloseTo(row.priceIndex, 12);
      expect(preview.payroll.netIncome).toBeCloseTo(row.payroll!.netIncome, 9);
      expect(preview.payroll.inps).toBeCloseTo(row.payroll!.inps, 9);
      expect(preview.payroll.pensionTaxSaving).toBeCloseTo(row.payroll!.pensionTaxSaving, 9);
      expect(preview.input.employeePensionContribution).toBeCloseTo(row.pfEmployee, 9);
      expect(preview.input.employerPensionContribution).toBeCloseTo(row.pfEmployer, 9);
    }
  });

  it('applies inflation, phase pay and contributions (employee 1.5%, employer 2% of RAL)', () => {
    const p = basePlan();
    const preview = phaseStartPayroll(p, 1)!;
    const priceIndex = Math.pow(1 + p.market.inflationPct / 100, 5);
    expect(preview).toMatchObject({ age: 35, calendarYear: 2031 });
    expect(preview.priceIndex).toBeCloseTo(priceIndex, 12);
    expect(preview.input.ral).toBeCloseTo(45000 * priceIndex, 6);
    expect(preview.input.productivityBonus).toBeCloseTo(4000 * priceIndex, 6);
    expect(preview.input.employeePensionContribution).toBeCloseTo(0.015 * 45000 * priceIndex, 6);
    expect(preview.input.employerPensionContribution).toBeCloseTo(0.02 * 45000 * priceIndex, 6);
    expect(preview.salaryOnly).toEqual(computePayroll({ ...preview.input, productivityBonus: 0, ordinaryBonus: 0 }, p.taxRules));
    expect(preview.payroll.netIncome).toBeGreaterThan(preview.salaryOnly.netIncome);
    expect(preview.bonusOutsidePayroll).toBeNull();
  });

  it('sends nothing to the fund when it is disabled', () => {
    const p = basePlan();
    p.pensionFund.enabled = false;
    const preview = phaseStartPayroll(p, 0)!;
    expect(preview.input.employeePensionContribution).toBe(0);
    expect(preview.input.employerPensionContribution).toBe(0);
  });

  it('fills the deductible cap with the employer share counted in', () => {
    const p = basePlan();
    p.savingsPolicy.voluntaryPension = 'fillCap';
    const { input } = phaseStartPayroll(p, 0)!;
    expect(input.employeePensionContribution + input.employerPensionContribution).toBeCloseTo(p.taxRules.pensionFund.deductionCap, 6);
  });

  it('reports a bonus paid outside the pay slip', () => {
    const p = basePlan();
    p.career[0].bonusRegime = 'welfare';
    expect(phaseStartPayroll(p, 0)!.bonusOutsidePayroll).toBe('welfare');
    p.career[0].bonusRegime = 'pensionFund';
    const toFund = phaseStartPayroll(p, 0)!;
    expect(toFund.bonusOutsidePayroll).toBe('pensionFund');
    expect(toFund.payroll).toBe(toFund.salaryOnly);
    p.pensionFund.enabled = false; // the bonus then stays in the pay slip as a productivity bonus (SPEC §5.1)
    expect(phaseStartPayroll(p, 0)!.bonusOutsidePayroll).toBeNull();
  });

  it('is null (never throws) for missing phases and invalid drafts', () => {
    const p = basePlan();
    expect(phaseStartPayroll(p, 9)).toBeNull();
    const nan = basePlan();
    nan.career[0].ralToday = Number.NaN;
    expect(phaseStartPayroll(nan, 0)).toBeNull();
    const order = basePlan();
    order.career[1].untilAge = 33; // phase 2 would end before it starts
    expect(phaseStartPayroll(order, 2)).toBeNull();
    const broken = basePlan() as unknown as { career: unknown; profile: unknown };
    broken.profile = null;
    expect(phaseStartPayroll(broken as never, 0)).toBeNull();
  });
});
