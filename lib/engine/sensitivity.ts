import type { Plan, SensitivityItem } from './types';
import { PlanValidationError } from './types';
import { findFiAge } from './fire';
import { hasErrors, validatePlan } from './validate';

/**
 * Sensitivity of the deterministic FI age to one assumption at a time (docs/SPEC.md §5.10), for a tornado chart.
 * Each variation is applied to a deep copy of the plan; the original is never touched. Variants are not re-validated
 * (e.g. a shorter life expectancy may put an event or the fixed retirement age beyond the horizon, which does not
 * affect the FI age).
 */

type Unit = NonNullable<SensitivityItem['unit']>;

interface Variation {
  key: string;
  unit: Unit;
  low: number;
  high: number;
  apply: (plan: Plan, delta: number) => void;
}

const scale = (delta: number) => 1 + delta / 100;

/** The variations of SPEC §5.10 (deltas in the unit of each item). */
export const SENSITIVITY_VARIATIONS: readonly Variation[] = [
  {
    key: 'returns',
    unit: 'pp',
    low: -1,
    high: 1,
    apply: (p, d) => {
      for (const a of p.portfolio.assets) a.expectedReturnPct += d;
      p.pensionFund.expectedReturnPct += d;
    },
  },
  { key: 'inflation', unit: 'pp', low: -1, high: 1, apply: (p, d) => void (p.market.inflationPct += d) },
  { key: 'spending', unit: 'pct', low: -10, high: 10, apply: (p, d) => void (p.spending.monthlyToday *= scale(d)) },
  {
    // Gross pay: RAL and bonus of every phase.
    key: 'salary',
    unit: 'pct',
    low: -10,
    high: 10,
    apply: (p, d) => {
      for (const ph of p.career) {
        ph.ralToday *= scale(d);
        ph.bonusGrossToday *= scale(d);
      }
    },
  },
  {
    key: 'retirementSpending',
    unit: 'pp',
    low: -10,
    high: 10,
    apply: (p, d) => void (p.spending.retirementPct = Math.max(0, p.spending.retirementPct + d)),
  },
  {
    key: 'lifeExpectancy',
    unit: 'years',
    low: -5,
    high: 5,
    apply: (p, d) => void (p.profile.lifeExpectancy = Math.max(p.profile.currentAge + 1, p.profile.lifeExpectancy + d)),
  },
  {
    // 'estimate': the expected net amount; 'contributivo': every transformation coefficient.
    key: 'statePension',
    unit: 'pct',
    low: -20,
    high: 20,
    apply: (p, d) => {
      if (p.statePension.mode === 'estimate') {
        p.statePension.monthlyNetToday *= scale(d);
      } else {
        const table = p.taxRules.statePension.transformationCoefficients;
        for (const age of Object.keys(table)) table[age] *= scale(d);
      }
    },
  },
];

function label(value: number, unit: Unit): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return unit === 'pp' ? `${sign}${abs} pp` : unit === 'pct' ? `${sign}${abs}%` : `${sign}${abs}y`;
}

function variantFiAge(plan: Plan, variation: Variation, delta: number): number | null {
  const copy = JSON.parse(JSON.stringify(plan)) as Plan;
  variation.apply(copy, delta);
  return findFiAge(copy);
}

/**
 * Tornado data: FI age with each assumption moved down/up, sorted by impact (largest change of the FI age first;
 * "never FI" counts as lifeExpectancy + 1). Throws PlanValidationError when the plan has errors.
 * `lowDelta`/`highDelta` are compact language-neutral labels; the UI should format `unit`/`lowValue`/`highValue`.
 */
export function runSensitivity(plan: Plan): SensitivityItem[] {
  const issues = validatePlan(plan);
  if (hasErrors(issues)) throw new PlanValidationError(issues);
  const base = findFiAge(plan);
  const never = plan.profile.lifeExpectancy + 1;
  const value = (age: number | null) => age ?? never;
  const items = SENSITIVITY_VARIATIONS.map((v, order) => {
    const fiAgeLow = variantFiAge(plan, v, v.low);
    const fiAgeHigh = variantFiAge(plan, v, v.high);
    const item: SensitivityItem = {
      key: v.key,
      lowDelta: label(v.low, v.unit),
      highDelta: label(v.high, v.unit),
      unit: v.unit,
      lowValue: v.low,
      highValue: v.high,
      fiAgeLow,
      fiAgeHigh,
      fiAgeBase: base,
    };
    const impact = Math.max(Math.abs(value(fiAgeLow) - value(base)), Math.abs(value(fiAgeHigh) - value(base)));
    const spread = Math.abs(value(fiAgeHigh) - value(fiAgeLow));
    return { item, impact, spread, order };
  });
  items.sort((a, b) => b.impact - a.impact || b.spread - a.spread || a.order - b.order);
  return items.map((x) => x.item);
}
