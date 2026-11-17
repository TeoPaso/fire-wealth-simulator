/**
 * Monte Carlo + sensitivity analysis of one plan, shared by the Web Worker (analysis.worker.ts) and by the
 * main-thread fallback used when workers are unavailable. Pure: no DOM, no React.
 */
import {
  PlanValidationError,
  runMonteCarlo,
  runSensitivity,
  type Issue,
  type MonteCarloResult,
  type Plan,
  type SensitivityItem,
} from '@/lib/engine';

/** Message sent to the worker. `id` increases with every request; stale responses are ignored by the caller. */
export interface AnalysisRequest {
  id: number;
  plan: Plan;
}

/** Serializable error (Error instances do not survive structured cloning with their class). */
export interface AnalysisError {
  name: string;
  message: string;
  /** Validation issues when the plan was rejected by the engine. */
  issues?: Issue[];
}

export interface AnalysisResult {
  monteCarlo: MonteCarloResult;
  sensitivity: SensitivityItem[];
  /** Wall-clock duration of the analysis, ms. */
  durationMs: number;
}

export type AnalysisResponse =
  | ({ id: number; ok: true } & AnalysisResult)
  | { id: number; ok: false; error: AnalysisError };

/** Converts anything thrown by the engine into a plain serializable object. */
export function toAnalysisError(error: unknown): AnalysisError {
  if (error instanceof PlanValidationError) return { name: error.name, message: error.message, issues: error.issues };
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: 'Error', message: String(error) };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Runs Monte Carlo and sensitivity for `plan`. Never throws: failures come back as `{ ok: false }`. */
export function analyzePlan(request: AnalysisRequest): AnalysisResponse {
  const start = now();
  try {
    const monteCarlo = runMonteCarlo(request.plan);
    const sensitivity = runSensitivity(request.plan);
    return { id: request.id, ok: true, monteCarlo, sensitivity, durationMs: now() - start };
  } catch (error) {
    return { id: request.id, ok: false, error: toAnalysisError(error) };
  }
}
