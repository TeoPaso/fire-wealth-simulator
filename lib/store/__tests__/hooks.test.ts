import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { runPlan, type Plan } from '@/lib/engine';
import { StaticI18nProvider, useFormat, useT } from '@/lib/i18n';
import { StoreProvider, useActivePlan, usePlanResult, usePlannerState, type PlanResultState } from '../hooks';
import { createPlannerStore } from '../store';
import { MemoryStorage } from './memoryStorage';

vi.mock('@/lib/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/engine')>();
  return { ...actual, runPlan: vi.fn(actual.runPlan) };
});

function render(node: ReactNode): string {
  const store = createPlannerStore({ storage: new MemoryStorage(), now: () => new Date('2026-11-17T00:00:00Z') });
  // createElement's typings want `children` in props, but the lint rule wants it as an argument.
  const props = { store } as { store: typeof store; children: ReactNode };
  return renderToString(createElement(StoreProvider, props, node));
}

describe('store hooks', () => {
  it('usePlanResult never throws: engine errors are returned in `error`', () => {
    vi.mocked(runPlan).mockImplementation(() => {
      throw new Error('engine exploded');
    });
    let captured: PlanResultState | undefined;
    function Probe() {
      const plan = useActivePlan();
      captured = usePlanResult(plan);
      return createElement('p', null, plan.name);
    }
    const html = render(createElement(Probe));
    expect(html).toContain('Base');
    expect(captured?.result).toBeNull();
    expect((captured?.error as Error).message).toBe('engine exploded');
  });

  it('usePlanResult returns the engine result when runPlan succeeds', () => {
    const fake = { rows: [], summary: {}, issues: [] } as unknown as ReturnType<typeof runPlan>;
    vi.mocked(runPlan).mockImplementation(() => fake);
    let captured: PlanResultState | undefined;
    function Probe() {
      captured = usePlanResult(useActivePlan());
      return null;
    }
    render(createElement(Probe));
    expect(captured).toEqual({ result: fake, error: null });
  });

  it('usePlannerState selects slices of the state', () => {
    function Probe() {
      const names = usePlannerState((s) => s.plans.map((p: Plan) => p.name).join('|'));
      return createElement('span', null, names);
    }
    expect(render(createElement(Probe))).toContain('Base|Prudente|Ottimista');
  });

  it('i18n hooks translate and format with the provided language', () => {
    function Probe() {
      const t = useT();
      const f = useFormat();
      return createElement('span', null, `${t('common.nav.results')} ${f.eur(1500)}`);
    }
    expect(renderToString(createElement(StaticI18nProvider, { lang: 'en' } as { lang: 'en'; children: ReactNode }, createElement(Probe)))).toContain(
      'Results €1,500',
    );
    expect(renderToString(createElement(Probe)).replace(/\u00a0/g, ' ')).toContain('Risultati 1.500 €');
  });
});
