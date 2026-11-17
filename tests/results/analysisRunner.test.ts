/**
 * The analysis runner cancels outdated Monte Carlo jobs (ROB-04): a burst of edits must not queue full analyses
 * behind each other, and a plan that becomes invalid stops the job in flight.
 */
import { describe, expect, it, vi } from 'vitest';
import { createDefaultPlan } from '@/lib/engine';
import { createAnalysisRunner, type WorkerLike } from '@/app/components/results/analysisRunner';
import type { AnalysisRequest, AnalysisResponse } from '@/app/workers/analysis';

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null;
  onerror: WorkerLike['onerror'] = null;
  posted: AnalysisRequest[] = [];
  terminated = false;
  postMessage(message: unknown) {
    this.posted.push(message as AnalysisRequest);
  }
  terminate() {
    this.terminated = true;
  }
  answer(id: number) {
    const response = { id, ok: false, error: { name: 'E', message: 'x' } } as AnalysisResponse;
    this.onmessage?.({ data: response } as MessageEvent<AnalysisResponse>);
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const onResponse = vi.fn();
  const runOnMainThread = vi.fn();
  const runner = createAnalysisRunner({
    createWorker: () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
    onResponse,
    runOnMainThread,
  });
  return { runner, workers, onResponse, runOnMainThread };
}

const plan = createDefaultPlan();
const request = (id: number): AnalysisRequest => ({ id, plan });

describe('analysis runner', () => {
  it('a new request while one is running terminates the busy worker and runs only the latest', () => {
    const { runner, workers, onResponse } = setup();
    runner.run(request(1));
    runner.run(request(2));
    runner.run(request(3));
    expect(workers).toHaveLength(3);
    expect(workers.slice(0, 2).every((w) => w.terminated)).toBe(true);
    expect(workers[2].terminated).toBe(false);
    expect(workers.map((w) => w.posted.map((r) => r.id))).toEqual([[1], [2], [3]]);
    workers[2].answer(3);
    expect(onResponse).toHaveBeenCalledTimes(1);
    expect(onResponse.mock.calls[0][0].id).toBe(3);
  });

  it('an idle worker is reused (no restart when nothing is running)', () => {
    const { runner, workers } = setup();
    runner.run(request(1));
    workers[0].answer(1);
    runner.run(request(2));
    expect(workers).toHaveLength(1);
    expect(workers[0].posted.map((r) => r.id)).toEqual([1, 2]);
  });

  it('cancel() (plan became invalid) stops the job in flight; late answers are ignored', () => {
    const { runner, workers, onResponse } = setup();
    runner.run(request(1));
    runner.cancel();
    expect(workers[0].terminated).toBe(true);
    workers[0].answer(1);
    expect(onResponse).not.toHaveBeenCalled();
  });

  it('falls back to the main thread when the worker fails, redoing the pending request', () => {
    const { runner, workers, runOnMainThread } = setup();
    runner.run(request(1));
    workers[0].onerror?.({ preventDefault: () => {} } as ErrorEvent);
    expect(runOnMainThread).toHaveBeenCalledWith(request(1));
    runner.run(request(2));
    expect(workers).toHaveLength(1);
    expect(runOnMainThread).toHaveBeenLastCalledWith(request(2));
  });

  it('without Worker support everything runs on the main thread', () => {
    const runOnMainThread = vi.fn();
    const runner = createAnalysisRunner({ createWorker: () => null, onResponse: vi.fn(), runOnMainThread });
    runner.run(request(1));
    expect(runOnMainThread).toHaveBeenCalledWith(request(1));
  });
});
