/**
 * PlannerStore: a framework-agnostic external store (use with React's useSyncExternalStore) holding the planner
 * state, transient notices and every action of docs/SPEC.md §6. Writes are debounced and flushed on pagehide.
 */
import { createExamplePlans, migrateV1State, type Plan } from '@/lib/engine';
import { V1_ASSUMED_AGE } from '@/lib/engine/migrate-v1';
import { hasMessage, translate, type Lang } from '@/lib/i18n/core';
import {
  BACKUP_KEY_PREFIX,
  STORAGE_KEY,
  listBackups,
  loadState,
  normalizePlans,
  saveState,
  serializeState,
  writeBackup,
  type BackupInfo,
  type LoadResult,
  type StorageLike,
} from './persistence';
import { isPlainObject, randomId, withFreshIds, type IdFactory } from './plans';
import { STATE_VERSION, type Notice, type NoticeInit, type PlannerState, type ValueMode } from './state';

export const EXPORT_FORMAT = 'fire-planner-italia';
export const DEFAULT_SAVE_DELAY_MS = 250;
/** Import limits: files larger than this are refused before parsing (AppMenu), and so are files with more plans. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_PLANS = 100;

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
  /**
   * Replaces all plans with the examples, after backing up the current state in storage. When the backup cannot be
   * written (full quota, storage unavailable) nothing changes and false is returned, unless `force` is set (the UI
   * then offers to export the plans first).
   */
  resetToExamples(opts?: { force?: boolean }): boolean;
  /** Backups written by the store (recovery, reset), newest first. */
  listBackups(): BackupInfo[];
  /** Raw text of a backup (a serialized state), or null. */
  readBackup(key: string): string | null;
  deleteBackup(key: string): void;
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

/** Example texts the engine writes in Italian, with the i18n key of their translation. */
const EXAMPLE_TEXT_KEYS: { get: (p: Plan) => unknown; set: (p: Plan, v: string) => void; key: string }[] = [
  ...['equity-global', 'bond-aggregate'].map((assetId) => ({
    get: (p: Plan) => p.portfolio?.assets?.find((a) => a.id === assetId)?.name,
    set: (p: Plan, v: string) => {
      const asset = p.portfolio.assets.find((a) => a.id === assetId);
      if (asset) asset.name = v;
    },
    key: `common.example.asset.${assetId}`,
  })),
  {
    get: (p: Plan) => p.pensionFund?.name,
    set: (p: Plan, v: string) => {
      p.pensionFund.name = v;
    },
    key: 'common.example.pensionFund',
  },
];

/**
 * Translates the example texts that are still exactly as the examples wrote them (in any language) into `lang`:
 * user-written text is never touched. Returns the same object when nothing changes.
 */
export function localizeExampleTexts(plan: Plan, lang: Lang): Plan {
  const nameKey = EXAMPLE_NAME_KEYS[plan.id];
  const items = [
    ...(nameKey ? [{ get: (p: Plan) => p.name, set: (p: Plan, v: string) => void (p.name = v), key: nameKey }] : []),
    ...EXAMPLE_TEXT_KEYS,
  ];
  let copy: Plan | null = null;
  for (const item of items) {
    if (!hasMessage(lang, item.key)) continue;
    const value = item.get(plan);
    const target = translate(lang, item.key);
    const isDefault = (['it', 'en'] as const).some((l) => hasMessage(l, item.key) && translate(l, item.key) === value);
    if (typeof value === 'string' && value !== target && isDefault) {
      copy ??= structuredClone(plan);
      item.set(copy, target);
    }
  }
  return copy ?? plan;
}

/** Example plans written in the given UI language (the engine writes them in Italian). */
export function localizedExamples(lang: Lang, nowIso: string): Plan[] {
  return createExamplePlans({ now: nowIso }).map((plan) => localizeExampleTexts(plan, lang));
}

/** `name`, or `name (2)`, `name (3)`… when it is already taken. */
export function uniqueName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} (${n})`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Same id, same timestamp and same content: the object from the other tab can be replaced by ours. */
function samePlan(a: Plan, b: Plan): boolean {
  return a.id === b.id && a.updatedAt === b.updatedAt && JSON.stringify(a) === JSON.stringify(b);
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
  // Plans changed (or deleted) in this tab since the last successful write: a reload triggered by another tab
  // re-applies them instead of dropping them (multi-tab lost update).
  const dirtyPlans = new Set<string>();
  const removedPlans = new Set<string>();

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
      dirtyPlans.clear();
      removedPlans.clear();
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

  function planNames(): Set<string> {
    return new Set(state.plans.map((p) => p.name));
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
      plan.name = uniqueName(name ?? plan.name, planNames());
      dirtyPlans.add(plan.id);
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
      plan.name = uniqueName(name ?? plan.name, planNames());
      dirtyPlans.add(plan.id);
      setState({ ...state, plans: insertAfter(state.plans, index, plan), activePlanId: plan.id });
      return plan.id;
    },

    deletePlan(id) {
      const index = state.plans.findIndex((p) => p.id === id);
      if (index < 0 || state.plans.length <= 1) return false;
      const plans = state.plans.filter((p) => p.id !== id);
      const activePlanId =
        state.activePlanId === id ? plans[Math.min(index, plans.length - 1)].id : state.activePlanId;
      dirtyPlans.delete(id);
      removedPlans.add(id);
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
      dirtyPlans.add(id);
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
      const names = planNames();
      const added = plans.map((p) => {
        const fresh = withFreshIds(p, taken, newId);
        fresh.name = uniqueName(typeof fresh.name === 'string' ? fresh.name : String(fresh.name), names);
        taken.add(fresh.id);
        names.add(fresh.name);
        return fresh;
      });
      const next: PlannerState = { ...state, plans: [...state.plans, ...added], activePlanId: added[0].id };
      if (writable && storage) {
        // Write right away: an import that does not fit in the browser storage would leave every later edit unsaved.
        if (!saveState(storage, next).ok) {
          addNotice({ level: 'error', messageKey: 'common.notice.importTooLarge', params: { count: added.length } });
          emit();
          return [];
        }
        if (saveTimer !== null) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        dirtyPlans.clear();
        removedPlans.clear();
        notices = notices.filter((n) => n.id !== SAVE_FAILED_ID);
      }
      state = next;
      addNotice({ level: 'success', messageKey: 'common.notice.importDone', params: { count: added.length } });
      if (!writable || !storage) for (const p of added) dirtyPlans.add(p.id);
      emit();
      return added.map((p) => p.id);
    },

    resetToExamples({ force = false } = {}) {
      const backupKey = writable && storage ? writeBackup(storage, serializeState(state), now()) : null;
      // Never replace the plans without a copy, unless the user chose to (after being offered an export).
      if (backupKey === null && !force) return false;
      const plans = localizedExamples(state.ui.lang, nowIso());
      for (const p of state.plans) removedPlans.add(p.id);
      for (const p of plans) {
        removedPlans.delete(p.id);
        dirtyPlans.add(p.id);
      }
      state = { ...state, plans, activePlanId: plans[0].id, compareIds: [] };
      addNotice(
        backupKey
          ? { level: 'success', messageKey: 'common.notice.resetDone', params: { key: backupKey } }
          : { level: 'success', messageKey: 'common.notice.resetDoneNoBackup' },
      );
      scheduleSave();
      emit();
      return true;
    },

    listBackups() {
      return listBackups(storage);
    },

    readBackup(key) {
      if (!storage || !key.startsWith(BACKUP_KEY_PREFIX)) return null;
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },

    deleteBackup(key) {
      if (!storage || !key.startsWith(BACKUP_KEY_PREFIX)) return;
      try {
        storage.removeItem(key);
      } catch {
        // Nothing to do: the backup stays.
      }
      emit();
    },

    setLang(lang) {
      if (lang === state.ui.lang) return;
      // Example texts still as written by the app follow the language (user-written text never changes).
      const plans = state.plans.map((p) => localizeExampleTexts(p, lang));
      setState({ ...state, plans: plans.some((p, i) => p !== state.plans[i]) ? plans : state.plans, ui: { ...state.ui, lang } });
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

  /**
   * Re-reads the state written by another tab. Plans changed here and not written yet are re-applied on top (the
   * newer updatedAt wins), plans deleted here stay deleted, and the per-tab view (active plan, compared plans,
   * language, value mode) is kept. Plans whose content did not change keep their object identity, so memoised
   * results and the background analysis do not run again.
   */
  function reload(): void {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const result = loadState(storage, { now, newId });
    const local = state;
    const localById = new Map(local.plans.map((p) => [p.id, p]));
    let plans = result.state.plans.map((p) => {
      const mine = localById.get(p.id);
      return mine && samePlan(mine, p) ? mine : p;
    });
    const reapply = dirtyPlans.size > 0 || removedPlans.size > 0;
    if (reapply) {
      plans = plans.filter((p) => !removedPlans.has(p.id));
      for (const id of dirtyPlans) {
        const mine = localById.get(id);
        if (!mine) continue;
        const i = plans.findIndex((p) => p.id === id);
        if (i < 0) plans.push(mine);
        else if (mine.updatedAt >= plans[i].updatedAt) plans[i] = mine;
      }
      if (plans.length === 0) plans = local.plans;
    }
    const ids = new Set(plans.map((p) => p.id));
    const activePlanId = ids.has(local.activePlanId)
      ? local.activePlanId
      : ids.has(result.state.activePlanId)
        ? result.state.activePlanId
        : plans[0].id;
    const unchanged =
      plans.length === local.plans.length && plans.every((p, i) => p === local.plans[i]) && activePlanId === local.activePlanId;
    state = unchanged
      ? local
      : { ...result.state, plans, activePlanId, compareIds: local.compareIds.filter((id) => ids.has(id)), ui: local.ui };
    writable = result.writable && storage !== null;
    for (const n of result.notices) addNotice(n);
    if (reapply || result.shouldSave) writeNow();
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

/** Parses an import file into a preview. Never throws. Exported for tests. */
export function parseImport(text: string, nowIso: string, newId: IdFactory = randomId): ImportPreview {
  try {
    return parseImportUnsafe(text, nowIso, newId);
  } catch {
    // e.g. JSON nested deeper than structuredClone (or the JSON parser) allows.
    return { plans: [], errors: [{ level: 'error', key: 'common.import.error.tooComplex' }] };
  }
}

function parseImportUnsafe(text: string, nowIso: string, newId: IdFactory): ImportPreview {
  if (text.length > MAX_IMPORT_BYTES) {
    return { plans: [], errors: [{ level: 'error', key: 'common.import.error.tooLarge', params: { max: MAX_IMPORT_BYTES / 1024 / 1024 } }] };
  }
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
        errors.push({ level: 'info', key: 'common.import.legacyConverted', params: { age: V1_ASSUMED_AGE } });
      }
    } else if (looksLikePlan(data)) {
      candidates = [data];
    }
  }

  if (!candidates) return { plans: [], errors: [...errors, { level: 'error', key: 'common.import.error.noPlans' }] };
  if (candidates.length > MAX_IMPORT_PLANS) {
    return {
      plans: [],
      errors: [...errors, { level: 'error', key: 'common.import.error.tooManyPlans', params: { count: candidates.length, max: MAX_IMPORT_PLANS } }],
    };
  }

  candidates.forEach((c, i) => {
    if (!isPlainObject(c)) {
      errors.push({ level: 'warning', key: 'common.import.error.notAPlan', params: { index: i + 1 } });
    } else if (typeof c.schemaVersion === 'number' && c.schemaVersion > STATE_VERSION) {
      errors.push({ level: 'warning', key: 'common.import.error.newerVersion', params: { version: c.schemaVersion } });
    }
  });
  const { plans, coerced } = normalizePlans(candidates, nowIso, newId);
  if (coerced > 0) errors.push({ level: 'warning', key: 'common.import.coercedFields', params: { count: coerced } });
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
