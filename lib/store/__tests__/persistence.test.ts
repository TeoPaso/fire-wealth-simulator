import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPlan, createExamplePlans, migrateV1State } from '@/lib/engine';
import {
  BACKUP_KEY_PREFIX,
  LEGACY_V1_KEY,
  STORAGE_KEY,
  loadState,
  saveState,
  serializeState,
} from '../persistence';
import { deepMerge } from '../plans';
import { createDefaultState } from '../state';
import { MemoryStorage } from './memoryStorage';

vi.mock('@/lib/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/engine')>();
  return { ...actual, migrateV1State: vi.fn(actual.migrateV1State) };
});

afterEach(() => {
  vi.mocked(migrateV1State).mockClear();
});

const NOW = new Date('2026-11-17T10:00:00.000Z');
const opts = { now: () => NOW };

function backupKeys(storage: MemoryStorage): string[] {
  return storage.keys().filter((k) => k.startsWith(BACKUP_KEY_PREFIX));
}

describe('loadState', () => {
  it('starts from the example plans when storage is empty', () => {
    const storage = new MemoryStorage();
    const result = loadState(storage, opts);
    expect(result.source).toBe('examples');
    expect(result.state.plans.map((p) => p.id)).toEqual(createExamplePlans().map((p) => p.id));
    expect(result.state.activePlanId).toBe('example-base');
    expect(result.state.ui).toEqual({ lang: 'it', valueMode: 'real' });
    expect(result.notices).toEqual([]);
  });

  it('corrupted JSON: copies the raw text to a backup key, loads the examples and raises a notice', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{"version":2,"plans":[{"id":"mine"');
    const result = loadState(storage, opts);

    const backups = backupKeys(storage);
    expect(backups).toEqual([`${BACKUP_KEY_PREFIX}${NOW.toISOString()}`]);
    expect(storage.getItem(backups[0])).toBe('{"version":2,"plans":[{"id":"mine"');
    expect(result.source).toBe('recovered');
    expect(result.state.plans.map((p) => p.id)).toEqual(['example-base', 'example-prudent', 'example-optimistic']);
    expect(result.notices).toEqual([
      { level: 'warning', messageKey: 'common.notice.corrupted', params: { key: backups[0] } },
    ]);
    expect(result.writable).toBe(true);
    expect(result.shouldSave).toBe(true);
  });

  it('valid JSON with the wrong shape is backed up too', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '"hello"');
    const result = loadState(storage, opts);
    expect(backupKeys(storage)).toHaveLength(1);
    expect(result.notices[0].messageKey).toBe('common.notice.corrupted');
  });

  it('becomes read-only when the backup of unreadable data cannot be written', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, 'not json');
    storage.failWrites = true;
    const result = loadState(storage, opts);
    expect(result.writable).toBe(false);
    expect(result.shouldSave).toBe(false);
    expect(result.notices[0].messageKey).toBe('common.notice.backupFailed');
    expect(storage.getItem(STORAGE_KEY)).toBe('not json');
  });

  it('keeps an invalid plan (allocations summing to 50%) exactly as saved', () => {
    const storage = new MemoryStorage();
    const state = createDefaultState({ now: NOW.toISOString() });
    state.plans[0].portfolio.assets[0].allocationPct = 20;
    state.plans[0].portfolio.assets[1].allocationPct = 30;
    state.plans[1].profile.currentAge = -5;
    expect(saveState(storage, state)).toEqual({ ok: true });

    const result = loadState(storage, opts);
    expect(result.source).toBe('stored');
    expect(result.notices).toEqual([]);
    expect(result.shouldSave).toBe(false);
    expect(result.state).toEqual(state);
    expect(result.state.plans[0].portfolio.assets.map((a) => a.allocationPct)).toEqual([20, 30]);
    expect(serializeState(result.state)).toBe(storage.getItem(STORAGE_KEY));
  });

  it('deep-merges a partial old plan over the default plan without touching existing values', () => {
    const storage = new MemoryStorage();
    const partial = {
      id: 'old-plan',
      name: 'Vecchio piano',
      profile: { currentAge: 41 },
      spending: { monthlyToday: 2100 },
      portfolio: { assets: [{ id: 'x', name: 'Solo azioni', kind: 'equity', allocationPct: 100 }] },
      futureField: { keep: true },
    };
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, plans: [partial], activePlanId: 'old-plan' }));
    const result = loadState(storage, opts);
    const plan = result.state.plans[0];
    const defaults = createDefaultPlan();

    expect(result.state.plans).toHaveLength(1);
    expect(plan.id).toBe('old-plan');
    expect(plan.name).toBe('Vecchio piano');
    expect(plan.profile.currentAge).toBe(41);
    expect(plan.profile.lifeExpectancy).toBe(defaults.profile.lifeExpectancy);
    expect(plan.spending.monthlyToday).toBe(2100);
    expect(plan.spending.retirementPct).toBe(defaults.spending.retirementPct);
    expect(plan.spending.events).toEqual([]);
    // Arrays are replaced as a whole (not merged element by element).
    expect(plan.portfolio.assets).toEqual(partial.portfolio.assets);
    expect(plan.pensionFund).toEqual(defaults.pensionFund);
    expect(plan.taxRules.irpef.brackets).toEqual(defaults.taxRules.irpef.brackets);
    expect((plan as unknown as { futureField: unknown }).futureField).toEqual({ keep: true });
    expect(result.state.activePlanId).toBe('old-plan');
  });

  it('assigns ids to plans without one and de-duplicates ids, never dropping plans', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, plans: [{ name: 'A' }, { id: 'dup', name: 'B' }, { id: 'dup', name: 'C' }] }),
    );
    const { state } = loadState(storage, opts);
    expect(state.plans.map((p) => p.name)).toEqual(['A', 'B', 'C']);
    expect(new Set(state.plans.map((p) => p.id)).size).toBe(3);
    expect(state.plans[1].id).toBe('dup');
  });

  it('backs up the raw data before ignoring entries that are not plans', () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ version: 2, plans: [null, { id: 'p', name: 'P' }, 42] });
    storage.setItem(STORAGE_KEY, raw);
    const result = loadState(storage, opts);
    expect(result.state.plans.map((p) => p.id)).toEqual(['p']);
    const [backup] = backupKeys(storage);
    expect(storage.getItem(backup)).toBe(raw);
    expect(result.notices).toEqual([
      { level: 'warning', messageKey: 'common.notice.droppedEntries', params: { count: 2, key: backup } },
    ]);
  });

  it('sanitises only store metadata: unknown active id, stale compare ids, bad ui values', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        plans: [{ id: 'a' }, { id: 'b' }],
        activePlanId: 'zzz',
        compareIds: ['b', 'gone', 'b', 3],
        ui: { lang: 'fr', valueMode: 'nominal' },
      }),
    );
    const { state } = loadState(storage, opts);
    expect(state.activePlanId).toBe('a');
    expect(state.compareIds).toEqual(['b']);
    expect(state.ui).toEqual({ lang: 'it', valueMode: 'nominal' });
  });

  it('legacy v1 data: falls back to the examples with a notice while the migration returns nothing', () => {
    const storage = new MemoryStorage();
    const legacy = JSON.stringify({ version: 1, scenarios: [{ id: 's1', name: 'Old' }], activeScenarioId: 's1' });
    storage.setItem(LEGACY_V1_KEY, legacy);
    vi.mocked(migrateV1State).mockReturnValueOnce([]);
    const result = loadState(storage, opts);
    expect(result.state.plans.map((p) => p.id)).toEqual(['example-base', 'example-prudent', 'example-optimistic']);
    expect(result.notices.map((n) => n.messageKey)).toEqual(['common.notice.migrationFailed']);
    expect(storage.getItem(LEGACY_V1_KEY)).toBe(legacy);
  });

  it('legacy v1 data: uses the migrated plans when the migration succeeds', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V1_KEY, JSON.stringify({ version: 1, scenarios: [] }));
    const migrated = createDefaultPlan({ id: 'migrated-1', name: 'Da v1' });
    vi.mocked(migrateV1State).mockReturnValueOnce([migrated]);
    const result = loadState(storage, opts);
    expect(migrateV1State).toHaveBeenCalledWith({ version: 1, scenarios: [] }, { now: NOW.toISOString() });
    expect(result.source).toBe('legacy');
    expect(result.state.plans.map((p) => p.id)).toEqual(['migrated-1']);
    expect(result.notices).toEqual([{ level: 'info', messageKey: 'common.notice.migrated', params: { count: 1, age: 30 } }]);
    expect(result.shouldSave).toBe(true);
  });

  it('legacy v1 data: a throwing migration never breaks loading', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V1_KEY, '{broken');
    vi.mocked(migrateV1State).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const result = loadState(storage, opts);
    expect(migrateV1State).toHaveBeenCalledWith('{broken', { now: NOW.toISOString() });
    expect(result.notices.map((n) => n.messageKey)).toEqual(['common.notice.migrationFailed']);
    expect(result.state.plans).toHaveLength(3);
  });

  it('works without storage (blocked): examples, read-only, notice', () => {
    const result = loadState(null, opts);
    expect(result.writable).toBe(false);
    expect(result.notices[0].messageKey).toBe('common.notice.storageUnavailable');
  });
});

describe('deepMerge', () => {
  it('merges objects, replaces arrays, keeps invalid primitives and fills missing objects', () => {
    const base = { a: 1, nested: { x: 1, y: 2 }, list: [1, 2, 3], obj: { k: 1 } };
    const merged = deepMerge(base, { a: 'oops', nested: { y: 5 }, list: [9], obj: null, extra: 'kept' });
    expect(merged).toEqual({ a: 'oops', nested: { x: 1, y: 5 }, list: [9], obj: { k: 1 }, extra: 'kept' });
    expect(base).toEqual({ a: 1, nested: { x: 1, y: 2 }, list: [1, 2, 3], obj: { k: 1 } });
  });
});
