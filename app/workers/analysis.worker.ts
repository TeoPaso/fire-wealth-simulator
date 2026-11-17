/// <reference lib="webworker" />
/**
 * Web Worker running Monte Carlo + sensitivity off the main thread (docs/SPEC.md §7). One request at a time:
 * every message carries an `id` that is echoed back, so the page can drop answers to plans that changed since.
 */
import { analyzePlan, type AnalysisRequest } from './analysis';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  ctx.postMessage(analyzePlan(event.data));
};
