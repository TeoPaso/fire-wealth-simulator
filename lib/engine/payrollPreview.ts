/**
 * Payroll at the start of a career phase, for the inputs panel's "net pay" preview.
 *
 * It runs the simulation's own working-year step (workYear in simulate.ts) on the deterministic path, so the
 * preview is exactly the payroll the simulation uses for that year: same salary growth, price index, pension
 * contributions (incl. the voluntary policy), bonus regime and prior-year income chain. The UI never builds a
 * PayrollInput itself (docs/SPEC.md §3, "single source of truth").
 */
import type { PayrollBreakdown, PayrollInput, Plan } from './types';
import { deterministicPath } from './paths';
import { createWorkCache, preparePlan, workYear } from './simulate';
import { computePayroll } from './tax/payroll';

export interface PhaseStartPayroll {
  /** Age and calendar year of the first year of the phase. */
  age: number;
  calendarYear: number;
  /** Price index of that year on the deterministic inflation path (1 = today). */
  priceIndex: number;
  /** Payroll input of the year as the simulation builds it (nominal €). */
  input: PayrollInput;
  /** Payroll of the year, including the bonus when it is paid in the pay slip (nominal €). */
  payroll: PayrollBreakdown;
  /** The same year without any bonus: the monthly salary is its netIncome / mensilità (nominal €). */
  salaryOnly: PayrollBreakdown;
  /** Where the bonus goes when it is not paid in the pay slip. */
  bonusOutsidePayroll: 'pensionFund' | 'welfare' | null;
}

const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function allFinite(p: PayrollBreakdown): boolean {
  return Object.values(p).every((v) => v === undefined || finite(v));
}

/**
 * Engine payroll of the first year of `plan.career[phaseIndex]`, or null when the inputs it needs are not valid
 * (missing phase, non-increasing ages, non-numeric amounts…). Never throws: the plan may be a draft being edited.
 */
export function phaseStartPayroll(plan: Plan, phaseIndex: number): PhaseStartPayroll | null {
  try {
    const phase = plan.career?.[phaseIndex];
    if (!phase || !finite(phase.ralToday) || phase.ralToday < 0) return null;
    const prep = preparePlan(plan);
    const prepared = prep.phases[phaseIndex];
    const t = prepared.startAge - prep.currentAge;
    if (!Number.isInteger(t) || t < 0 || t > 200 || !finite(prep.startYear) || prepared.untilAge <= prepared.startAge) return null;
    // Only the years up to the phase start are needed (the payroll does not depend on the plan horizon).
    const years = t + 1;
    const cache = createWorkCache({ ...prep, years }, deterministicPath(plan, years), true);
    const year = workYear(prep, cache, t);
    if (year.phaseIndex !== phaseIndex) return null;
    const salaryOnly =
      year.input.ordinaryBonus > 0 || year.input.productivityBonus > 0
        ? computePayroll({ ...year.input, ordinaryBonus: 0, productivityBonus: 0 }, prep.rules)
        : year.payroll;
    if (!finite(cache.priceIndex[t]) || !allFinite(year.payroll) || !allFinite(salaryOnly)) return null;
    return {
      age: prepared.startAge,
      calendarYear: prep.startYear + t,
      priceIndex: cache.priceIndex[t],
      input: year.input,
      payroll: year.payroll,
      salaryOnly,
      bonusOutsidePayroll: year.bonusToFund > 0 ? 'pensionFund' : year.welfare > 0 ? 'welfare' : null,
    };
  } catch {
    return null;
  }
}
