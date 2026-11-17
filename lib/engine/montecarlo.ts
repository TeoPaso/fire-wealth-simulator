import type { Issue, MonteCarloResult, PercentileRow, Plan } from './types';
import { PlanValidationError } from './types';
import { createPathGenerator, deterministicPath } from './paths';
import { createWorkCache, fallbackRetirementAge, preparePlan, simulatePrepared, type PreparedPlan } from './simulate';
import { clampRetirementAge, displayedRetirementAge, findFiAgePrepared } from './fire';
import { hasErrors, validatePlan, VALIDATION_LIMITS } from './validate';

/**
 * Monte Carlo simulation (docs/SPEC.md §5.9).
 *
 * - Run k uses the market path generated from (seed, k) only, so it is identical across candidate retirement ages
 *   (common random numbers) and across calls; the same work cache (payroll of the working years) is shared by all
 *   candidate ages of a run.
 * - Candidate retirement ages: [max(currentAge, fiAgeDet − 3), min(lifeExpectancy, fiAgeDet + 10)], or the 12 years
 *   up to the state-pension age when the deterministic fiAge is null. The scan is extended downwards while its lowest
 *   age still meets the target, and upwards (up to the state-pension age) while no age meets it, so confidentFiAge
 *   is the true minimum over a contiguous range.
 * - Percentiles (today's €, end of each year) and the depletion-age histogram refer to the displayed retirement age.
 */

export interface MonteCarloOptions {
  runs?: number;
  seed?: number;
  /** Retirement age whose percentiles are returned; default = runPlan(plan).summary.retirementAge. */
  retirementAge?: number;
}

/** Width of the candidate window around the deterministic FI age and of each extension batch. */
export const MC_WINDOW = { below: 3, above: 10, withoutFiAge: 12, extensionBatch: 5 } as const;

/** Percentile (0–100) of sorted values, linear interpolation between order statistics (type 7). */
export function percentileSorted(sorted: ArrayLike<number>, pct: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const h = (n - 1) * (pct / 100);
  const lo = Math.floor(h);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
}

function percentileRows(prep: PreparedPlan, values: Float64Array, runs: number): PercentileRow[] {
  const years = prep.years;
  const column = new Float64Array(runs);
  const rows: PercentileRow[] = [];
  for (let t = 0; t < years; t++) {
    for (let r = 0; r < runs; r++) column[r] = values[r * years + t];
    column.sort();
    rows.push({
      age: prep.currentAge + t,
      p10: percentileSorted(column, 10),
      p25: percentileSorted(column, 25),
      p50: percentileSorted(column, 50),
      p75: percentileSorted(column, 75),
      p90: percentileSorted(column, 90),
    });
  }
  return rows;
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let a = from; a <= to; a++) out.push(a);
  return out;
}

/** Runs the Monte Carlo simulation of a plan. Throws PlanValidationError when the plan (or `opts.runs`) is invalid. */
export function runMonteCarlo(plan: Plan, opts: MonteCarloOptions = {}): MonteCarloResult {
  const issues = validatePlan(plan);
  const runs = opts.runs ?? plan.simulation.monteCarloRuns;
  if (!Number.isInteger(runs) || runs < 1 || runs > VALIDATION_LIMITS.monteCarloRuns.max) {
    const issue: Issue = {
      level: 'error',
      path: 'simulation.monteCarloRuns',
      code: 'runsRange',
      params: { min: 1, max: VALIDATION_LIMITS.monteCarloRuns.max },
    };
    throw new PlanValidationError([...issues, issue]);
  }
  if (hasErrors(issues)) throw new PlanValidationError(issues);
  const seed = opts.seed ?? plan.simulation.seed;

  const prep = preparePlan(plan);
  const years = prep.years;
  const fiDet = findFiAgePrepared(prep, deterministicPath(plan, years));
  const retirementAge = clampRetirementAge(prep, opts.retirementAge ?? displayedRetirementAge(prep, fiDet));
  const stateAge = clampRetirementAge(prep, fallbackRetirementAge(prep));
  const target = plan.simulation.successTargetPct;

  let scanLo: number;
  let scanHi: number;
  if (fiDet !== null) {
    scanLo = Math.max(prep.currentAge, fiDet - MC_WINDOW.below);
    scanHi = Math.min(prep.lifeExpectancy, fiDet + MC_WINDOW.above);
  } else {
    scanHi = stateAge;
    scanLo = Math.max(prep.currentAge, stateAge - MC_WINDOW.withoutFiAge);
  }

  const generate = createPathGenerator(plan, years, seed);
  const successes = new Map<number, number>();
  const netWorth = new Float64Array(runs * years);
  const accessible = new Float64Array(runs * years);
  const record = { netWorth, accessible, offset: 0 };
  const depletion = new Map<number, number>();

  /** Simulates every run for `ages` (stopping at the first shortfall); with `displayed`, also the recorded age. */
  const pass = (ages: number[], displayed: boolean): void => {
    for (const age of ages) if (!successes.has(age)) successes.set(age, 0);
    if (displayed && !successes.has(retirementAge)) successes.set(retirementAge, 0);
    for (let r = 0; r < runs; r++) {
      const path = generate(r);
      const cache = createWorkCache(prep, path, false);
      if (displayed) {
        record.offset = r * years;
        const sim = simulatePrepared(prep, { retirementAge, path, detail: false, cache, record });
        if (sim.success) successes.set(retirementAge, (successes.get(retirementAge) ?? 0) + 1);
        else if (sim.depletionAge !== null) depletion.set(sim.depletionAge, (depletion.get(sim.depletionAge) ?? 0) + 1);
      }
      for (const age of ages) {
        if (displayed && age === retirementAge) continue;
        const sim = simulatePrepared(prep, { retirementAge: age, path, detail: false, stopOnShortfall: true, cache });
        if (sim.success) successes.set(age, (successes.get(age) ?? 0) + 1);
      }
    }
  };
  const pct = (age: number): number => ((successes.get(age) ?? 0) / runs) * 100;

  pass(range(scanLo, scanHi), true);
  // Extend downwards while the lowest scanned age still meets the target.
  while (scanLo > prep.currentAge && pct(scanLo) >= target) {
    const from = Math.max(prep.currentAge, scanLo - MC_WINDOW.extensionBatch);
    pass(range(from, scanLo - 1), false);
    scanLo = from;
  }
  // Extend upwards (up to the state-pension age) while no scanned age meets the target.
  const meets = () => range(scanLo, scanHi).some((a) => pct(a) >= target);
  while (!meets() && scanHi < stateAge) {
    const to = Math.min(stateAge, scanHi + MC_WINDOW.extensionBatch);
    pass(range(scanHi + 1, to), false);
    scanHi = to;
  }

  let confidentFiAge: number | null = null;
  for (let a = scanLo; a <= scanHi; a++) {
    if (pct(a) >= target) {
      confidentFiAge = a;
      break;
    }
  }

  return {
    runs,
    seed,
    retirementAge,
    successProbabilityPct: pct(retirementAge),
    netWorth: percentileRows(prep, netWorth, runs),
    accessible: percentileRows(prep, accessible, runs),
    depletionAges: [...depletion.entries()].sort((a, b) => a[0] - b[0]).map(([age, count]) => ({ age, count })),
    confidentFiAge,
    successByRetirementAge: [...successes.keys()].sort((a, b) => a - b).map((age) => ({ age, successPct: pct(age) })),
  };
}
