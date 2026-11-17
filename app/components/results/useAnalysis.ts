'use client';

/**
 * Monte Carlo + sensitivity for the active plan, computed in a Web Worker (docs/SPEC.md §7):
 * - debounced (ANALYSIS_DEBOUNCE_MS) after every plan change;
 * - every request has an id; answers to older requests are ignored (the plan changed meanwhile);
 * - falls back to the main thread when Worker is unavailable or the worker fails to load;
 * - while a new result is computed, the previous one stays available and is flagged `stale` (same plan) so the
 *   charts keep their frame instead of flashing a skeleton.
 */
import { useEffect, useRef, useState } from 'react';
import type { Plan } from '@/lib/engine';
import { analyzePlan, type AnalysisError, type AnalysisRequest, type AnalysisResponse, type AnalysisResult } from '../../workers/analysis';

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

type WorkerSlot = { worker: Worker | null; broken: boolean };

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('../../workers/analysis.worker.ts', import.meta.url));
  } catch {
    return null;
  }
}

/** Runs the analysis of `plan` (only when `enabled`, i.e. the plan has no validation errors). */
export function useAnalysis(plan: Plan, enabled: boolean): AnalysisView {
  const [state, setState] = useState<AnalysisState>({ plan: null, result: null, error: null, engine: null });
  const gate = useRef(createRequestGate());
  const slot = useRef<WorkerSlot>({ worker: null, broken: false });
  const pending = useRef<AnalysisRequest | null>(null);

  const accept = (response: AnalysisResponse, engine: 'worker' | 'main') => {
    const request = pending.current;
    if (!gate.current.isLatest(response.id) || !request || request.id !== response.id) return;
    pending.current = null;
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

  const runOnMainThread = (request: AnalysisRequest) => {
    // Yield first so the "calcolo in corso" indicator can paint before the main thread is busy.
    window.setTimeout(() => {
      if (gate.current.isLatest(request.id)) acceptRef.current(analyzePlan(request), 'main');
    }, 30);
  };
  const runOnMainThreadRef = useRef(runOnMainThread);

  // One worker per mounted panel.
  useEffect(() => {
    const current: WorkerSlot = { worker: createWorker(), broken: false };
    slot.current = current;
    const worker = current.worker;
    if (worker) {
      worker.onmessage = (event: MessageEvent<AnalysisResponse>) => acceptRef.current(event.data, 'worker');
      worker.onerror = (event) => {
        // The worker could not load or crashed: switch to the main thread and redo the pending request.
        event.preventDefault();
        current.broken = true;
        worker.terminate();
        if (pending.current) runOnMainThreadRef.current(pending.current);
      };
    }
    return () => {
      worker?.terminate();
      current.worker = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      gate.current.cancel();
      pending.current = null;
      return;
    }
    const timer = window.setTimeout(() => {
      const request: AnalysisRequest = { id: gate.current.next(), plan };
      pending.current = request;
      const { worker, broken } = slot.current;
      if (worker && !broken) {
        try {
          worker.postMessage(request);
          return;
        } catch {
          slot.current.broken = true;
        }
      }
      runOnMainThreadRef.current(request);
    }, ANALYSIS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [plan, enabled]);

  const samePlanId = state.plan !== null && state.plan.id === plan.id;
  return {
    ...state,
    // Derived: a result for this exact plan object has not arrived yet.
    running: enabled && state.plan !== plan,
    available: enabled && samePlanId && (state.result !== null || state.error !== null),
    stale: enabled && samePlanId && state.plan !== plan,
  };
}
