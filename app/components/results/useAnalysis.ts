'use client';

/**
 * Monte Carlo + sensitivity for the active plan, computed in a Web Worker (docs/SPEC.md §7):
 * - debounced (ANALYSIS_DEBOUNCE_MS) after every plan change;
 * - every request has an id; answers to older requests are ignored (the plan changed meanwhile), and the job in
 *   flight is cancelled when a newer request arrives or the plan becomes invalid (analysisRunner);
 * - a hidden (background) tab does not analyse; it catches up when it becomes visible;
 * - falls back to the main thread when Worker is unavailable or the worker fails to load;
 * - while a new result is computed, the previous one stays available and is flagged `stale` (same plan) so the
 *   charts keep their frame instead of flashing a skeleton.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Plan } from '@/lib/engine';
import { analyzePlan, type AnalysisError, type AnalysisRequest, type AnalysisResponse, type AnalysisResult } from '../../workers/analysis';
import { createAnalysisRunner, type AnalysisRunner, type WorkerLike } from './analysisRunner';

export const ANALYSIS_DEBOUNCE_MS = 400;

/** Request ids: only the answer to the latest request is accepted. */
export function createRequestGate() {
  let latest = 0;
  return {
    next: () => ++latest,
    isLatest: (id: number) => id === latest,
    /** Invalidate every pending request (e.g. the plan became invalid). */
    cancel: () => {
      latest += 1;
    },
  };
}

export interface AnalysisState {
  /** Plan object the current result/error refers to. */
  plan: Plan | null;
  result: AnalysisResult | null;
  error: AnalysisError | null;
  /** Where the last result was computed. */
  engine: 'worker' | 'main' | null;
}

export interface AnalysisView extends AnalysisState {
  /** A computation for the current plan is scheduled or running. */
  running: boolean;
  /** The result belongs to an older version of the same plan (an update is on its way). */
  stale: boolean;
  /** The result belongs to the current plan id (possibly stale); false = nothing to show for this plan yet. */
  available: boolean;
}

function createWorker(): WorkerLike | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('../../workers/analysis.worker.ts', import.meta.url)) as unknown as WorkerLike;
  } catch {
    return null;
  }
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
const isVisible = () => document.visibilityState !== 'hidden';
const alwaysVisible = () => true;

/** Runs the analysis of `plan` (only when `enabled`, i.e. the plan has no validation errors). */
export function useAnalysis(plan: Plan, enabled: boolean): AnalysisView {
  const [state, setState] = useState<AnalysisState>({ plan: null, result: null, error: null, engine: null });
  const gate = useRef(createRequestGate());
  const runner = useRef<AnalysisRunner | null>(null);
  const pending = useRef<AnalysisRequest | null>(null);
  const statePlan = useRef<Plan | null>(null);
  // A background tab (hidden) does not analyse: it catches up when it becomes visible again (ROB-12).
  const visible = useSyncExternalStore(subscribeVisibility, isVisible, alwaysVisible);

  const accept = (response: AnalysisResponse, engine: 'worker' | 'main') => {
    const request = pending.current;
    if (!gate.current.isLatest(response.id) || !request || request.id !== response.id) return;
    pending.current = null;
    statePlan.current = request.plan;
    setState(
      response.ok
        ? {
            plan: request.plan,
            result: { monteCarlo: response.monteCarlo, sensitivity: response.sensitivity, durationMs: response.durationMs },
            error: null,
            engine,
          }
        : { plan: request.plan, result: null, error: response.error, engine },
    );
  };
  const acceptRef = useRef(accept);
  useEffect(() => {
    acceptRef.current = accept;
  });

  // One runner (and worker) per mounted panel.
  useEffect(() => {
    const current = createAnalysisRunner({
      createWorker,
      onResponse: (response, engine) => acceptRef.current(response, engine),
      runOnMainThread: (request) => {
        // Yield first so the "calcolo in corso" indicator can paint before the main thread is busy.
        window.setTimeout(() => {
          if (gate.current.isLatest(request.id)) acceptRef.current(analyzePlan(request), 'main');
        }, 30);
      },
    });
    runner.current = current;
    return () => {
      current.dispose();
      if (runner.current === current) runner.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      // The plan became invalid: drop pending answers and stop the job in flight (no wasted CPU / battery).
      gate.current.cancel();
      pending.current = null;
      runner.current?.cancel();
      return;
    }
    if (!visible || statePlan.current === plan) return;
    const timer = window.setTimeout(() => {
      const request: AnalysisRequest = { id: gate.current.next(), plan };
      pending.current = request;
      runner.current?.run(request);
    }, ANALYSIS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [plan, enabled, visible]);
  const samePlanId = state.plan !== null && state.plan.id === plan.id;
  return {
    ...state,
    // Derived: a result for this exact plan object has not arrived yet.
    running: enabled && state.plan !== plan,
    available: enabled && samePlanId && (state.result !== null || state.error !== null),
    stale: enabled && samePlanId && state.plan !== plan,
  };
}
