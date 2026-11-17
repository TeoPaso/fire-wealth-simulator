import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPlan, type Plan } from '@/lib/engine';
import { BACKUP_KEY_PREFIX, STORAGE_KEY, loadState } from '../persistence';
import { createPlannerStore, type PlannerStore } from '../store';
import { MemoryStorage } from './memoryStorage';

const NOW = new Date('2026-11-17T10:00:00.000Z');

function counterIds() {
  let n = 0;
  return (prefix: string) => `${prefix}-n${++n}`;
}

function setup(storage = new MemoryStorage()): { store: PlannerStore; storage: MemoryStorage } {
  const store = createPlannerStore({ storage, now: () => NOW, newId: counterIds() });
  return { store, storage };
}

function nestedIds(plan: Plan): string[] {
  return [
    ...plan.career.map((c) => c.id),
    ...plan.spending.events.map((e) => e.id),
    ...plan.portfolio.assets.map((a) => a.id),
  ];
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('PlannerStore', () => {
  it('notifies subscribers and exposes immutable snapshots', () => {
    const { store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();
    store.setLang('en');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(before);
    expect(before.ui.lang).toBe('it');
    expect(store.getSnapshot().ui.lang).toBe('en');
    unsubscribe();
    store.setValueMode('nominal');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('debounces saves (250 ms) and flushes on demand', () => {
    const { store, storage } = setup();
    store.setLang('en');
    store.setValueMode('nominal');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    vi.advanceTimersByTime(249);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(storage.writes).toBe(1);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).ui).toEqual({ lang: 'en', valueMode: 'nominal' });

    store.setLang('it');
    store.flush();
    expect(storage.writes).toBe(2);
    vi.advanceTimersByTime(1000);
    expect(storage.writes).toBe(2);
  });

  it('updatePlan works on a clone, stamps updatedAt and keeps the id', () => {
    const { store } = setup();
    const before = store.getSnapshot().plans[0];
    store.updatePlan(before.id, (draft) => {
      draft.spending.monthlyToday = 1800;
      draft.id = 'hijack';
    });
    const after = store.getSnapshot().plans[0];
    expect(after).not.toBe(before);
    expect(before.spending.monthlyToday).toBe(1500);
    expect(after.spending.monthlyToday).toBe(1800);
    expect(after.id).toBe(before.id);
    expect(after.updatedAt).toBe(NOW.toISOString());
    expect(store.getSnapshot().plans[1]).toBe(store.getSnapshot().plans[1]);
  });

  it('an invalid edit (allocations 50%) is persisted and reloaded unchanged', () => {
    const { store, storage } = setup();
    const id = store.getSnapshot().plans[0].id;
    store.updatePlan(id, (draft) => {
      draft.portfolio.assets[0].allocationPct = 25;
      draft.portfolio.assets[1].allocationPct = 25;
    });
    store.flush();
    const reloaded = loadState(storage, { now: () => NOW });
    expect(reloaded.notices).toEqual([]);
    expect(reloaded.state.plans).toEqual(store.getSnapshot().plans);
    expect(reloaded.state.plans[0].portfolio.assets.map((a) => a.allocationPct)).toEqual([25, 25]);
  });

  it('duplicate gives new ids to the plan and every nested entity, remapping holdings', () => {
    const { store } = setup();
    const original = store.getSnapshot().plans[0];
    store.updatePlan(original.id, (d) => {
      d.spending.events.push({ id: 'ev-1', label: 'Casa', age: 35, amountToday: 50000, years: 1 });
    });
    const source = store.getSnapshot().plans[0];
    const newId = store.duplicatePlan(source.id, 'Copia');
    const state = store.getSnapshot();
    const copy = state.plans.find((p) => p.id === newId) as Plan;

    expect(newId).not.toBeNull();
    expect(state.plans[1].id).toBe(newId);
    expect(state.activePlanId).toBe(newId);
    expect(copy.name).toBe('Copia');
    expect(copy.id).not.toBe(source.id);
    const before = nestedIds(source);
    const after = nestedIds(copy);
    expect(after).toHaveLength(before.length);
    for (const id of after) expect(before).not.toContain(id);
    expect(new Set(after).size).toBe(after.length);
    expect(copy.assets.holdings.map((h) => h.assetId)).toEqual(copy.portfolio.assets.map((a) => a.id));
    // Same data otherwise, deep-copied.
    expect(copy.spending).toEqual({ ...source.spending, events: [{ ...source.spending.events[0], id: copy.spending.events[0].id }] });
    copy.portfolio.assets[0].allocationPct = 1;
    expect(store.getSnapshot().plans[0].portfolio.assets[0].allocationPct).toBe(70);
  });

  it('refuses to delete the last plan and moves the active plan to a neighbour', () => {
    const { store } = setup();
    const [a, b, c] = store.getSnapshot().plans.map((p) => p.id);
    store.setActive(b);
    store.toggleCompare(b);
    expect(store.deletePlan(b)).toBe(true);
    expect(store.getSnapshot().activePlanId).toBe(c);
    expect(store.getSnapshot().compareIds).toEqual([]);
    expect(store.deletePlan(c)).toBe(true);
    expect(store.getSnapshot().activePlanId).toBe(a);
    expect(store.deletePlan(a)).toBe(false);
    expect(store.getSnapshot().plans.map((p) => p.id)).toEqual([a]);
    expect(store.deletePlan('missing')).toBe(false);
  });

  it('creates a plan from an example with fresh ids and the given name', () => {
    const { store } = setup();
    const id = store.createPlan({ exampleId: 'example-prudent', name: 'Prudent' });
    const plan = store.getSnapshot().plans.at(-1) as Plan;
    expect(plan.id).toBe(id);
    expect(id).not.toMatch(/^example-/);
    expect(plan.name).toBe('Prudent');
    expect(plan.spending.monthlyToday).toBe(1650);
    expect(store.getSnapshot().activePlanId).toBe(id);
  });

  it('renames, toggles compare and ignores unknown ids', () => {
    const { store } = setup();
    const [a, b] = store.getSnapshot().plans.map((p) => p.id);
    store.renamePlan(a, 'Nuovo nome');
    expect(store.getSnapshot().plans[0].name).toBe('Nuovo nome');
    store.toggleCompare(b);
    store.toggleCompare(a);
    expect(store.getSnapshot().compareIds).toEqual([b, a]);
    store.toggleCompare(b);
    expect(store.getSnapshot().compareIds).toEqual([a]);
    const snapshot = store.getSnapshot();
    store.setActive('nope');
    store.toggleCompare('nope');
    store.updatePlan('nope', () => {});
    expect(store.getSnapshot()).toBe(snapshot);
  });

  it('import adds the plans as NEW plans with fresh ids and never replaces existing ones', () => {
    const { store } = setup();
    const existing = store.getSnapshot().plans;
    const incoming = createDefaultPlan({ id: existing[0].id, name: 'Importato', now: NOW.toISOString() });
    const preview = store.importJson(JSON.stringify({ format: 'fire-planner-italia', version: 2, plans: [incoming] }));
    expect(preview.errors).toEqual([]);
    expect(preview.plans).toHaveLength(1);
    expect(store.getSnapshot().plans).toBe(existing);

    const ids = store.applyImport(preview.plans);
    const state = store.getSnapshot();
    expect(state.plans.slice(0, 3)).toEqual(existing);
    expect(state.plans).toHaveLength(4);
    expect(ids).toHaveLength(1);
    expect(existing.map((p) => p.id)).not.toContain(ids[0]);
    expect(state.plans[3].name).toBe('Importato');
    expect(nestedIds(state.plans[3])).not.toEqual(nestedIds(incoming));
    expect(state.activePlanId).toBe(ids[0]);
    expect(store.getNotices().at(-1)).toMatchObject({ level: 'success', messageKey: 'common.notice.importDone' });
  });

  it('export → import roundtrip reproduces every plan except the ids', () => {
    const { store } = setup();
    store.updatePlan(store.getSnapshot().plans[1].id, (d) => {
      d.notes = 'nota';
      d.portfolio.assets[0].allocationPct = 55; // invalid on purpose: still exported/imported
    });
    const exported = store.exportJson();
    const original = store.getSnapshot().plans;

    const other = setup().store;
    const preview = other.importJson(exported);
    expect(preview.errors).toEqual([]);
    expect(preview.plans).toEqual(original);
    other.applyImport(preview.plans);
    const imported = other.getSnapshot().plans.slice(3);
    const strip = (p: Plan) => ({ ...p, id: '', career: p.career.map((c) => ({ ...c, id: '' })), portfolio: { ...p.portfolio, assets: p.portfolio.assets.map((a) => ({ ...a, id: '' })) }, assets: { ...p.assets, holdings: p.assets.holdings.map((h) => ({ ...h, assetId: '' })) } });
    expect(imported.map(strip)).toEqual(original.map(strip));
  });

  it('import reports parse errors, non-plans, newer versions and accepts arrays / single plans', () => {
    const { store } = setup();
    expect(store.importJson('{oops').errors).toEqual([{ level: 'error', key: 'common.import.error.parse' }]);
    expect(store.importJson('{"hello":1}')).toEqual({
      plans: [],
      errors: [{ level: 'error', key: 'common.import.error.noPlans' }],
    });
    const single = store.importJson(JSON.stringify(createDefaultPlan({ name: 'Solo' })));
    expect(single.plans.map((p) => p.name)).toEqual(['Solo']);
    const mixed = store.importJson(JSON.stringify([{ name: 'A' }, 'x']));
    expect(mixed.plans.map((p) => p.name)).toEqual(['A']);
    expect(mixed.errors).toEqual([{ level: 'warning', key: 'common.import.error.notAPlan', params: { index: 2 } }]);
    const newer = store.importJson(JSON.stringify({ version: 3, plans: [{ name: 'Futuro' }] }));
    expect(newer.plans).toHaveLength(1);
    expect(newer.errors[0]).toMatchObject({ level: 'warning', key: 'common.import.error.newerVersion' });
    expect(store.applyImport([])).toEqual([]);
  });

  it('reset to examples backs up the current state first', () => {
    const { store, storage } = setup();
    store.renamePlan(store.getSnapshot().plans[0].id, 'Mio');
    store.duplicatePlan(store.getSnapshot().plans[0].id);
    store.setLang('en');
    store.resetToExamples();
    const state = store.getSnapshot();
    expect(state.plans.map((p) => p.id)).toEqual(['example-base', 'example-prudent', 'example-optimistic']);
    expect(state.plans.map((p) => p.name)).toEqual(['Base', 'Prudent', 'Optimistic']);
    expect(state.ui.lang).toBe('en');
    const backupKey = storage.keys().find((k) => k.startsWith(BACKUP_KEY_PREFIX)) as string;
    expect(JSON.parse(storage.getItem(backupKey) as string).plans).toHaveLength(4);
    expect(store.getNotices().at(-1)).toMatchObject({ messageKey: 'common.notice.resetDone', params: { key: backupKey } });
  });

  it('save failures raise a single notice that disappears after a successful save', () => {
    const { store, storage } = setup();
    storage.failWrites = true;
    store.setLang('en');
    store.flush();
    store.setLang('it');
    store.flush();
    expect(store.getNotices().filter((n) => n.messageKey === 'common.notice.saveFailed')).toHaveLength(1);
    storage.failWrites = false;
    store.setLang('en');
    store.flush();
    expect(store.getNotices().some((n) => n.messageKey === 'common.notice.saveFailed')).toBe(false);
  });

  it('recovery: writes the examples right after backing up corrupted data, so the backup happens once', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{corrupted');
    const { store } = setup(storage);
    expect(store.getNotices().map((n) => n.messageKey)).toEqual(['common.notice.corrupted']);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).version).toBe(2);
    setup(storage);
    expect(storage.keys().filter((k) => k.startsWith(BACKUP_KEY_PREFIX))).toHaveLength(1);
  });

  it('reload() picks up changes written by another tab', () => {
    const storage = new MemoryStorage();
    const tabA = setup(storage).store;
    const tabB = setup(storage).store;
    tabA.renamePlan(tabA.getSnapshot().plans[0].id, 'Da A');
    tabA.flush();
    const listener = vi.fn();
    tabB.subscribe(listener);
    tabB.reload();
    expect(listener).toHaveBeenCalled();
    expect(tabB.getSnapshot().plans[0].name).toBe('Da A');
  });

  it('notices can be pushed and dismissed', () => {
    const { store } = setup();
    const id = store.pushNotice({ level: 'info', messageKey: 'common.notice.importDone', params: { count: 1 } });
    expect(store.getNotices().map((n) => n.id)).toEqual([id]);
    const notices = store.getNotices();
    store.dismissNotice('unknown');
    expect(store.getNotices()).toBe(notices);
    store.dismissNotice(id);
    expect(store.getNotices()).toEqual([]);
  });
});
