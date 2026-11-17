/**
 * "Confronto" tab: deterministic results of several plans side by side (runPlan per plan, cached by plan object —
 * plans in the store are immutable, so an edited plan is a new object) and their net worth in today's € by age.
 */
import { PlanValidationError, runPlan, type Plan, type PlanResult } from '@/lib/engine';
import { CATEGORICAL_COLORS } from '../../ui/colors';
import { wealthSeries } from './overview';

export type CompareOutcome =
  | { kind: 'ok'; result: PlanResult }
  | { kind: 'invalid'; errorCount: number }
  | { kind: 'failed' };

/** Columns of the comparison table (i18n: results.compare.col.<id>). */
export const COMPARE_COLUMNS = ['plan', 'fiAge', 'retirementAge', 'success', 'atRetirement', 'final', 'savingsRate'] as const;

const cache = new WeakMap<Plan, CompareOutcome>();

/** runPlan(plan) memoised per plan object; never throws. */
export function comparePlanResult(plan: Plan): CompareOutcome {
  const hit = cache.get(plan);
  if (hit) return hit;
  let outcome: CompareOutcome;
  try {
    outcome = { kind: 'ok', result: runPlan(plan) };
  } catch (error) {
    outcome =
      error instanceof PlanValidationError
        ? { kind: 'invalid', errorCount: error.issues.filter((i) => i.level === 'error').length }
        : { kind: 'failed' };
  }
  cache.set(plan, outcome);
  return outcome;
}

/**
 * Colour slot per compared plan. The colour follows the plan, not its rank: a plan keeps the slot of its position in
 * the plan list when free, so including or excluding another plan never repaints it. At most
 * CATEGORICAL_COLORS.length plans get a slot (no generated colours); the others are listed without a line.
 */
export function colorSlots(plans: readonly Plan[], comparedIds: readonly string[]): Map<string, number> {
  const max = CATEGORICAL_COLORS.length;
  const slots = new Map<string, number>();
  const taken = new Set<number>();
  const compared = plans.filter((p) => comparedIds.includes(p.id));
  for (const plan of compared) {
    const index = plans.indexOf(plan);
    if (index < max && !taken.has(index)) {
      slots.set(plan.id, index);
      taken.add(index);
    }
  }
  for (const plan of compared) {
    if (slots.has(plan.id)) continue;
    let free = 0;
    while (free < max && taken.has(free)) free++;
    if (free >= max) break;
    slots.set(plan.id, free);
    taken.add(free);
  }
  return slots;
}

export interface OverlayRow {
  age: number;
  /** Net worth (today's €) by plan id; missing when the age is outside that plan's horizon. */
  [planId: string]: number;
}

/** Net worth in today's € at the start of each age, one column per plan id, over the union of ages. */
export function overlayRows(entries: readonly { plan: Plan; result: PlanResult }[]): OverlayRow[] {
  const byAge = new Map<number, OverlayRow>();
  for (const { plan, result } of entries) {
    for (const point of wealthSeries(result, plan.profile.startYear, 'real')) {
      const row = byAge.get(point.age) ?? { age: point.age };
      row[plan.id] = point.netWorth;
      byAge.set(point.age, row);
    }
  }
  return [...byAge.values()].sort((a, b) => a.age - b.age);
}
