'use client';

/**
 * React bindings for the planner store. Components read state with selectors and never touch storage directly.
 */
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { runPlan, validatePlan, type Issue, type Plan, type PlanResult } from '@/lib/engine';
import { STORAGE_KEY, type StorageLike } from './persistence';
import { selectActivePlan, type Notice, type PlannerState, type UiPrefs } from './state';
import { createPlannerStore, type PlannerActions, type PlannerStore } from './store';

const StoreContext = createContext<PlannerStore | null>(null);

/** Returns window.localStorage if it can be read, otherwise null (blocked storage, sandboxed iframes…). */
export function getBrowserStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    storage.getItem(STORAGE_KEY);
    return storage;
  } catch {
    return null;
  }
}

let browserStore: PlannerStore | null = null;
/** The app-wide store backed by localStorage, created once per page (StrictMode-safe). */
export function getBrowserStore(): PlannerStore {
  browserStore ??= createPlannerStore({ storage: getBrowserStorage() });
  return browserStore;
}

/** Provides the planner store (default: the localStorage-backed browser store) and wires window listeners. */
export function StoreProvider({ store, children }: { store?: PlannerStore; children: ReactNode }) {
  const value = useMemo(() => store ?? getBrowserStore(), [store]);
  useEffect(() => value.connect(window), [value]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** The store instance (for advanced use; prefer the hooks below). */
export function usePlannerStore(): PlannerStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('usePlannerStore must be used inside <StoreProvider>');
  return store;
}

/** Object.is on arrays' items: handy as `isEqual` for selectors that build arrays. */
export function shallowEqualArray<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}

/** Builds a memoised snapshot getter: recomputes only when the state changes, keeps equal selections stable. */
function createSelectionGetter<T>(
  store: PlannerStore,
  selector: (state: PlannerState) => T,
  isEqual: (a: T, b: T) => boolean,
): () => T {
  let memo: { state: PlannerState; value: T } | null = null;
  return () => {
    const state = store.getSnapshot();
    if (memo && memo.state === state) return memo.value;
    const next = selector(state);
    const value = memo && isEqual(memo.value, next) ? memo.value : next;
    memo = { state, value };
    return value;
  };
}

/**
 * Subscribes to a slice of the planner state. The selection is recomputed only when the state changes; pass
 * `isEqual` (e.g. shallowEqualArray) when the selector builds new objects/arrays. Prefer selectors defined outside
 * the component (or memoised) so the memo survives re-renders.
 */
export function usePlannerState<T>(
  selector: (state: PlannerState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const store = usePlannerStore();
  const getSelection = useMemo(() => createSelectionGetter(store, selector, isEqual), [store, selector, isEqual]);
  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}

/** The active plan (falls back to the first plan). */
export function useActivePlan(): Plan {
  return usePlannerState(selectActivePlan);
}

const selectUi = (s: PlannerState): UiPrefs => s.ui;
/** UI preferences: language and value mode ('real' | 'nominal'). */
export function useUiPrefs(): UiPrefs {
  return usePlannerState(selectUi);
}

/** Every store action (stable reference). */
export function usePlanActions(): PlannerActions {
  return usePlannerStore();
}

/** Memoised validatePlan(plan). */
export function usePlanValidation(plan: Plan): Issue[] {
  return useMemo(() => validatePlan(plan), [plan]);
}

export interface PlanResultState {
  result: PlanResult | null;
  /** PlanValidationError when the plan has errors, or any engine error. Null on success. */
  error: unknown;
}

/** Memoised runPlan(plan). Never throws: errors are returned in `error`. */
export function usePlanResult(plan: Plan): PlanResultState {
  return useMemo(() => {
    try {
      return { result: runPlan(plan), error: null };
    } catch (error) {
      return { result: null, error };
    }
  }, [plan]);
}

/** Transient notices for the banner area, plus `dismiss(id)`. */
export function useNotices(): { notices: readonly Notice[]; dismiss: (id: string) => void } {
  const store = usePlannerStore();
  const notices = useSyncExternalStore(store.subscribe, store.getNotices, store.getNotices);
  return { notices, dismiss: store.dismissNotice };
}
