import { describe, it, expect, beforeEach } from 'vitest';
import {
  BASE_CASE_PRESET,
  PESSIMISTIC_CASE_PRESET,
  OPTIMISTIC_CASE_PRESET,
  DEFAULT_PRESETS,
  getDefaultPresets,
} from '../presets';
import {
  STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
  StorageSchemaV1,
  validateScenarioParameters,
  validateStorageSchema,
  getDefaultStoreState,
  loadStoreFromLocalStorage,
  saveStoreToLocalStorage,
  createScenario,
  duplicateScenario,
  deleteScenario,
  selectActiveScenario,
  toggleComparisonScenario,
  updateScenario,
  exportScenariosToJson,
  importScenariosFromJson,
  ScenarioStore,
} from '../scenario-store';
import { calculateProjection } from '../../engine/calculator';

/**
 * In-memory mock implementation of Storage interface for Vitest testing.
 */
class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('Scenario Presets (`presets.ts`)', () => {
  it('P1: All 3 default presets pass validation and core calculator engine execution', () => {
    expect(DEFAULT_PRESETS.length).toBe(3);

    for (const preset of DEFAULT_PRESETS) {
      const validation = validateScenarioParameters(preset);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);

      // Verify calculator engine runs without error on each preset
      const projection = calculateProjection(preset);
      expect(projection.yearlyProjections.length).toBe(preset.timeHorizonYears);
      expect(projection.kpiSummary.finalTotalWealthNominal).toBeGreaterThan(0);
    }
  });

  it('P2: Base Case Preset matches requirements (€35k salary, 70/30 split, 2% inflation)', () => {
    expect(BASE_CASE_PRESET.name).toBe('Base Case');
    expect(BASE_CASE_PRESET.salaryPhases[0].annualGrossRAL).toBe(35000);
    expect(BASE_CASE_PRESET.inflationRatePercent).toBe(2.0);

    const allocStock = BASE_CASE_PRESET.investmentBuckets.find((b) => b.name.includes('Equities'))?.allocationPercent;
    const allocBond = BASE_CASE_PRESET.investmentBuckets.find((b) => b.name.includes('Bonds'))?.allocationPercent;
    expect(allocStock).toBe(70);
    expect(allocBond).toBe(30);
  });

  it('P3: Pessimistic Case Preset matches requirements (higher inflation 3.5%, lower returns, higher TER)', () => {
    expect(PESSIMISTIC_CASE_PRESET.name).toBe('Pessimistic Case');
    expect(PESSIMISTIC_CASE_PRESET.inflationRatePercent).toBe(3.5);

    const activeEquityBucket = PESSIMISTIC_CASE_PRESET.investmentBuckets.find((b) => b.name.includes('Active Equity'));
    expect(activeEquityBucket?.terPercent).toBe(0.6);
  });

  it('P4: Optimistic Case Preset matches requirements (higher growth 8.5%, low fee ETFs)', () => {
    expect(OPTIMISTIC_CASE_PRESET.name).toBe('Optimistic Case');
    expect(OPTIMISTIC_CASE_PRESET.inflationRatePercent).toBe(1.8);

    const mainBucket = OPTIMISTIC_CASE_PRESET.investmentBuckets[0];
    expect(mainBucket.expectedReturnPercent).toBe(9.5);
    expect(mainBucket.terPercent).toBe(0.07);
  });

  it('P5: getDefaultPresets() returns deep copy isolated from mutation', () => {
    const presets1 = getDefaultPresets();
    const presets2 = getDefaultPresets();

    expect(presets1).toEqual(presets2);
    expect(presets1).not.toBe(presets2);

    presets1[0].name = 'Mutated Base';
    expect(presets2[0].name).toBe('Base Case');
  });
});

describe('Scenario Store Persistence & Schema Versioning (`scenario-store.ts`)', () => {
  let memoryStorage: MemoryStorage;

  beforeEach(() => {
    memoryStorage = new MemoryStorage();
  });

  it('S1: getDefaultStoreState() produces valid StorageSchemaV1 state', () => {
    const defaultState = getDefaultStoreState();
    expect(defaultState.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(defaultState.scenarios.length).toBe(3);
    expect(defaultState.activeScenarioId).toBe('preset-base');
    expect(defaultState.comparisonScenarioIds.length).toBe(3);

    const validation = validateStorageSchema(defaultState);
    expect(validation.valid).toBe(true);
  });

  it('S2: loadStoreFromLocalStorage() returns defaults on empty storage', () => {
    const state = loadStoreFromLocalStorage(memoryStorage);
    expect(state.scenarios.length).toBe(3);
    expect(state.activeScenarioId).toBe('preset-base');
  });

  it('S3: saveStoreToLocalStorage() writes valid JSON to storage key', () => {
    const defaultState = getDefaultStoreState();
    const result = saveStoreToLocalStorage(defaultState, memoryStorage);
    expect(result).toBe(true);

    const savedRaw = memoryStorage.getItem(STORAGE_KEY);
    expect(savedRaw).not.toBeNull();

    const parsed = JSON.parse(savedRaw!);
    expect(parsed.version).toBe(1);
    expect(parsed.scenarios.length).toBe(3);
  });

  it('S4: loadStoreFromLocalStorage() restores saved state correctly', () => {
    const initialState = getDefaultStoreState();
    initialState.activeScenarioId = 'preset-optimistic';
    saveStoreToLocalStorage(initialState, memoryStorage);

    const loadedState = loadStoreFromLocalStorage(memoryStorage);
    expect(loadedState.activeScenarioId).toBe('preset-optimistic');
    expect(loadedState.scenarios.length).toBe(3);
  });

  it('S5: Schema Version fallback on corrupted / invalid LocalStorage payload', () => {
    // Corrupted JSON
    memoryStorage.setItem(STORAGE_KEY, '{ invalid json ...');
    let state = loadStoreFromLocalStorage(memoryStorage);
    expect(state.scenarios.length).toBe(3);

    // Unsupported version number
    memoryStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, scenarios: [] }));
    state = loadStoreFromLocalStorage(memoryStorage);
    expect(state.version).toBe(1);
    expect(state.scenarios.length).toBe(3);
  });
});

describe('Scenario CRUD & Selection Operations', () => {
  let state: StorageSchemaV1;

  beforeEach(() => {
    state = getDefaultStoreState();
  });

  it('O1: createScenario() adds new scenario with unique ID and updates active ID', () => {
    const { updatedState, newScenario } = createScenario(state, { name: 'My New Plan' });

    expect(updatedState.scenarios.length).toBe(4);
    expect(newScenario.name).toBe('My New Plan');
    expect(updatedState.activeScenarioId).toBe(newScenario.id);
    expect(updatedState.comparisonScenarioIds).toContain(newScenario.id);
  });

  it('O2: duplicateScenario() creates an independent deep copy with new IDs', () => {
    const sourceId = 'preset-base';
    const { updatedState, duplicatedScenario } = duplicateScenario(state, sourceId);

    expect(updatedState.scenarios.length).toBe(4);
    expect(duplicatedScenario.id).not.toBe(sourceId);
    expect(duplicatedScenario.name).toBe('Base Case (Copy)');
    expect(duplicatedScenario.salaryPhases[0].id).not.toBe(BASE_CASE_PRESET.salaryPhases[0].id);

    // Modifying duplicate does not affect original
    const modifiedState = updateScenario(updatedState, duplicatedScenario.id, {
      inflationRatePercent: 5.0,
    });

    const original = modifiedState.scenarios.find((s) => s.id === sourceId);
    expect(original?.inflationRatePercent).toBe(2.0);
  });

  it('O3: deleteScenario() removes scenario and fallback active ID if active was deleted', () => {
    const activeId = state.activeScenarioId;
    const nextState = deleteScenario(state, activeId);

    expect(nextState.scenarios.length).toBe(2);
    expect(nextState.scenarios.some((s) => s.id === activeId)).toBe(false);
    expect(nextState.activeScenarioId).not.toBe(activeId);
    expect(nextState.activeScenarioId).toBe(nextState.scenarios[0].id);
  });

  it('O4: deleteScenario() throws error when attempting to delete the last scenario', () => {
    let singleState = deleteScenario(state, 'preset-base');
    singleState = deleteScenario(singleState, 'preset-pessimistic');

    expect(singleState.scenarios.length).toBe(1);
    expect(() => deleteScenario(singleState, singleState.scenarios[0].id)).toThrow(
      'Cannot delete the last remaining scenario.'
    );
  });

  it('O5: selectActiveScenario() switches active scenario ID', () => {
    const targetId = 'preset-pessimistic';
    const updated = selectActiveScenario(state, targetId);
    expect(updated.activeScenarioId).toBe(targetId);
  });

  it('O6: toggleComparisonScenario() adds and removes scenario IDs for comparison', () => {
    let updated = toggleComparisonScenario(state, 'preset-base');
    expect(updated.comparisonScenarioIds).not.toContain('preset-base');

    updated = toggleComparisonScenario(updated, 'preset-base');
    expect(updated.comparisonScenarioIds).toContain('preset-base');
  });

  it('O7: updateScenario() updates parameters cleanly', () => {
    const updated = updateScenario(state, 'preset-base', {
      inflationRatePercent: 2.5,
    });

    const base = updated.scenarios.find((s) => s.id === 'preset-base');
    expect(base?.inflationRatePercent).toBe(2.5);

    // Intermediate bucket allocation editing updates store without crashing UI
    const updatedAlloc = updateScenario(state, 'preset-base', {
      investmentBuckets: [
        { id: 'b1', name: 'B1', allocationPercent: 50, expectedReturnPercent: 5, terPercent: 0, taxRatePercent: 26 },
      ],
    });
    expect(updatedAlloc.scenarios.find((s) => s.id === 'preset-base')?.investmentBuckets[0].allocationPercent).toBe(50);
  });
});

describe('JSON Export & Import Operations', () => {
  let state: StorageSchemaV1;

  beforeEach(() => {
    state = getDefaultStoreState();
  });

  it('E1: exportScenariosToJson() generates valid JSON string', () => {
    const jsonStr = exportScenariosToJson(state);
    expect(typeof jsonStr).toBe('string');

    const parsed = JSON.parse(jsonStr);
    expect(parsed.version).toBe(1);
    expect(parsed.scenarios.length).toBe(3);
  });

  it('E2: importScenariosFromJson() successfully imports full StorageSchemaV1 payload', () => {
    const jsonStr = exportScenariosToJson(state);
    const result = importScenariosFromJson(jsonStr);

    expect(result.success).toBe(true);
    expect(result.state?.scenarios.length).toBe(3);
  });

  it('E3: importScenariosFromJson() successfully imports array of scenarios', () => {
    const scenariosArray = getDefaultPresets();
    const jsonStr = JSON.stringify(scenariosArray);
    const result = importScenariosFromJson(jsonStr);

    expect(result.success).toBe(true);
    expect(result.state?.scenarios.length).toBe(3);
    expect(result.state?.version).toBe(1);
  });

  it('E4: importScenariosFromJson() successfully imports single valid scenario', () => {
    const singleScenario = BASE_CASE_PRESET;
    const jsonStr = JSON.stringify(singleScenario);
    const result = importScenariosFromJson(jsonStr);

    expect(result.success).toBe(true);
    expect(result.state?.scenarios.length).toBe(1);
    expect(result.state?.scenarios[0].name).toBe('Base Case');
  });

  it('E5: importScenariosFromJson() fails gracefully on invalid JSON syntax', () => {
    const result = importScenariosFromJson('INVALID JSON {{{');
    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('JSON parse error');
  });

  it('E6: importScenariosFromJson() rejects invalid scenario schema (e.g. invalid allocation)', () => {
    const invalidScenario = {
      ...BASE_CASE_PRESET,
      investmentBuckets: [
        { id: 'b1', name: 'Only 50%', allocationPercent: 50, expectedReturnPercent: 5, terPercent: 0, taxRatePercent: 26 },
      ],
    };
    const result = importScenariosFromJson(JSON.stringify(invalidScenario));
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});

describe('ScenarioStore Reactive Instance (`ScenarioStore` Class)', () => {
  let memoryStorage: MemoryStorage;
  let store: ScenarioStore;

  beforeEach(() => {
    memoryStorage = new MemoryStorage();
    store = new ScenarioStore(memoryStorage);
  });

  it('R1: ScenarioStore initializes with default presets and notifies subscribers on state changes', () => {
    expect(store.getState().scenarios.length).toBe(3);
    expect(store.getActiveScenario().name).toBe('Base Case');

    let notified = false;
    const unsubscribe = store.subscribe(() => {
      notified = true;
    });

    const newScenario = store.createScenario({ name: 'Subscribed Scenario' });
    expect(notified).toBe(true);
    expect(store.getActiveScenario().id).toBe(newScenario.id);

    unsubscribe();
  });

  it('R2: Full lifecycle test (Create -> Edit -> Duplicate -> Delete -> Export -> Import -> Reset)', () => {
    // 1. Create
    const created = store.createScenario({ name: 'Lifecycle Plan' });
    expect(store.getState().scenarios.length).toBe(4);

    // 2. Edit
    store.updateScenario(created.id, { inflationRatePercent: 2.8 });
    expect(store.getActiveScenario().inflationRatePercent).toBe(2.8);

    // 3. Duplicate
    const dup = store.duplicateScenario(created.id);
    expect(store.getState().scenarios.length).toBe(5);
    expect(dup.name).toBe('Lifecycle Plan (Copy)');

    // 4. Delete original
    store.deleteScenario(created.id);
    expect(store.getState().scenarios.length).toBe(4);

    // 5. Export
    const exportedJson = store.exportJson();
    expect(typeof exportedJson).toBe('string');

    // 6. Import
    const importRes = store.importJson(exportedJson);
    expect(importRes.success).toBe(true);

    // 7. Reset to defaults
    store.resetToDefaults();
    expect(store.getState().scenarios.length).toBe(3);
    expect(store.getActiveScenario().name).toBe('Base Case');
  });
});
