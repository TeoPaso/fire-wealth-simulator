/** Analysis worker logic (shared with the main-thread fallback) and the request gate that drops stale answers. */
import { describe, expect, it } from 'vitest';
import { createDefaultPlan } from '@/lib/engine';
import { analyzePlan, toAnalysisError } from '@/app/workers/analysis';
import { createRequestGate } from '@/app/components/results/useAnalysis';

describe('analyzePlan', () => {
  it('returns Monte Carlo and sensitivity for a valid plan, echoing the id', () => {
    const plan = createDefaultPlan({ startYear: 2026 });
    plan.simulation.monteCarloRuns = 100;
    const response = analyzePlan({ id: 7, plan });
    expect(response.id).toBe(7);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.monteCarlo.runs).toBe(100);
      expect(response.sensitivity.length).toBeGreaterThan(0);
      expect(response.durationMs).toBeGreaterThanOrEqual(0);
      // The response must survive structured cloning (postMessage).
      expect(structuredClone(response)).toEqual(response);
    }
  });

  it('never throws: an invalid plan comes back with its issues', () => {
    const plan = createDefaultPlan({ startYear: 2026 });
    plan.profile.currentAge = 200;
    const response = analyzePlan({ id: 1, plan });
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.name).toBe('PlanValidationError');
      expect(response.error.issues?.some((i) => i.level === 'error')).toBe(true);
    }
  });

  it('serializes unknown errors', () => {
    expect(toAnalysisError(new TypeError('x'))).toEqual({ name: 'TypeError', message: 'x' });
    expect(toAnalysisError('boom')).toEqual({ name: 'Error', message: 'boom' });
  });
});

describe('request gate', () => {
  it('accepts only the latest request', () => {
    const gate = createRequestGate();
    const a = gate.next();
    const b = gate.next();
    expect(gate.isLatest(a)).toBe(false);
    expect(gate.isLatest(b)).toBe(true);
    gate.cancel();
    expect(gate.isLatest(b)).toBe(false);
  });
});
