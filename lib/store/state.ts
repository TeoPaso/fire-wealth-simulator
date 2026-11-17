/**
 * Planner state v2 (docs/SPEC.md §6). Plans are stored exactly as the user left them — including invalid
 * drafts — and are only validated by the engine.
 */
import { createExamplePlans, type Plan } from '@/lib/engine';
import { DEFAULT_LANG, type Lang } from '@/lib/i18n/core';

export const STATE_VERSION = 2 as const;

export type ValueMode = 'real' | 'nominal';

export interface UiPrefs {
  lang: Lang;
  /** 'real' = today's € (nominal / priceIndex), 'nominal' = current euros of each year. */
  valueMode: ValueMode;
}

export interface PlannerState {
  version: typeof STATE_VERSION;
  plans: Plan[];
  activePlanId: string;
  /** Plans selected for the "Confronto" tab, in selection order. */
  compareIds: string[];
  ui: UiPrefs;
}

export type NoticeLevel = 'info' | 'warning' | 'error' | 'success';

/** A transient, non-persisted message for the shell's banner area. Text comes from i18n (`messageKey`). */
export interface Notice {
  id: string;
  level: NoticeLevel;
  messageKey: string;
  params?: Record<string, string | number>;
}

export type NoticeInit = Omit<Notice, 'id'> & { id?: string };

export function isValueMode(value: unknown): value is ValueMode {
  return value === 'real' || value === 'nominal';
}

export function createDefaultUi(): UiPrefs {
  return { lang: DEFAULT_LANG, valueMode: 'real' };
}

/** Fresh state with the example plans (createExamplePlans) and the first one active. */
export function createDefaultState(opts: { now?: string; ui?: UiPrefs } = {}): PlannerState {
  const plans = createExamplePlans({ now: opts.now });
  return {
    version: STATE_VERSION,
    plans,
    activePlanId: plans[0].id,
    compareIds: [],
    ui: opts.ui ? { ...opts.ui } : createDefaultUi(),
  };
}

/** The active plan, falling back to the first plan if the id is stale. */
export function selectActivePlan(state: PlannerState): Plan {
  return state.plans.find((p) => p.id === state.activePlanId) ?? state.plans[0];
}
