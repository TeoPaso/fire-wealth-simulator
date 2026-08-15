import { ScenarioParameters } from '../engine/types';
import { getDefaultPresets } from './presets';

export const STORAGE_KEY = 'fire_wealth_simulator_v1';
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Versioned LocalStorage Persistence Schema V1
 */
export interface StorageSchemaV1 {
  version: 1;
  activeScenarioId: string;
  comparisonScenarioIds: string[];
  scenarios: ScenarioParameters[];
  lastUpdated: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Generates a unique scenario ID with an optional prefix.
 */
export function generateScenarioId(prefix: string = 'scenario'): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${randomStr}`;
}

/**
 * Validates a ScenarioParameters object structure and logical constraints.
 */
export function validateScenarioParameters(scenario: any): ValidationResult {
  const errors: string[] = [];

  if (!scenario || typeof scenario !== 'object') {
    return { valid: false, errors: ['Scenario must be a non-null object'] };
  }

  if (typeof scenario.id !== 'string' || scenario.id.trim() === '') {
    errors.push('Scenario id must be a non-empty string');
  }

  if (typeof scenario.name !== 'string' || scenario.name.trim() === '') {
    errors.push('Scenario name must be a non-empty string');
  }

  if (
    typeof scenario.timeHorizonYears !== 'number' ||
    isNaN(scenario.timeHorizonYears) ||
    scenario.timeHorizonYears < 1 ||
    scenario.timeHorizonYears > 50
  ) {
    errors.push('Scenario timeHorizonYears must be a number between 1 and 50');
  }

  if (typeof scenario.inflationRatePercent !== 'number' || isNaN(scenario.inflationRatePercent)) {
    errors.push('Scenario inflationRatePercent must be a valid number');
  }

  if (
    typeof scenario.tfrDivisor !== 'number' ||
    isNaN(scenario.tfrDivisor) ||
    scenario.tfrDivisor <= 0
  ) {
    errors.push('Scenario tfrDivisor must be a positive number');
  }

  // Initial wealth validation
  if (!scenario.initialWealth || typeof scenario.initialWealth !== 'object') {
    errors.push('Scenario initialWealth must be an object');
  } else {
    const { investedCapital, cashLiquidity, pensionBalance, accumulatedTfr } = scenario.initialWealth;
    if (typeof investedCapital !== 'number' || isNaN(investedCapital) || investedCapital < 0) {
      errors.push('initialWealth.investedCapital must be a non-negative number');
    }
    if (typeof cashLiquidity !== 'number' || isNaN(cashLiquidity) || cashLiquidity < 0) {
      errors.push('initialWealth.cashLiquidity must be a non-negative number');
    }
    if (typeof pensionBalance !== 'number' || isNaN(pensionBalance) || pensionBalance < 0) {
      errors.push('initialWealth.pensionBalance must be a non-negative number');
    }
    if (typeof accumulatedTfr !== 'number' || isNaN(accumulatedTfr) || accumulatedTfr < 0) {
      errors.push('initialWealth.accumulatedTfr must be a non-negative number');
    }
  }

  // Salary phases validation
  if (!Array.isArray(scenario.salaryPhases) || scenario.salaryPhases.length === 0) {
    errors.push('Scenario salaryPhases must be a non-empty array');
  } else {
    scenario.salaryPhases.forEach((phase: any, index: number) => {
      if (typeof phase.startYear !== 'number' || phase.startYear < 1) {
        errors.push(`salaryPhases[${index}].startYear must be a positive integer`);
      }
      if (typeof phase.endYear !== 'number' || phase.endYear < phase.startYear) {
        errors.push(`salaryPhases[${index}].endYear must be >= startYear`);
      }
      if (typeof phase.annualGrossRAL !== 'number' || phase.annualGrossRAL < 0) {
        errors.push(`salaryPhases[${index}].annualGrossRAL must be a non-negative number`);
      }
      if (typeof phase.mensilita !== 'number' || phase.mensilita <= 0) {
        errors.push(`salaryPhases[${index}].mensilita must be a positive number`);
      }
      if (typeof phase.monthlyNetSavings !== 'number' || phase.monthlyNetSavings < 0) {
        errors.push(`salaryPhases[${index}].monthlyNetSavings must be a non-negative number`);
      }
    });
  }

  // Investment buckets validation
  if (!Array.isArray(scenario.investmentBuckets) || scenario.investmentBuckets.length === 0) {
    errors.push('Scenario investmentBuckets must be a non-empty array');
  } else {
    let totalAllocation = 0;
    scenario.investmentBuckets.forEach((bucket: any, index: number) => {
      if (typeof bucket.name !== 'string' || bucket.name.trim() === '') {
        errors.push(`investmentBuckets[${index}].name must be a non-empty string`);
      }
      if (typeof bucket.allocationPercent !== 'number' || bucket.allocationPercent < 0) {
        errors.push(`investmentBuckets[${index}].allocationPercent must be non-negative`);
      } else {
        totalAllocation += bucket.allocationPercent;
      }
      if (typeof bucket.expectedReturnPercent !== 'number' || isNaN(bucket.expectedReturnPercent)) {
        errors.push(`investmentBuckets[${index}].expectedReturnPercent must be a valid number`);
      }
      if (typeof bucket.terPercent !== 'number' || bucket.terPercent < 0) {
        errors.push(`investmentBuckets[${index}].terPercent must be a non-negative number`);
      }
      if (typeof bucket.taxRatePercent !== 'number' || bucket.taxRatePercent < 0) {
        errors.push(`investmentBuckets[${index}].taxRatePercent must be a non-negative number`);
      }
    });

    if (Math.abs(totalAllocation - 100) > 0.01) {
      errors.push(`Investment bucket allocation sum (${totalAllocation}%) must equal 100%`);
    }
  }

  // Pension fund validation
  if (!scenario.pensionFund || typeof scenario.pensionFund !== 'object') {
    errors.push('Scenario pensionFund must be an object');
  } else {
    const pf = scenario.pensionFund;
    if (typeof pf.enabled !== 'boolean') errors.push('pensionFund.enabled must be a boolean');
    if (typeof pf.routeTfr !== 'boolean') errors.push('pensionFund.routeTfr must be a boolean');
    if (typeof pf.employeeContributionPercent !== 'number' || pf.employeeContributionPercent < 0) {
      errors.push('pensionFund.employeeContributionPercent must be non-negative');
    }
    if (typeof pf.employerContributionPercent !== 'number' || pf.employerContributionPercent < 0) {
      errors.push('pensionFund.employerContributionPercent must be non-negative');
    }
  }

  // Taxes validation
  if (!scenario.taxes || typeof scenario.taxes !== 'object') {
    errors.push('Scenario taxes must be an object');
  } else {
    const t = scenario.taxes;
    if (typeof t.wealthTaxPercent !== 'number' || t.wealthTaxPercent < 0) {
      errors.push('taxes.wealthTaxPercent must be non-negative');
    }
    if (typeof t.pensionDeductionCap !== 'number' || t.pensionDeductionCap < 0) {
      errors.push('taxes.pensionDeductionCap must be non-negative');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates full StorageSchemaV1 payload.
 */
export function validateStorageSchema(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Storage data must be a non-null object'] };
  }

  if (data.version !== CURRENT_SCHEMA_VERSION) {
    errors.push(`Invalid schema version: expected ${CURRENT_SCHEMA_VERSION}, received ${data.version}`);
  }

  if (!Array.isArray(data.scenarios) || data.scenarios.length === 0) {
    errors.push('scenarios must be a non-empty array');
  } else {
    data.scenarios.forEach((sc: any, index: number) => {
      const res = validateScenarioParameters(sc);
      if (!res.valid) {
        errors.push(`Scenario [${index}] '${sc?.name || sc?.id || 'unknown'}' invalid: ${res.errors.join('; ')}`);
      }
    });
  }

  if (typeof data.activeScenarioId !== 'string' || data.activeScenarioId.trim() === '') {
    errors.push('activeScenarioId must be a non-empty string');
  } else if (
    Array.isArray(data.scenarios) &&
    !data.scenarios.some((s: any) => s && s.id === data.activeScenarioId)
  ) {
    errors.push(`activeScenarioId '${data.activeScenarioId}' not found in scenarios list`);
  }

  if (!Array.isArray(data.comparisonScenarioIds)) {
    errors.push('comparisonScenarioIds must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Returns default initial state for StorageSchemaV1 using default presets.
 */
export function getDefaultStoreState(): StorageSchemaV1 {
  const scenarios = getDefaultPresets();
  return {
    version: CURRENT_SCHEMA_VERSION,
    activeScenarioId: scenarios[0].id,
    comparisonScenarioIds: scenarios.map((s) => s.id),
    scenarios,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Reads scenarios store state from LocalStorage with fallback to default state.
 */
export function loadStoreFromLocalStorage(customStorage?: Storage): StorageSchemaV1 {
  try {
    const storage = customStorage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!storage) {
      return getDefaultStoreState();
    }

    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultStoreState();
    }

    const parsed = JSON.parse(raw);
    const validation = validateStorageSchema(parsed);
    if (!validation.valid) {
      console.warn('LocalStorage contained invalid schema structure. Falling back to defaults.', validation.errors);
      return getDefaultStoreState();
    }

    return parsed as StorageSchemaV1;
  } catch (error) {
    console.warn('Failed to load store from LocalStorage. Falling back to defaults.', error);
    return getDefaultStoreState();
  }
}

/**
 * Saves store state to LocalStorage.
 */
export function saveStoreToLocalStorage(state: StorageSchemaV1, customStorage?: Storage): boolean {
  try {
    const storage = customStorage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!storage) return false;

    const stateToSave: StorageSchemaV1 = {
      ...state,
      lastUpdated: new Date().toISOString(),
    };

    storage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (error) {
    console.error('Failed to save store to LocalStorage:', error);
    return false;
  }
}

/**
 * Creates a new scenario and returns the updated state along with the new scenario.
 */
export function createScenario(
  currentState: StorageSchemaV1,
  customParams?: Partial<ScenarioParameters>
): { updatedState: StorageSchemaV1; newScenario: ScenarioParameters } {
  const base = getDefaultPresets()[0];
  const newId = generateScenarioId('scenario');
  const count = currentState.scenarios.length + 1;

  const newScenario: ScenarioParameters = {
    ...JSON.parse(JSON.stringify(base)),
    id: newId,
    name: customParams?.name || `Custom Scenario ${count}`,
    description: customParams?.description || 'Custom user-defined financial scenario.',
    ...customParams,
    // Ensure nested arrays get fresh IDs if not explicitly overridden
    salaryPhases: customParams?.salaryPhases || [
      {
        id: `sp-${newId}-1`,
        startYear: 1,
        endYear: base.timeHorizonYears,
        annualGrossRAL: 35000,
        mensilita: 13,
        monthlyNetSavings: 600,
      },
    ],
    investmentBuckets: customParams?.investmentBuckets || [
      {
        id: `ib-${newId}-1`,
        name: 'Global Equities',
        allocationPercent: 70,
        expectedReturnPercent: 7.0,
        terPercent: 0.2,
        taxRatePercent: 26.0,
      },
      {
        id: `ib-${newId}-2`,
        name: 'Government Bonds',
        allocationPercent: 30,
        expectedReturnPercent: 3.5,
        terPercent: 0.1,
        taxRatePercent: 12.5,
      },
    ],
  };

  const updatedState: StorageSchemaV1 = {
    ...currentState,
    activeScenarioId: newScenario.id,
    comparisonScenarioIds: [...currentState.comparisonScenarioIds, newScenario.id],
    scenarios: [...currentState.scenarios, newScenario],
    lastUpdated: new Date().toISOString(),
  };

  return { updatedState, newScenario };
}

/**
 * Duplicates an existing scenario by ID.
 */
export function duplicateScenario(
  currentState: StorageSchemaV1,
  targetScenarioId: string
): { updatedState: StorageSchemaV1; duplicatedScenario: ScenarioParameters } {
  const source = currentState.scenarios.find((s) => s.id === targetScenarioId);
  if (!source) {
    throw new Error(`Scenario with id '${targetScenarioId}' not found.`);
  }

  const copy: ScenarioParameters = JSON.parse(JSON.stringify(source));
  const newId = generateScenarioId('copy');
  copy.id = newId;
  copy.name = `${source.name} (Copy)`;

  // Generate fresh IDs for salary phases & investment buckets
  copy.salaryPhases = copy.salaryPhases.map((phase, idx) => ({
    ...phase,
    id: `sp-${newId}-${idx + 1}`,
  }));

  copy.investmentBuckets = copy.investmentBuckets.map((bucket, idx) => ({
    ...bucket,
    id: `ib-${newId}-${idx + 1}`,
  }));

  const updatedState: StorageSchemaV1 = {
    ...currentState,
    activeScenarioId: copy.id,
    comparisonScenarioIds: [...currentState.comparisonScenarioIds, copy.id],
    scenarios: [...currentState.scenarios, copy],
    lastUpdated: new Date().toISOString(),
  };

  return { updatedState, duplicatedScenario: copy };
}

/**
 * Deletes a scenario by ID. Enforces at least 1 scenario remaining.
 */
export function deleteScenario(currentState: StorageSchemaV1, targetScenarioId: string): StorageSchemaV1 {
  if (currentState.scenarios.length <= 1) {
    throw new Error('Cannot delete the last remaining scenario.');
  }

  const remainingScenarios = currentState.scenarios.filter((s) => s.id !== targetScenarioId);
  if (remainingScenarios.length === currentState.scenarios.length) {
    return currentState; // Target not found, no-op
  }

  let nextActiveId = currentState.activeScenarioId;
  if (currentState.activeScenarioId === targetScenarioId) {
    nextActiveId = remainingScenarios[0].id;
  }

  const nextComparisonIds = currentState.comparisonScenarioIds.filter((id) => id !== targetScenarioId);

  return {
    ...currentState,
    activeScenarioId: nextActiveId,
    comparisonScenarioIds: nextComparisonIds,
    scenarios: remainingScenarios,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Selects active scenario ID for dashboard display.
 */
export function selectActiveScenario(currentState: StorageSchemaV1, scenarioId: string): StorageSchemaV1 {
  const exists = currentState.scenarios.some((s) => s.id === scenarioId);
  if (!exists) {
    throw new Error(`Scenario '${scenarioId}' not found.`);
  }

  return {
    ...currentState,
    activeScenarioId: scenarioId,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Toggles a scenario in/out of comparison scenarios array.
 */
export function toggleComparisonScenario(currentState: StorageSchemaV1, scenarioId: string): StorageSchemaV1 {
  const exists = currentState.scenarios.some((s) => s.id === scenarioId);
  if (!exists) return currentState;

  const isCompared = currentState.comparisonScenarioIds.includes(scenarioId);
  const nextComparisonIds = isCompared
    ? currentState.comparisonScenarioIds.filter((id) => id !== scenarioId)
    : [...currentState.comparisonScenarioIds, scenarioId];

  return {
    ...currentState,
    comparisonScenarioIds: nextComparisonIds,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Updates parameters of a target scenario by ID.
 */
export function updateScenario(
  currentState: StorageSchemaV1,
  scenarioId: string,
  updates: Partial<ScenarioParameters>
): StorageSchemaV1 {
  const index = currentState.scenarios.findIndex((s) => s.id === scenarioId);
  if (index === -1) {
    throw new Error(`Scenario '${scenarioId}' not found.`);
  }

  const existing = currentState.scenarios[index];
  const updatedScenario: ScenarioParameters = {
    ...existing,
    ...updates,
    // Preserve ID even if provided in updates
    id: scenarioId,
  };

  const validation = validateScenarioParameters(updatedScenario);
  if (!validation.valid) {
    console.warn(`Invalid scenario parameters: ${validation.errors.join('; ')}`);
  }

  const nextScenarios = [...currentState.scenarios];
  nextScenarios[index] = updatedScenario;

  return {
    ...currentState,
    scenarios: nextScenarios,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Exports current scenarios state to a formatted JSON string.
 */
export function exportScenariosToJson(state: StorageSchemaV1): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Imports scenarios from a JSON string, validating schema format.
 */
export function importScenariosFromJson(jsonString: string): {
  success: boolean;
  state?: StorageSchemaV1;
  errors?: string[];
} {
  try {
    const parsed = JSON.parse(jsonString);

    // Support importing either full StorageSchemaV1 OR an array of scenarios OR a single ScenarioParameters
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return { success: false, errors: ['Imported array of scenarios cannot be empty.'] };
      }
      for (let i = 0; i < parsed.length; i++) {
        const val = validateScenarioParameters(parsed[i]);
        if (!val.valid) {
          return { success: false, errors: [`Scenario [${i}] invalid: ${val.errors.join('; ')}`] };
        }
      }
      const state: StorageSchemaV1 = {
        version: CURRENT_SCHEMA_VERSION,
        activeScenarioId: parsed[0].id,
        comparisonScenarioIds: parsed.map((s: ScenarioParameters) => s.id),
        scenarios: parsed,
        lastUpdated: new Date().toISOString(),
      };
      return { success: true, state };
    }

    if (parsed && typeof parsed === 'object' && parsed.version === CURRENT_SCHEMA_VERSION) {
      const validation = validateStorageSchema(parsed);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }
      return { success: true, state: parsed as StorageSchemaV1 };
    }

    // Check if single scenario object was imported
    const singleValidation = validateScenarioParameters(parsed);
    if (singleValidation.valid) {
      const state: StorageSchemaV1 = {
        version: CURRENT_SCHEMA_VERSION,
        activeScenarioId: parsed.id,
        comparisonScenarioIds: [parsed.id],
        scenarios: [parsed],
        lastUpdated: new Date().toISOString(),
      };
      return { success: true, state };
    }

    return {
      success: false,
      errors: ['Invalid import format. Expected StorageSchemaV1, an array of scenarios, or a single valid scenario.'],
    };
  } catch (error) {
    return {
      success: false,
      errors: [`JSON parse error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Pure Reactive ScenarioStore Class for UI State Management & LocalStorage Persistence
 */
export class ScenarioStore {
  private state: StorageSchemaV1;
  private listeners: Set<() => void> = new Set();
  private customStorage?: Storage;

  constructor(customStorage?: Storage) {
    this.customStorage = customStorage;
    if (this.customStorage) {
      this.state = loadStoreFromLocalStorage(this.customStorage);
    } else {
      this.state = getDefaultStoreState();
    }
  }

  public rehydrateFromLocalStorage(): void {
    const loaded = loadStoreFromLocalStorage(this.customStorage);
    this.state = loaded;
    this.listeners.forEach((listener) => listener());
  }

  public getState(): StorageSchemaV1 {
    return this.state;
  }

  public getActiveScenario(): ScenarioParameters {
    return (
      this.state.scenarios.find((s) => s.id === this.state.activeScenarioId) ||
      this.state.scenarios[0]
    );
  }

  public getComparisonScenarios(): ScenarioParameters[] {
    return this.state.scenarios.filter((s) => this.state.comparisonScenarioIds.includes(s.id));
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    saveStoreToLocalStorage(this.state, this.customStorage);
    this.listeners.forEach((listener) => listener());
  }

  public selectActiveScenario(id: string): void {
    this.state = selectActiveScenario(this.state, id);
    this.notify();
  }

  public toggleComparisonScenario(id: string): void {
    this.state = toggleComparisonScenario(this.state, id);
    this.notify();
  }

  public createScenario(customParams?: Partial<ScenarioParameters>): ScenarioParameters {
    const { updatedState, newScenario } = createScenario(this.state, customParams);
    this.state = updatedState;
    this.notify();
    return newScenario;
  }

  public duplicateScenario(id: string): ScenarioParameters {
    const { updatedState, duplicatedScenario } = duplicateScenario(this.state, id);
    this.state = updatedState;
    this.notify();
    return duplicatedScenario;
  }

  public deleteScenario(id: string): void {
    this.state = deleteScenario(this.state, id);
    this.notify();
  }

  public updateScenario(id: string, updates: Partial<ScenarioParameters>): void {
    this.state = updateScenario(this.state, id, updates);
    this.notify();
  }

  public resetToDefaults(): void {
    this.state = getDefaultStoreState();
    this.notify();
  }

  public exportJson(): string {
    return exportScenariosToJson(this.state);
  }

  public importJson(jsonString: string): { success: boolean; errors?: string[] } {
    const result = importScenariosFromJson(jsonString);
    if (result.success && result.state) {
      this.state = result.state;
      this.notify();
      return { success: true };
    }
    return { success: false, errors: result.errors };
  }
}
