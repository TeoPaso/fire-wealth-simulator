/**
 * Persistence of the planner state in Web Storage (docs/SPEC.md §6).
 *
 * Guarantees:
 * - user data is never discarded: anything unreadable is copied to `fire-planner:backup:<iso>` before the app
 *   starts from the example plans, and if that copy cannot be written the session becomes read-only;
 * - every stored plan is deep-merged over `createDefaultPlan()` and kept even when invalid; values of a type the UI
 *   cannot show (an object as a plan name…) are converted, after the original data has been backed up;
 * - at most MAX_BACKUPS backups are kept (the oldest is removed before a new one is written);
 * - the legacy v1 key is read (best-effort migration) but never modified.
 */
import { createExamplePlans, migrateV1State, type Plan } from '@/lib/engine';
import { V1_ASSUMED_AGE } from '@/lib/engine/migrate-v1';
import { isLang } from '@/lib/i18n/core';
import {
  STATE_VERSION,
  createDefaultUi,
  isValueMode,
  type NoticeInit,
  type PlannerState,
  type UiPrefs,
} from './state';
import { isPlainObject, normalizePlan, uniqueId, type IdFactory, type MergeReport, randomId } from './plans';

export const STORAGE_KEY = 'fire-planner:v2';
export const LEGACY_V1_KEY = 'fire_wealth_simulator_v1';
export const BACKUP_KEY_PREFIX = 'fire-planner:backup:';

/** Backups kept in storage: writing a new one removes the oldest beyond this number. */
export const MAX_BACKUPS = 5;

/**
 * The subset of the Web Storage API the store needs (an in-memory implementation is used in tests). `key` and
 * `length` are optional: without them backups cannot be listed or pruned.
 */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & Partial<Pick<Storage, 'key' | 'length'>>;

export interface PersistenceOptions {
  now?: () => Date;
  newId?: IdFactory;
}

export type LoadSource = 'stored' | 'legacy' | 'examples' | 'recovered';

export interface LoadResult {
  state: PlannerState;
  notices: NoticeInit[];
  source: LoadSource;
  /** false when saving would overwrite data that could not be backed up (or storage is unavailable). */
  writable: boolean;
  /** true when the loaded state differs from what is stored and should be written right away. */
  shouldSave: boolean;
}

export type SaveResult = { ok: true } | { ok: false; error: unknown };

/** Serialises the persisted part of the state. */
export function serializeState(state: PlannerState): string {
  const { version, plans, activePlanId, compareIds, ui } = state;
  return JSON.stringify({ version, plans, activePlanId, compareIds, ui });
}

export function saveState(storage: StorageLike | null, state: PlannerState): SaveResult {
  if (!storage) return { ok: false, error: new Error('storage unavailable') };
  try {
    storage.setItem(STORAGE_KEY, serializeState(state));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export interface BackupInfo {
  key: string;
  /** ISO timestamp taken from the key (when the backup was written). */
  createdAt: string;
  /** Size of the stored text, characters. */
  size: number;
}

/** Backups in storage, newest first. Empty when the storage cannot enumerate its keys. */
export function listBackups(storage: StorageLike | null): BackupInfo[] {
  if (!storage || typeof storage.key !== 'function' || typeof storage.length !== 'number') return [];
  const out: BackupInfo[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key === null || !key.startsWith(BACKUP_KEY_PREFIX)) continue;
      const value = storage.getItem(key);
      const stamp = key.slice(BACKUP_KEY_PREFIX.length).replace(/-\d+$/, '');
      out.push({ key, createdAt: stamp, size: value?.length ?? 0 });
    }
  } catch {
    return out;
  }
  return out.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

/** Removes the oldest backups so that at most `keep` remain. */
function pruneBackups(storage: StorageLike, keep: number): void {
  for (const backup of listBackups(storage).slice(Math.max(0, keep))) {
    try {
      storage.removeItem(backup.key);
    } catch {
      // Removing is best effort.
    }
  }
}

/**
 * Copies `raw` to a new backup key, first removing the oldest backups beyond MAX_BACKUPS − 1. Returns the key, or
 * null if the write failed.
 */
export function writeBackup(storage: StorageLike, raw: string, now: Date): string | null {
  const base = `${BACKUP_KEY_PREFIX}${now.toISOString()}`;
  try {
    pruneBackups(storage, MAX_BACKUPS - 1);
    let key = base;
    for (let n = 2; storage.getItem(key) !== null; n++) key = `${base}-${n}`;
    storage.setItem(key, raw);
    return key;
  } catch {
    return null;
  }
}

function safeGet(storage: StorageLike, key: string): { ok: true; value: string | null } | { ok: false } {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function readUi(raw: unknown): UiPrefs {
  const ui = createDefaultUi();
  if (isPlainObject(raw)) {
    if (isLang(raw.lang)) ui.lang = raw.lang;
    if (isValueMode(raw.valueMode)) ui.valueMode = raw.valueMode;
  }
  return ui;
}

function examplesState(nowIso: string, ui: UiPrefs = createDefaultUi()): PlannerState {
  const plans = createExamplePlans({ now: nowIso });
  return { version: STATE_VERSION, plans, activePlanId: plans[0].id, compareIds: [], ui };
}

/**
 * Normalises plans (deep merge over the default plan) and guarantees unique string ids. Entries that are not
 * objects cannot be represented as plans and are counted in `dropped` (the caller backs up the raw data first).
 */
export function normalizePlans(
  rawPlans: unknown[],
  nowIso: string,
  newId: IdFactory = randomId,
): { plans: Plan[]; dropped: number; coerced: number } {
  const plans: Plan[] = [];
  const ids = new Set<string>();
  let dropped = 0;
  let coerced = 0;
  for (const raw of rawPlans) {
    const report: MergeReport = { coerced: [] };
    const plan = normalizePlan(raw, { now: nowIso, report, newId });
    if (!plan) {
      dropped++;
      continue;
    }
    coerced += report.coerced.length;
    const rawId = isPlainObject(raw) ? raw.id : undefined;
    if (typeof rawId !== 'string' || rawId === '' || ids.has(rawId)) plan.id = uniqueId('plan', ids, newId);
    ids.add(plan.id);
    plans.push(plan);
  }
  return { plans, dropped, coerced };
}

function buildState(raw: Record<string, unknown>, plans: Plan[]): PlannerState {
  const ids = new Set(plans.map((p) => p.id));
  const activePlanId =
    typeof raw.activePlanId === 'string' && ids.has(raw.activePlanId) ? raw.activePlanId : plans[0].id;
  const compareIds = Array.isArray(raw.compareIds)
    ? [...new Set(raw.compareIds.filter((id): id is string => typeof id === 'string' && ids.has(id)))]
    : [];
  return { version: STATE_VERSION, plans, activePlanId, compareIds, ui: readUi(raw.ui) };
}

/**
 * Loads the planner state. Never throws. Order: v2 key → legacy v1 key (migration) → example plans.
 */
export function loadState(storage: StorageLike | null, opts: PersistenceOptions = {}): LoadResult {
  const now = (opts.now ?? (() => new Date()))();
  const nowIso = now.toISOString();
  const newId = opts.newId ?? randomId;

  if (!storage) {
    return {
      state: examplesState(nowIso),
      notices: [{ id: 'storage-unavailable', level: 'warning', messageKey: 'common.notice.storageUnavailable' }],
      source: 'examples',
      writable: false,
      shouldSave: false,
    };
  }

  const current = safeGet(storage, STORAGE_KEY);
  if (!current.ok) {
    return {
      state: examplesState(nowIso),
      notices: [{ id: 'storage-unavailable', level: 'warning', messageKey: 'common.notice.storageUnavailable' }],
      source: 'examples',
      writable: false,
      shouldSave: false,
    };
  }

  if (current.value !== null) return loadV2(storage, current.value, now, newId);

  const legacy = safeGet(storage, LEGACY_V1_KEY);
  if (legacy.ok && legacy.value !== null) {
    const parsed = parseJson(legacy.value);
    let migrated: Plan[] = [];
    try {
      migrated = migrateV1State(parsed.ok ? parsed.value : legacy.value, { now: nowIso });
    } catch {
      migrated = [];
    }
    const { plans } = normalizePlans(Array.isArray(migrated) ? migrated : [], nowIso, newId);
    if (plans.length > 0) {
      return {
        state: { version: STATE_VERSION, plans, activePlanId: plans[0].id, compareIds: [], ui: createDefaultUi() },
        notices: [{ level: 'info', messageKey: 'common.notice.migrated', params: { count: plans.length, age: V1_ASSUMED_AGE } }],
        source: 'legacy',
        writable: true,
        shouldSave: true,
      };
    }
    return {
      state: examplesState(nowIso),
      notices: [{ level: 'warning', messageKey: 'common.notice.migrationFailed' }],
      source: 'examples',
      writable: true,
      shouldSave: true,
    };
  }

  return { state: examplesState(nowIso), notices: [], source: 'examples', writable: true, shouldSave: false };
}

/** Unreadable stored data: back it up, then start from the examples (read-only if the backup fails). */
function recoverUnreadable(storage: StorageLike, raw: string, now: Date, ui?: UiPrefs): LoadResult {
  const key = writeBackup(storage, raw, now);
  return {
    state: examplesState(now.toISOString(), ui),
    notices:
      key !== null
        ? [{ level: 'warning', messageKey: 'common.notice.corrupted', params: { key } }]
        : [{ level: 'error', messageKey: 'common.notice.backupFailed' }],
    source: 'recovered',
    writable: key !== null,
    shouldSave: key !== null,
  };
}

function loadV2(storage: StorageLike, raw: string, now: Date, newId: IdFactory): LoadResult {
  const nowIso = now.toISOString();
  const parsed = parseJson(raw);
  const usable = parsed.ok && isPlainObject(parsed.value) && Array.isArray(parsed.value.plans);

  if (!usable) {
    return recoverUnreadable(storage, raw, now, parsed.ok && isPlainObject(parsed.value) ? readUi(parsed.value.ui) : undefined);
  }

  const data = parsed.value as Record<string, unknown>;
  let normalized: ReturnType<typeof normalizePlans>;
  try {
    normalized = normalizePlans(data.plans as unknown[], nowIso, newId);
  } catch {
    // Data that cannot even be copied (e.g. nested deeper than structuredClone allows): treat it as unreadable.
    return recoverUnreadable(storage, raw, now, readUi(data.ui));
  }
  const { plans, dropped, coerced } = normalized;
  const notices: NoticeInit[] = [];
  const unknownVersion = data.version !== STATE_VERSION;
  let backupFailed = false;
  if (dropped > 0 || unknownVersion || coerced > 0) {
    const key = writeBackup(storage, raw, now);
    if (key === null) {
      backupFailed = true;
      notices.push({ level: 'error', messageKey: 'common.notice.backupFailed' });
    } else {
      if (unknownVersion) {
        notices.push({
          level: 'warning',
          messageKey: 'common.notice.unknownVersion',
          params: { version: String(data.version), key },
        });
      }
      if (dropped > 0) {
        notices.push({ level: 'warning', messageKey: 'common.notice.droppedEntries', params: { count: dropped, key } });
      }
      if (coerced > 0) {
        notices.push({ level: 'warning', messageKey: 'common.notice.coercedFields', params: { count: coerced, key } });
      }
    }
  }

  if (plans.length === 0) {
    return {
      state: examplesState(nowIso, readUi(data.ui)),
      notices,
      source: 'examples',
      writable: !backupFailed,
      shouldSave: !backupFailed,
    };
  }
  return {
    state: buildState(data, plans),
    notices,
    source: 'stored',
    writable: !backupFailed,
    // Rewrite in the current format once the original has been backed up.
    shouldSave: !backupFailed && (dropped > 0 || unknownVersion || coerced > 0),
  };
}
