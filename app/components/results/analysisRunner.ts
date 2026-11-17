/**
 * Runs analysis requests on a Web Worker, one job at a time, and CANCELS the job in flight when a newer request
 * arrives or the plan becomes invalid (ROB-04): the worker computes one request after the other, so without this a
 * burst of edits would queue full Monte Carlo runs and the latest result would arrive several analyses late.
 * Cancelling = terminating the worker and starting a fresh one (cheap: its script is already cached).
 * Falls back to the main thread when workers are unavailable or fail. Pure (no React) so it can be unit tested with
 * a fake worker.
 */
import type { AnalysisRequest, AnalysisResponse } from '../../workers/analysis';

/** The part of the Worker API the runner uses. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<AnalysisResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface AnalysisRunnerOptions {
  /** Creates a worker, or returns null when workers are unavailable. */
  createWorker: () => WorkerLike | null;
  /** Called with the answer to the latest request only. */
  onResponse: (response: AnalysisResponse, engine: 'worker' | 'main') => void;
  /** Main-thread fallback (should be asynchronous so the UI can paint first). */
  runOnMainThread: (request: AnalysisRequest) => void;
}

export interface AnalysisRunner {
  run(request: AnalysisRequest): void;
  /** Stops the job in flight, if any (its answer will never be delivered). */
  cancel(): void;
  dispose(): void;
  /** Number of workers created so far (for tests and diagnostics). */
  readonly workersCreated: number;
}

export function createAnalysisRunner({ createWorker, onResponse, runOnMainThread }: AnalysisRunnerOptions): AnalysisRunner {
  let worker: WorkerLike | null = null;
  let broken = false;
  let inFlight: AnalysisRequest | null = null;
  let created = 0;

  const stopWorker = () => {
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    worker = null;
  };

  const ensureWorker = (): WorkerLike | null => {
    if (broken) return null;
    if (worker) return worker;
    let next: WorkerLike | null = null;
    try {
      next = createWorker();
    } catch {
      next = null;
    }
    if (!next) {
      broken = true;
      return null;
    }
    created += 1;
    const current = next;
    current.onmessage = (event) => {
      if (worker !== current) return;
      const response = event.data;
      if (!inFlight || response.id !== inFlight.id) return;
      inFlight = null;
      onResponse(response, 'worker');
    };
    current.onerror = (event) => {
      // The worker could not load or crashed: switch to the main thread for good and redo the pending request.
      event.preventDefault?.();
      if (worker !== current) return;
      broken = true;
      stopWorker();
      const pending = inFlight;
      inFlight = null;
      if (pending) runOnMainThread(pending);
    };
    worker = current;
    return current;
  };

  return {
    run(request) {
      // A job still running belongs to an outdated plan: stop it instead of queueing behind it.
      if (inFlight) stopWorker();
      inFlight = null;
      const target = ensureWorker();
      if (target) {
        try {
          inFlight = request;
          target.postMessage(request);
          return;
        } catch {
          inFlight = null;
          broken = true;
          stopWorker();
        }
      }
      runOnMainThread(request);
    },
    cancel() {
      if (inFlight) stopWorker();
      inFlight = null;
    },
    dispose() {
      stopWorker();
      inFlight = null;
    },
    get workersCreated() {
      return created;
    },
  };
}
