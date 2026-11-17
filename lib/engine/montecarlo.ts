import type { MonteCarloResult, Plan } from './types';

export interface MonteCarloOptions {
  runs?: number;
  seed?: number;
  /** Retirement age whose percentiles are returned; default = runPlan(plan).summary.retirementAge. */
  retirementAge?: number;
}

// STUB — to be implemented (docs/SPEC.md §5.9).
export function runMonteCarlo(_plan: Plan, _opts: MonteCarloOptions = {}): MonteCarloResult {
  throw new Error('not implemented');
}
