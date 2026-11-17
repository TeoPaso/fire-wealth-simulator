/**
 * Career-phase helpers for the inputs panel (pure, no React).
 *
 * The phase list edits never sort, clamp or "repair" ages: invalid orders are reported by validatePlan.
 */
import {
  computePayroll,
  createDefaultPlan,
  type CareerPhase,
  type PayrollBreakdown,
  type PayrollInput,
  type Plan,
} from '@/lib/engine';

const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : NaN);

/** Start age of phase `index`: currentAge for the first phase, the previous phase's untilAge otherwise. */
export function phaseStartAge(plan: Plan, index: number): number {
  if (index <= 0) return num(plan.profile?.currentAge);
  return num(plan.career?.[index - 1]?.untilAge);
}

export interface TimelineSegment {
  index: number;
  label: string | undefined;
  fromAge: number;
  toAge: number;
}

/**
 * Segments of the career timeline. Returns null when ages are missing or not strictly increasing (the timeline
 * would be misleading; validation explains what to fix).
 */
export function careerTimeline(plan: Plan): TimelineSegment[] | null {
  const career = Array.isArray(plan.career) ? plan.career : [];
  if (career.length === 0) return null;
  const segments: TimelineSegment[] = [];
  for (let i = 0; i < career.length; i++) {
    const fromAge = phaseStartAge(plan, i);
    const toAge = num(career[i]?.untilAge);
    if (!Number.isFinite(fromAge) || !Number.isFinite(toAge) || toAge <= fromAge) return null;
    segments.push({ index: i, label: career[i]?.label, fromAge, toAge });
  }
  return segments;
}

/**
 * Swaps phases i and i+1 keeping each phase's DURATION and the outer boundaries: [30–35 A, 35–45 B] becomes
 * [30–40 B, 40–45 A]. When ages are not usable (missing/invalid) the two phases are swapped as they are and
 * validation reports the order. Returns a new array; the input is not mutated.
 */
export function movePhaseDown(career: readonly CareerPhase[], index: number, currentAge: number): CareerPhase[] {
  const next = career.map((p) => ({ ...p }));
  if (index < 0 || index + 1 >= next.length) return next;
  const a = next[index];
  const b = next[index + 1];
  const start = index === 0 ? num(currentAge) : num(next[index - 1].untilAge);
  const aEnd = num(a.untilAge);
  const bEnd = num(b.untilAge);
  next[index] = b;
  next[index + 1] = a;
  if ([start, aEnd, bEnd].every(Number.isFinite) && start < aEnd && aEnd < bEnd) {
    const bDuration = bEnd - aEnd;
    next[index] = { ...b, untilAge: start + bDuration };
    next[index + 1] = { ...a, untilAge: bEnd };
  }
  return next;
}

/** Years added by "add phase" after the last phase. */
export const NEW_PHASE_YEARS = 5;

/**
 * New phase appended after the last one: a copy of the last phase (same salary and settings, so the user only
 * changes what differs) lasting NEW_PHASE_YEARS. With no phases, the engine's example first phase is used and it
 * lasts until the legal old-age pension age (or one year if that is already past).
 */
export function newPhase(plan: Plan, id: string): CareerPhase {
  const career = Array.isArray(plan.career) ? plan.career : [];
  const last = career[career.length - 1];
  if (last && typeof last === 'object') {
    const lastEnd = num(last.untilAge);
    const start = Number.isFinite(lastEnd) ? lastEnd : num(plan.profile?.currentAge);
    return { ...last, id, label: '', untilAge: (Number.isFinite(start) ? start : 0) + NEW_PHASE_YEARS };
  }
  const template = createDefaultPlan().career[0];
  const age = num(plan.profile?.currentAge);
  const oldAge = num(plan.taxRules?.statePension?.oldAgeAge);
  const untilAge = Number.isFinite(oldAge) && Number.isFinite(age) && oldAge > age ? oldAge : (Number.isFinite(age) ? age : 0) + 1;
  return { ...template, id, label: '', untilAge };
}

/* ───────────────────────────── Net pay preview ───────────────────────────── */

export interface PhasePayPreview {
  /** Age and calendar year at the start of the phase. */
  age: number;
  calendarYear: number;
  /** Price index of that year on the deterministic inflation path (1 = today). */
  priceIndex: number;
  mensilita: number;
  /** Payroll of the year WITHOUT the bonus (monthly salary = netIncome / mensilità), nominal €. */
  salary: PayrollBreakdown;
  /** Payroll of the year including the bonus paid in the pay slip (equal to `salary` if none), nominal €. */
  withBonus: PayrollBreakdown;
  /** Where the bonus goes when it is not in the pay slip. */
  bonusOutsidePayroll: 'pensionFund' | 'welfare' | null;
}

/**
 * Payroll input for the first year of a phase, mirroring docs/SPEC.md §5.1 (salary at phase start = RAL today ×
 * price index, pension contributions only with the fund enabled, employer share only if the employee pays,
 * voluntary contribution policy, bonus regime). Inflation is the plan's deterministic rate.
 *
 * NOTE: this is glue that prepares an engine call. If the engine exposes a helper for the payroll input of a year,
 * this function should delegate to it.
 */
export function phasePayrollInputs(
  plan: Plan,
  index: number,
): { input: PayrollInput; salaryOnly: PayrollInput; age: number; calendarYear: number; mensilita: number; bonusOutsidePayroll: PhasePayPreview['bonusOutsidePayroll'] } | null {
  const phase = plan.career?.[index];
  if (!phase || typeof phase !== 'object') return null;
  const currentAge = num(plan.profile?.currentAge);
  const age = phaseStartAge(plan, index);
  const startYear = num(plan.profile?.startYear);
  const ralToday = num(phase.ralToday);
  if (![currentAge, age, startYear, ralToday].every(Number.isFinite) || age < currentAge || ralToday < 0) return null;

  const t = age - currentAge;
  const inflation = num(plan.market?.inflationPct);
  const priceIndex = Math.pow(1 + (Number.isFinite(inflation) ? inflation : 0) / 100, t);
  if (!(priceIndex > 0) || !Number.isFinite(priceIndex)) return null;

  const pct = (x: unknown) => {
    const v = num(x);
    return Number.isFinite(v) && v > 0 ? v / 100 : 0;
  };
  const ral = ralToday * priceIndex;
  const bonusGross = Math.max(0, Number.isFinite(num(phase.bonusGrossToday)) ? num(phase.bonusGrossToday) : 0) * priceIndex;
  const fundEnabled = plan.pensionFund?.enabled === true;

  let employee = 0;
  let employer = 0;
  if (fundEnabled) {
    const employeeBase = ral * pct(phase.employeePensionPct);
    employer = employeeBase > 0 ? ral * pct(phase.employerPensionPct) : 0;
    let voluntary = 0;
    const policy = plan.savingsPolicy?.voluntaryPension;
    if (policy === 'fillCap') {
      const cap = num(plan.taxRules?.pensionFund?.deductionCap);
      voluntary = Number.isFinite(cap) ? Math.max(0, cap - employer - employeeBase) : 0;
    } else if (policy === 'fixed') {
      const fixed = num(plan.savingsPolicy?.voluntaryPensionFixedToday);
      voluntary = Number.isFinite(fixed) && fixed > 0 ? fixed * priceIndex : 0;
    }
    employee = employeeBase + voluntary;
  }

  let ordinaryBonus = 0;
  let productivityBonus = 0;
  let bonusOutsidePayroll: PhasePayPreview['bonusOutsidePayroll'] = null;
  const regime = phase.bonusRegime;
  if (regime === 'ordinary') ordinaryBonus = bonusGross;
  else if (regime === 'pensionFund' && fundEnabled) bonusOutsidePayroll = bonusGross > 0 ? 'pensionFund' : null;
  else if (regime === 'welfare') bonusOutsidePayroll = bonusGross > 0 ? 'welfare' : null;
  else productivityBonus = bonusGross; // 'productivity', or 'pensionFund' with the fund disabled (SPEC §5.1)

  const calendarYear = startYear + t;
  const salaryOnly: PayrollInput = {
    ral,
    ordinaryBonus: 0,
    productivityBonus: 0,
    // Prior-year employment income is approximated with this year's gross (same phase, same pay).
    priorYearIncome: ral + ordinaryBonus + productivityBonus,
    employeePensionContribution: employee,
    employerPensionContribution: employer,
    calendarYear,
    priceIndex,
  };
  const input: PayrollInput = { ...salaryOnly, ordinaryBonus, productivityBonus };
  const mensilita = num(phase.mensilita);
  return { input, salaryOnly, age, calendarYear, mensilita, bonusOutsidePayroll };
}

/** Engine payroll at the start of a phase, or null when the inputs needed for it are not valid yet. */
export function phasePayPreview(plan: Plan, index: number): PhasePayPreview | null {
  const prepared = phasePayrollInputs(plan, index);
  if (!prepared || !plan.taxRules) return null;
  try {
    const salary = computePayroll(prepared.salaryOnly, plan.taxRules);
    const hasBonus = prepared.input.ordinaryBonus > 0 || prepared.input.productivityBonus > 0;
    const withBonus = hasBonus ? computePayroll(prepared.input, plan.taxRules) : salary;
    if (![salary.netIncome, withBonus.netIncome].every(Number.isFinite)) return null;
    return {
      age: prepared.age,
      calendarYear: prepared.calendarYear,
      priceIndex: prepared.input.priceIndex,
      mensilita: prepared.mensilita,
      salary,
      withBonus,
      bonusOutsidePayroll: prepared.bonusOutsidePayroll,
    };
  } catch {
    return null;
  }
}
