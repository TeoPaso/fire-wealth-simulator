/**
 * Career-phase helpers for the inputs panel (pure, no React).
 *
 * The phase list edits never sort, clamp or "repair" ages: invalid orders are reported by validatePlan.
 */
import { createDefaultPlan, phaseStartPayroll, type CareerPhase, type PayrollBreakdown, type Plan } from '@/lib/engine';

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

/**
 * Moves the career phases by `delta` years, keeping their durations (used when the user changes their current
 * age: phases are absolute ages, so the example's "junior until 35" would otherwise end before a 38-year-old's
 * current age). The last phase usually means "until the pension": it keeps its end age when that is still after
 * the previous (moved) phase and after `newAge`, otherwise it moves too. Returns a new array (input untouched);
 * phases with unusable ages are left as they are (validation reports them).
 */
export function shiftCareerAges(career: readonly CareerPhase[], delta: number, newAge: number): CareerPhase[] {
  const next = career.map((p) => ({ ...p }));
  if (!Number.isFinite(delta) || delta === 0) return next;
  next.forEach((phase, i) => {
    const end = num(phase.untilAge);
    if (!Number.isFinite(end)) return;
    if (i === next.length - 1) {
      const prev = i > 0 ? num(next[i - 1].untilAge) : num(newAge);
      if (Number.isFinite(prev) && end > prev && end > num(newAge)) return;
    }
    phase.untilAge = end + delta;
  });
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
 * Net pay at the start of a phase, straight from the engine (phaseStartPayroll runs the simulation's own
 * working-year step), or null when the inputs needed for it are not valid yet.
 */
export function phasePayPreview(plan: Plan, index: number): PhasePayPreview | null {
  const year = phaseStartPayroll(plan, index);
  if (!year) return null;
  return {
    age: year.age,
    calendarYear: year.calendarYear,
    priceIndex: year.priceIndex,
    mensilita: num(plan.career[index]?.mensilita),
    salary: year.salaryOnly,
    withBonus: year.payroll,
    bonusOutsidePayroll: year.bonusOutsidePayroll,
  };
}
