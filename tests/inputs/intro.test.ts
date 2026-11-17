/** First-run guidance (UX-03): the four essential inputs of an example plan tick off as they are changed. */
import { describe, expect, it } from 'vitest';
import { createExamplePlans } from '@/lib/engine';
import { essentialSteps } from '@/app/components/inputs/PlanIntro';
import { MESSAGES } from '@/lib/i18n/core';

describe('essential steps of an example plan', () => {
  const [example] = createExamplePlans();

  it('start all to do, point at real fields and have messages', () => {
    const steps = essentialSteps(example, example);
    expect(steps.map((s) => s.path)).toEqual(['profile.currentAge', 'career[0].ralToday', 'spending.monthlyToday', 'assets.cash']);
    expect(steps.every((s) => !s.done)).toBe(true);
    for (const s of steps) expect(MESSAGES.it[s.key] && MESSAGES.en[s.key]).toBeTruthy();
  });

  it('tick off when the value differs from the example', () => {
    const mine = structuredClone(example);
    mine.profile.currentAge = 38;
    mine.spending.monthlyToday = 2100;
    mine.assets.holdings[0].value = 50_000;
    expect(essentialSteps(mine, example).map((s) => s.done)).toEqual([true, false, true, true]);
  });
});
