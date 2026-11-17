/**
 * PlannerStore: a framework-agnostic external store (use with React's useSyncExternalStore) holding the planner
 * state, transient notices and every action of docs/SPEC.md §6. Writes are debounced and flushed on pagehide.
 */
import { createExamplePlans, migrateV1State, type Plan } from '@/lib/engine';
import { hasMessage, translate, type Lang } from '@/lib/i18n/core';
import {
  STORAGE_KEY,
  loadState,
  normalizePlans,
  saveState,
  serializeState,
  writeBackup,
  type LoadResult,
  type StorageLike,
} from './persistence';
import { isPlainObject, randomId, withFreshIds, type IdFactory } from './plans';
import { STATE_VERSION, type Notice, type NoticeInit, type PlannerState, type ValueMode } from './state';

export const EXPORT_FORMAT = 'fire-planner-italia';
export const DEFAULT_SAVE_DELAY_MS = 250;

export interface ImportMessage {
  level: 'error' | 'warning' | 'info';
  /** i18n key (common.import.*). */
  key: string;
  params?: Record<string, string | number>;
}

/** Result of parsing an import file: the plans that would be added and messages about the file. */
export interface ImportPreview {
  plans: Plan[];
  errors: ImportMessage[];
}

export interface PlannerActions {
  /** Adds a plan copied from an example (default: the first example) and makes it active. Returns its id. */
  createPlan(opts?: { exampleId?: string; name?: string }): string;
  /** Deep copy with new ids (plan + nested), inserted after the original and made active. */
  duplicatePlan(id: string, name?: string): string | null;
  /** Deletes a plan. Refused (returns false) when it is the last one. */
  deletePlan(id: string): boolean;
  renamePlan(id: string, name: string): void;
  /** Applies `recipe` to a structuredClone of the plan and stamps updatedAt. The plan id cannot change. */
  updatePlan(id: string, recipe: (draft: Plan) => void): void;
  setActive(id: string): void;
  toggleCompare(id: string): void;
  /** JSON export of the given plans (default: all). */
  exportJson(ids?: string[]): string;
  /** Parses an export (v2 envelope, state, array, single plan, or a v1 state). Does not change the state. */
  importJson(text: string): ImportPreview;
  /** Adds previewed plans as NEW plans with fresh ids; the first one becomes active. Returns the new ids. */
  applyImport(plans: Plan[]): string[];
  /** Replaces all plans with the examples, after backing up the current state in storage. */
  resetToExamples(): void;
  setLang(lang: Lang): void;
  setValueMode(mode: ValueMode): void;
  pushNotice(notice: NoticeInit): string;
  dismissNotice(id: string): void;
}

export interface PlannerStore extends PlannerActions {
  getSnapshot(): PlannerState;
  getNotices(): readonly Notice[];
  subscribe(listener: () => void): () => void;
  /** Writes pending changes now. */
  flush(): void;
  /** Re-reads the state from storage (used for the multi-tab 'storage' event). */
  reload(): void;
  /** Attaches pagehide / visibilitychange / storage listeners. Returns a cleanup that also flushes. */
  connect(target: Window): () => void;
}

export interface PlannerStoreOptions {
  storage?: StorageLike | null;
  now?: () => Date;
  newId?: IdFactory;
  saveDelayMs?: number;
  /** Pre-loaded state (otherwise `loadState(storage)` runs at creation). */
  initial?: LoadResult;
}

const SAVE_FAILED_ID = 'save-failed';

/** i18n keys naming the example plans (createExamplePlans ids). */
export const EXAMPLE_NAME_KEYS: Record<string, string> = {
  'example-base': 'common.example.base',
  'example-prudent': 'common.example.prudent',
  'example-optimistic': 'common.example.optimistic',
};

/** Example plans named in the given UI language (the engine names them in Italian). */
export function localizedExamples(lang: Lang, nowIso: string): Plan[] {
  return createExamplePlans({ now: nowIso }).map((plan) => {
    const key = EXAMPLE_NAME_KEYS[plan.id];
    return key && hasMessage(lang, key) ? { ...plan, name: translate(lang, key) } : plan;
  });
}

export function createPlannerStore(opts: PlannerStoreOptions = {}): PlannerStore {
  const storage = opts.storage ?? null;
  const now = opts.now ?? (() => new Date());
  const newId = opts.newId ?? randomId;
  const saveDelayMs = opts.saveDelayMs ?? DEFAULT_SAVE_DELAY_MS;
  const nowIso = () => now().toISOString();

  const loaded = opts.initial ?? loadState(storage, { now, newId });
  let state: PlannerState = loaded.state;
  let writable = loaded.writable && storage !== null;
  let notices: readonly Notice[] = [];
  let noticeSeq = 0;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of [...listeners]) listener();
  };

  function addNotice(init: NoticeInit): string {
    const id = init.id ?? `notice-${++noticeSeq}`;
    notices = [...notices.filter((n) => n.id !== id), { ...init, id }];
    return id;
  }

  for (const n of loaded.notices) addNotice(n);

  function writeNow(): void {
    if (!writable || !storage) return;
    const result = saveState(storage, state);
    if (result.ok) {
      if (notices.some((n) => n.id === SAVE_FAILED_ID)) {
        notices = notices.filter((n) => n.id !== SAVE_FAILED_ID);
        emit();
      }
    } else if (!notices.some((n) => n.id === SAVE_FAILED_ID)) {
      addNotice({ id: SAVE_FAILED_ID, level: 'error', messageKey: 'common.notice.saveFailed' });
      emit();
    }
  }

  if (loaded.shouldSave) writeNow();

  function flush(): void {
    if (saveTimer === null) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    writeNow();
  }

  function scheduleSave(): void {
    if (!writable || !storage) return;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      writeNow();
    }, saveDelayMs);
  }

  function setState(next: PlannerState): void {
    state = next;
    scheduleSave();
    emit();
  }

  function planIds(): Set<string> {
    return new Set(state.plans.map((p) => p.id));
  }

  function insertAfter(plans: Plan[], index: number, plan: Plan): Plan[] {
    const copy = plans.slice();
    copy.splice(index + 1, 0, plan);
    return copy;
  }

  const actions: PlannerActions = {
    createPlan({ exampleId, name } = {}) {
      const examples = localizedExamples(state.ui.lang, nowIso());
      const source = examples.find((p) => p.id === exampleId) ?? examples[0];
      const plan = withFreshIds(source, planIds(), newId);
      if (name !== undefined) plan.name = name;
      setState({ ...state, plans: [...state.plans, plan], activePlanId: plan.id });
      return plan.id;
    },

    duplicatePlan(id, name) {
      const index = state.plans.findIndex((p) => p.id === id);
      if (index < 0) return null;
      const plan = withFreshIds(state.plans[index], planIds(), newId);
      const stamp = nowIso();
      plan.createdAt = stamp;
      plan.updatedAt = stamp;
      if (name !== undefined) plan.name = name;
      setState({ ...state, plans: insertAfter(state.plans, index, plan), activePlanId: plan.id });
      return plan.id;
    },

    deletePlan(id) {
      const index = state.plans.findIndex((p) => p.id === id);
      if (index < 0 || state.plans.length <= 1) return false;
      const plans = state.plans.filter((p) => p.id !== id);
      const activePlanId =
        state.activePlanId === id ? plans[Math.min(index, plans.length - 1)].id : state.activePlanId;
      setState({ ...state, plans, activePlanId, compareIds: state.compareIds.filter((c) => c !== id) });
      return true;
    },

    renamePlan(id, name) {
      actions.updatePlan(id, (draft) => {
        draft.name = name;
      });
    },

    updatePlan(id, recipe) {
      const index = state.plans.findIndex((p) => p.id === id);
      if (index < 0) return;
      const draft = structuredClone(state.plans[index]);
      recipe(draft);
      draft.id = id;
      draft.updatedAt = nowIso();
      const plans = state.plans.slice();
      plans[index] = draft;
      setState({ ...state, plans });
    },

    setActive(id) {
      if (id === state.activePlanId || !state.plans.some((p) => p.id === id)) return;
      setState({ ...state, activePlanId: id });
    },

    toggleCompare(id) {
      if (!state.plans.some((p) => p.id === id)) return;
      const compareIds = state.compareIds.includes(id)
        ? state.compareIds.filter((c) => c !== id)
        : [...state.compareIds, id];
      setState({ ...state, compareIds });
    },

    exportJson(ids) {
      const plans = ids ? state.plans.filter((p) => ids.includes(p.id)) : state.plans;
      return JSON.stringify({ format: EXPORT_FORMAT, version: STATE_VERSION, exportedAt: nowIso(), plans }, null, 2);
    },

    importJson(text) {
      return parseImport(text, nowIso(), newId);
    },

    applyImport(plans) {
      if (plans.length === 0) return [];
      const taken = planIds();
      const added = plans.map((p) => {
        const fresh = withFreshIds(p, taken, newId);
        taken.add(fresh.id);
        return fresh;
      });
      state = { ...state, plans: [...state.plans, ...added], activePlanId: added[0].id };
      addNotice({ level: 'success', messageKey: 'common.notice.importDone', params: { count: added.length } });
      scheduleSave();
      emit();
      return added.map((p) => p.id);
    },

    resetToExamples() {
      const backupKey = writable && storage ? writeBackup(storage, serializeState(state), now()) : null;
      const plans = localizedExamples(state.ui.lang, nowIso());
      state = { ...state, plans, activePlanId: plans[0].id, compareIds: [] };
      addNotice(
        backupKey
          ? { level: 'success', messageKey: 'common.notice.resetDone', params: { key: backupKey } }
          : { level: 'success', messageKey: 'common.notice.resetDoneNoBackup' },
      );
      scheduleSave();
      emit();
    },

    setLang(lang) {
      if (lang === state.ui.lang) return;
      setState({ ...state, ui: { ...state.ui, lang } });
    },

    setValueMode(mode) {
      if (mode === state.ui.valueMode) return;
      setState({ ...state, ui: { ...state.ui, valueMode: mode } });
    },

    pushNotice(notice) {
      const id = addNotice(notice);
      emit();
      return id;
    },

    dismissNotice(id) {
      if (!notices.some((n) => n.id === id)) return;
      notices = notices.filter((n) => n.id !== id);
      emit();
    },
  };

  function reload(): void {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const result = loadState(storage, { now, newId });
    state = result.state;
    writable = result.writable && storage !== null;
    for (const n of result.notices) addNotice(n);
    if (result.shouldSave) writeNow();
    emit();
  }

  function connect(target: Window): () => void {
    const onPageHide = () => flush();
    const onVisibility = () => {
      if (target.document.visibilityState === 'hidden') flush();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== (storage as unknown)) return;
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      reload();
    };
    target.addEventListener('pagehide', onPageHide);
    target.document.addEventListener('visibilitychange', onVisibility);
    target.addEventListener('storage', onStorage);
    return () => {
      target.removeEventListener('pagehide', onPageHide);
      target.document.removeEventListener('visibilitychange', onVisibility);
      target.removeEventListener('storage', onStorage);
      flush();
    };
  }

  return {
    ...actions,
    getSnapshot: () => state,
    getNotices: () => notices,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    flush,
    reload,
    connect,
  };
}

function looksLikePlan(value: Record<string, unknown>): boolean {
  return 'schemaVersion' in value || 'profile' in value || 'career' in value;
}

/** Parses an import file into a preview. Exported for tests. */
export function parseImport(text: string, nowIso: string, newId: IdFactory = randomId): ImportPreview {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { plans: [], errors: [{ level: 'error', key: 'common.import.error.parse' }] };
  }

  const errors: ImportMessage[] = [];
  let candidates: unknown[] | null = null;

  if (Array.isArray(data)) {
    candidates = data;
  } else if (isPlainObject(data)) {
    if (Array.isArray(data.plans)) {
      candidates = data.plans;
      if (typeof data.version === 'number' && data.version > STATE_VERSION) {
        errors.push({ level: 'warning', key: 'common.import.error.newerVersion', params: { version: data.version } });
      }
    } else if (Array.isArray(data.scenarios)) {
      let migrated: Plan[] = [];
      try {
        migrated = migrateV1State(data, { now: nowIso });
      } catch {
        migrated = [];
      }
      if (Array.isArray(migrated) && migrated.length > 0) {
        candidates = migrated;
        errors.push({ level: 'info', key: 'common.import.legacyConverted' });
      }
    } else if (looksLikePlan(data)) {
      candidates = [data];
    }
  }

  if (!candidates) return { plans: [], errors: [...errors, { level: 'error', key: 'common.import.error.noPlans' }] };

  candidates.forEach((c, i) => {
    if (!isPlainObject(c)) {
      errors.push({ level: 'warning', key: 'common.import.error.notAPlan', params: { index: i + 1 } });
    } else if (typeof c.schemaVersion === 'number' && c.schemaVersion > STATE_VERSION) {
      errors.push({ level: 'warning', key: 'common.import.error.newerVersion', params: { version: c.schemaVersion } });
    }
  });
  const { plans } = normalizePlans(candidates, nowIso, newId);
  if (plans.length === 0) errors.push({ level: 'error', key: 'common.import.error.noPlans' });
  return { plans, errors: dedupe(errors) };
}

function dedupe(messages: ImportMessage[]): ImportMessage[] {
  const seen = new Set<string>();
  return messages.filter((m) => {
    const id = `${m.key}|${JSON.stringify(m.params ?? {})}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
