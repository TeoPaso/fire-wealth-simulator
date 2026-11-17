import { describe, expect, it } from 'vitest';
import { createDefaultPlan, createExamplePlans } from '../defaults';
import { IT_2026 } from '../rules/it2026';

describe('contract', () => {
  it('default plan allocations sum to 100', () => {
    const plan = createDefaultPlan({ startYear: 2026, now: '2026-01-01T00:00:00.000Z' });
    expect(plan.portfolio.assets.reduce((s, a) => s + a.allocationPct, 0)).toBe(100);
    expect(plan.taxRules).not.toBe(IT_2026);
    expect(createExamplePlans({ startYear: 2026 }).map((p) => p.id)).toEqual(['example-base', 'example-prudent', 'example-optimistic']);
  });
});
