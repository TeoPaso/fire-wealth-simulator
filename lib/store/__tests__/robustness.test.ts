/**
 * Robustness of the store against odd stored/imported data, full storage and several tabs (review findings
 * ROB-01, ROB-03, ROB-05, ROB-11, ROB-12, UX-20, UX-22).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPlan, createExamplePlans, type Plan } from '@/lib/engine';
import { BACKUP_KEY_PREFIX, MAX_BACKUPS, STORAGE_KEY, listBackups, loadState, writeBackup } from '../persistence';
import { normalizePlan, type MergeReport } from '../plans';
import { MAX_IMPORT_PLANS, createPlannerStore, localizedExamples, parseImport, type PlannerStore } from '../store';
import { MemoryStorage } from './memoryStorage';

const NOW = new Date('2026-11-17T10:00:00.000Z');
const NOW_ISO = NOW.toISOString();

function counterIds() {
  let n = 0;
  return (prefix: string) => `${prefix}-n${++n}`;
}

function setup(storage = new MemoryStorage()): { store: PlannerStore; storage: MemoryStorage } {
  const store = createPlannerStore({ storage, now: () => NOW, newId: counterIds() });
  return { store, storage };
}

function backupKeys(storage: MemoryStorage): string[] {
  return storage.keys().filter((k) => k.startsWith(BACKUP_KEY_PREFIX));
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('text fields only ever hold text (ROB-01)', () => {
  it('converts numbers to text and replaces objects with the default, reporting each path', () => {
    const report: MergeReport = { coerced: [] };
    const plan = normalizePlan(
      {
        name: { x: 1 },
        notes: 42,
        career: [{ id: 'c1', label: {}, untilAge: 40 }, null, 7],
        spending: { events: [{ id: 'e1', label: { z: 1 }, age: 40, amountToday: 1000, years: 1 }] },
        portfolio: { assets: [{ id: 'a1', name: {}, allocationPct: 100 }] },
        assets: { holdings: [{ assetId: 5, value: 10, costBasis: 10 }] },
        pensionFund: { name: ['x'] },
        profile: { currentAge: { bad: true } },
      },
      { now: NOW_ISO, report },
    ) as Plan;
    const defaults = createDefaultPlan();
    expect(plan.name).toBe(defaults.name);
    expect(plan.notes).toBe('42');
    expect(plan.career).toHaveLength(1);
    expect(plan.career[0]).toEqual({ id: 'c1', label: '', untilAge: 40 });
    expect(plan.spending.events[0].label).toBe('');
    expect(plan.portfolio.assets[0].name).toBe('');
    expect(plan.assets.holdings[0].assetId).toBe('5');
    expect(plan.pensionFund.name).toBe(defaults.pensionFund.name);
    expect(plan.profile.currentAge).toBe(defaults.profile.currentAge);
    expect(report.coerced.sort()).toEqual(
      [
        'name',
        'notes',
        'career[0].label',
        'career[1]',
        'career[2]',
        'spending.events[0].label',
        'portfolio.assets[0].name',
        'assets.holdings[0].assetId',
        'pensionFund.name',
        'profile.currentAge',
      ].sort(),
    );
  });

  it('keeps valid data untouched, including null bounds in tax rules and invalid numbers', () => {
    const report: MergeReport = { coerced: [] };
    const original = createDefaultPlan({ now: NOW_ISO });
    original.taxRules.sources[0].label = 99 as unknown as string;
    original.profile.lifeExpectancy = 'novanta' as unknown as number;
    const plan = normalizePlan(JSON.parse(JSON.stringify(original)), { now: NOW_ISO, report }) as Plan;
    expect(plan.taxRules.irpef.brackets).toEqual(original.taxRules.irpef.brackets);
    expect(plan.taxRules.irpef.brackets.at(-1)?.upTo).toBeNull();
    expect(plan.taxRules.sources[0].label).toBe('99');
    expect(plan.profile.lifeExpectancy).toBe('novanta'); // invalid numbers stay: validation reports them
    expect(report.coerced).toEqual(['taxRules.sources[0].label']);
  });

  it('gives missing or duplicate nested ids a fresh unique id', () => {
    const plan = normalizePlan(
      { career: [{ untilAge: 40 }, { id: 'x', untilAge: 50 }, { id: 'x', untilAge: 67 }] },
      { now: NOW_ISO, newId: counterIds() },
    ) as Plan;
    const ids = plan.career.map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[1]).toBe('x');
    expect(ids.every((id) => typeof id === 'string' && id !== '')).toBe(true);
  });

  it('a stored plan with an object as its name loads, is backed up first and is reported', () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ version: 2, plans: [{ id: 'p1', name: { x: 1 } }], activePlanId: 'p1' });
    storage.setItem(STORAGE_KEY, raw);
    const result = loadState(storage, { now: () => NOW });
    expect(typeof result.state.plans[0].name).toBe('string');
    const [backup] = backupKeys(storage);
    expect(storage.getItem(backup)).toBe(raw);
    expect(result.notices).toEqual([
      { level: 'warning', messageKey: 'common.notice.coercedFields', params: { count: 1, key: backup } },
    ]);
    expect(result.shouldSave).toBe(true);
    expect(result.writable).toBe(true);
  });

  it('an import with odd text fields is accepted as text, with a warning', () => {
    const preview = parseImport(JSON.stringify({ plans: [{ name: 42 }, { name: { x: 1 } }] }), NOW_ISO, counterIds());
    expect(preview.plans.map((p) => typeof p.name)).toEqual(['string', 'string']);
    expect(preview.plans[0].name).toBe('42');
    expect(preview.errors).toEqual([{ level: 'warning', key: 'common.import.coercedFields', params: { count: 2 } }]);
  });
});

describe('import limits and failures (ROB-11)', () => {
  it('never throws on data nested too deeply, and reports it', () => {
    const nested = `{"plans":[{"name":"Deep","extra":${'{"d":'.repeat(20_000)}1${'}'.repeat(20_000)}}]}`;
    const preview = parseImport(nested, NOW_ISO);
    expect(preview.plans).toEqual([]);
    expect(preview.errors).toEqual([{ level: 'error', key: 'common.import.error.tooComplex' }]);
  });

  it('refuses files with too many plans', () => {
    const many = JSON.stringify({ plans: Array.from({ length: MAX_IMPORT_PLANS + 1 }, (_, i) => ({ name: `P${i}` })) });
    const preview = parseImport(many, NOW_ISO);
    expect(preview.plans).toEqual([]);
    expect(preview.errors).toEqual([
      { level: 'error', key: 'common.import.error.tooManyPlans', params: { count: MAX_IMPORT_PLANS + 1, max: MAX_IMPORT_PLANS } },
    ]);
  });

  it('an import that does not fit in the storage is refused and the state is unchanged', () => {
    const storage = new MemoryStorage();
    const { store } = setup(storage);
    store.setLang('en');
    store.flush();
    storage.quota = (storage.getItem(STORAGE_KEY) as string).length + STORAGE_KEY.length + 2000;
    const before = store.getSnapshot();
    const preview = store.importJson(JSON.stringify({ plans: [{ name: 'A' }, { name: 'B' }] }));
    expect(store.applyImport(preview.plans)).toEqual([]);
    expect(store.getSnapshot()).toBe(before);
    expect(store.getNotices().at(-1)).toMatchObject({ level: 'error', messageKey: 'common.notice.importTooLarge' });
    // Later edits still save.
    store.setValueMode('nominal');
    store.flush();
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).ui.valueMode).toBe('nominal');
  });

  it('a stored state nested too deeply is recovered like corrupted data', () => {
    const storage = new MemoryStorage();
    const raw = `{"version":2,"plans":[{"id":"p","extra":${'{"d":'.repeat(20_000)}1${'}'.repeat(20_000)}}]}`;
    storage.setItem(STORAGE_KEY, raw);
    const result = loadState(storage, { now: () => NOW });
    expect(result.source).toBe('recovered');
    expect(result.notices[0].messageKey).toBe('common.notice.corrupted');
    expect(storage.getItem(backupKeys(storage)[0])).toBe(raw);
  });
});

describe('reset to examples never loses the plans (ROB-03)', () => {
  it('is refused when the backup cannot be written, and goes ahead only when forced', () => {
    const { store, storage } = setup();
    store.renamePlan(store.getSnapshot().plans[0].id, 'MY PRECIOUS PLAN');
    store.flush();
    storage.failWritesFor = (key) => key.startsWith(BACKUP_KEY_PREFIX);
    const before = store.getSnapshot();
    expect(store.resetToExamples()).toBe(false);
    expect(store.getSnapshot()).toBe(before);
    vi.advanceTimersByTime(1000);
    expect(storage.getItem(STORAGE_KEY)).toContain('MY PRECIOUS PLAN');

    expect(store.resetToExamples({ force: true })).toBe(true);
    expect(store.getSnapshot().plans.map((p) => p.name)).toEqual(['Base', 'Prudente', 'Ottimista']);
    expect(store.getNotices().at(-1)).toMatchObject({ messageKey: 'common.notice.resetDoneNoBackup' });
  });

  it('is refused without storage too (the plans in memory are the only copy)', () => {
    const store = createPlannerStore({ storage: null, now: () => NOW });
    expect(store.resetToExamples()).toBe(false);
    expect(store.resetToExamples({ force: true })).toBe(true);
  });

  it('keeps at most MAX_BACKUPS backups, removing the oldest first', () => {
    const storage = new MemoryStorage();
    for (let i = 0; i < MAX_BACKUPS + 3; i++) {
      expect(writeBackup(storage, `state ${i}`, new Date(Date.UTC(2026, 0, 1 + i)))).not.toBeNull();
    }
    const backups = listBackups(storage);
    expect(backups).toHaveLength(MAX_BACKUPS);
    expect(storage.getItem(backups[0].key)).toBe(`state ${MAX_BACKUPS + 2}`);
    expect(storage.getItem(backups.at(-1)!.key)).toBe('state 3');
    expect(backups[0].createdAt).toBe(new Date(Date.UTC(2026, 0, MAX_BACKUPS + 3)).toISOString());
  });

  it('lists, reads and deletes backups through the store', () => {
    const { store } = setup();
    store.resetToExamples();
    const [backup] = store.listBackups();
    expect(backup.key.startsWith(BACKUP_KEY_PREFIX)).toBe(true);
    expect(JSON.parse(store.readBackup(backup.key) as string).plans).toHaveLength(3);
    expect(store.readBackup('fire-planner:v2')).toBeNull();
    store.deleteBackup(backup.key);
    expect(store.listBackups()).toEqual([]);
  });
});

describe('several tabs (ROB-05, ROB-12)', () => {
  it('an edit made right after another tab saved survives the storage-event reload', () => {
    const storage = new MemoryStorage();
    const tabA = setup(storage).store;
    const tabB = setup(storage).store;
    const planId = tabB.getSnapshot().activePlanId;

    tabA.setValueMode('nominal'); // A saves after its debounce…
    tabB.updatePlan(planId, (d) => {
      d.spending.events.push({ id: 'ev-1', label: 'Auto', age: 40, amountToday: 20000, years: 1 });
    });
    tabA.flush();
    tabB.reload(); // …and B receives the storage event before its own save.

    const stored = JSON.parse(storage.getItem(STORAGE_KEY) as string);
    expect(stored.plans.find((p: Plan) => p.id === planId).spending.events).toHaveLength(1);
    expect(tabB.getSnapshot().plans.find((p) => p.id === planId)?.spending.events).toHaveLength(1);
  });

  it('plans deleted or created in this tab are kept that way after a reload', () => {
    const storage = new MemoryStorage();
    const tabA = setup(storage).store;
    const tabB = setup(storage).store;
    const [, second] = tabB.getSnapshot().plans;
    tabB.deletePlan(second.id);
    const created = tabB.createPlan({ exampleId: 'example-base' });
    tabA.setLang('en');
    tabA.flush();
    tabB.reload();
    const ids = tabB.getSnapshot().plans.map((p) => p.id);
    expect(ids).not.toContain(second.id);
    expect(ids).toContain(created);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).plans.map((p: Plan) => p.id)).toEqual(ids);
  });

  it('keeps the active plan, compared plans and UI preferences of each tab', () => {
    const storage = new MemoryStorage();
    const tabA = setup(storage).store;
    const tabB = setup(storage).store;
    const ids = tabA.getSnapshot().plans.map((p) => p.id);
    tabA.setActive(ids[1]);
    tabA.toggleCompare(ids[2]);
    tabA.setLang('en');
    tabA.flush();
    tabB.reload();
    const b = tabB.getSnapshot();
    expect(b.activePlanId).toBe(ids[0]);
    expect(b.compareIds).toEqual([]);
    expect(b.ui.lang).toBe('it');
  });

  it('a reload without changes keeps the same snapshot and plan objects (no recomputation)', () => {
    const storage = new MemoryStorage();
    const tabA = setup(storage).store;
    const tabB = setup(storage).store;
    tabA.renamePlan(tabA.getSnapshot().plans[0].id, 'Da A');
    tabA.flush();
    tabB.reload();
    const first = tabB.getSnapshot();
    tabA.setValueMode('nominal'); // a change that does not touch any plan
    tabA.flush();
    tabB.reload();
    const second = tabB.getSnapshot();
    expect(second).toBe(first);
    tabA.renamePlan(tabA.getSnapshot().plans[1].id, 'Altro');
    tabA.flush();
    tabB.reload();
    const third = tabB.getSnapshot();
    expect(third.plans[0]).toBe(first.plans[0]);
    expect(third.plans[1]).not.toBe(first.plans[1]);
    expect(third.plans[1].name).toBe('Altro');
  });

  it('connect() reloads on storage events for the planner key only and flushes on pagehide', () => {
    const storage = new MemoryStorage();
    const tabA = setup(storage).store;
    const tabB = setup(storage).store;
    const win = new EventTarget() as EventTarget & { document: EventTarget & { visibilityState: string } };
    win.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const disconnect = tabB.connect(win as unknown as Window);

    tabA.renamePlan(tabA.getSnapshot().plans[0].id, 'Da A');
    tabA.flush();
    const storageEvent = (key: string | null) => Object.assign(new Event('storage'), { key, storageArea: storage });
    win.dispatchEvent(storageEvent('fire-planner:ui:inputs-open'));
    expect(tabB.getSnapshot().plans[0].name).not.toBe('Da A');
    win.dispatchEvent(storageEvent(STORAGE_KEY));
    expect(tabB.getSnapshot().plans[0].name).toBe('Da A');

    tabB.setValueMode('nominal');
    win.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).ui.valueMode).toBe('nominal');
    disconnect();
  });
});

describe('names and example texts (UX-20, UX-22)', () => {
  it('creating, duplicating or importing a plan with a taken name adds a suffix', () => {
    const { store } = setup();
    store.createPlan({ exampleId: 'example-prudent', name: 'Prudente' });
    store.createPlan({ exampleId: 'example-prudent', name: 'Prudente' });
    store.duplicatePlan(store.getSnapshot().plans[0].id);
    const names = store.getSnapshot().plans.map((p) => p.name);
    expect(names).toEqual(['Base', 'Base (2)', 'Prudente', 'Ottimista', 'Prudente (2)', 'Prudente (3)']);
  });

  it('example texts are written in the UI language, and follow it while untouched', () => {
    const en = localizedExamples('en', NOW_ISO);
    expect(en[0].portfolio.assets.map((a) => a.name)).toEqual(['Global equity (ETF)', 'Global bonds, EUR hedged (ETF)']);
    expect(en[0].pensionFund.name).toBe('Industry pension fund — balanced line');
    expect(en.map((p) => p.name)).toEqual(['Base', 'Prudent', 'Optimistic']);

    const { store } = setup();
    const id = store.getSnapshot().plans[0].id;
    store.updatePlan(id, (d) => {
      d.portfolio.assets[1].name = 'I miei BTP';
    });
    store.setLang('en');
    const plan = store.getSnapshot().plans[0];
    expect(plan.portfolio.assets.map((a) => a.name)).toEqual(['Global equity (ETF)', 'I miei BTP']);
    expect(store.getSnapshot().plans[1].name).toBe('Prudent');
    store.setLang('it');
    expect(store.getSnapshot().plans[0].portfolio.assets[0].name).toBe(createExamplePlans()[0].portfolio.assets[0].name);
  });
});
