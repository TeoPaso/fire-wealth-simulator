/**
 * Opaque-Box Assertion Library for E2E Test Suite
 * Includes 0.01% financial tolerance check, structure validations,
 * CSV format checking, i18n key consistency, and LocalStorage schema validation.
 */

import { ScenarioParameters, ScenarioProjectionResult, StorageSchemaV1, InvestmentBucket } from './types';

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Base boolean assertion
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new AssertionError(message);
  }
}

/**
 * Equality assertion
 */
export function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    const msg = message
      ? `${message} - Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    throw new AssertionError(msg);
  }
}

/**
 * Financial Accuracy Assertion with 0.01% Tolerance:
 * Relative error check |actual - expected| / |expected| <= tolerance
 * Default tolerance is 0.0001 (0.01%)
 */
export function assertWithinTolerance(
  actual: number,
  expected: number,
  maxRelativeTolerance: number = 0.0001,
  message?: string
): void {
  if (typeof actual !== 'number' || isNaN(actual)) {
    throw new AssertionError(`Actual value is not a valid number: ${actual}`);
  }
  if (typeof expected !== 'number' || isNaN(expected)) {
    throw new AssertionError(`Expected value is not a valid number: ${expected}`);
  }

  const diff = Math.abs(actual - expected);
  if (expected === 0) {
    if (diff > maxRelativeTolerance) {
      throw new AssertionError(
        `${message ? message + ': ' : ''}Expected 0 (+/- ${maxRelativeTolerance}), but got ${actual} (diff: ${diff})`
      );
    }
    return;
  }

  const relativeError = diff / Math.abs(expected);
  if (relativeError > maxRelativeTolerance) {
    const percentError = (relativeError * 100).toFixed(6);
    const maxPercent = (maxRelativeTolerance * 100).toFixed(4);
    throw new AssertionError(
      `${message ? message + ': ' : ''}Financial value out of tolerance! Expected ${expected}, got ${actual}. ` +
        `Error: ${percentError}% (Max allowed: ${maxPercent}%, Absolute diff: ${diff.toFixed(4)})`
    );
  }
}

/**
 * Absolute tolerance assertion (e.g. for currency rounding within 1 cent)
 */
export function assertNearEqual(
  actual: number,
  expected: number,
  maxAbsoluteDiff: number = 0.01,
  message?: string
): void {
  const diff = Math.abs(actual - expected);
  if (diff > maxAbsoluteDiff) {
    throw new AssertionError(
      `${message ? message + ': ' : ''}Expected ${expected} +/- ${maxAbsoluteDiff}, got ${actual} (diff: ${diff.toFixed(4)})`
    );
  }
}

/**
 * Validates ScenarioProjectionResult structure according to Interface Contracts
 */
export function assertScenarioResultStructure(result: any): asserts result is ScenarioProjectionResult {
  assert(result !== null && typeof result === 'object', 'Result must be an object');
  assert(typeof result.scenarioId === 'string', 'result.scenarioId must be a string');
  assert(result.parameters !== null && typeof result.parameters === 'object', 'result.parameters must be an object');
  assert(Array.isArray(result.yearlyProjections), 'result.yearlyProjections must be an array');
  assert(result.kpiSummary !== null && typeof result.kpiSummary === 'object', 'result.kpiSummary must be an object');

  // Validate KPI summary fields
  const kpi = result.kpiSummary;
  assert(typeof kpi.finalTotalWealthNominal === 'number', 'kpiSummary.finalTotalWealthNominal must be a number');
  assert(typeof kpi.finalTotalWealthReal === 'number', 'kpiSummary.finalTotalWealthReal must be a number');
  assert(typeof kpi.averageAnnualReturnPercent === 'number', 'kpiSummary.averageAnnualReturnPercent must be a number');
  assert(typeof kpi.totalContributions === 'number', 'kpiSummary.totalContributions must be a number');
  assert(typeof kpi.totalInvestmentGains === 'number', 'kpiSummary.totalInvestmentGains must be a number');
  assert(typeof kpi.totalFeesPaid === 'number', 'kpiSummary.totalFeesPaid must be a number');

  // Validate yearly projections rows
  const requiredRowFields = [
    'year',
    'ral',
    'netMonthlySavings',
    'cashBalance',
    'tfrAccruedYear',
    'tfrCompanyBalance',
    'pensionContributionEmployee',
    'pensionContributionEmployer',
    'pensionTaxRebate',
    'pensionFundBalance',
    'investmentContributions',
    'investmentGainsYear',
    'investmentFeesYear',
    'investmentPortfolioBalance',
    'totalWealthNominal',
    'totalWealthReal',
    'totalContributionsCumulative',
    'totalGainsCumulative',
    'totalFeesCumulative',
  ];

  for (let i = 0; i < result.yearlyProjections.length; i++) {
    const row = result.yearlyProjections[i];
    for (const field of requiredRowFields) {
      assert(
        typeof row[field] === 'number',
        `YearlyProjectionRow[${i}].${field} must be a number, got ${typeof row[field]}`
      );
    }
  }
}

/**
 * Validates CSV structure exported from year-by-year table
 */
export function assertCsvStructure(csvString: string, expectedMinColumns: number = 8): void {
  assert(typeof csvString === 'string' && csvString.trim().length > 0, 'CSV output must be a non-empty string');
  const lines = csvString.trim().split(/\r?\n/);
  assert(lines.length >= 2, `CSV must contain at least a header line and 1 data line, got ${lines.length} lines`);

  const headerCols = lines[0].split(/[,;]/);
  assert(
    headerCols.length >= expectedMinColumns,
    `CSV header must have at least ${expectedMinColumns} columns, got ${headerCols.length}`
  );

  for (let i = 1; i < lines.length; i++) {
    const dataCols = lines[i].split(/[,;]/);
    assert(
      dataCols.length === headerCols.length,
      `CSV line ${i + 1} has ${dataCols.length} columns, expected ${headerCols.length}`
    );
  }
}

/**
 * Recursively checks that two i18n translation objects have identical keys
 */
export function assertI18nKeyConsistency(itDict: Record<string, any>, enDict: Record<string, any>): void {
  assert(itDict !== null && typeof itDict === 'object', 'IT dictionary must be an object');
  assert(enDict !== null && typeof enDict === 'object', 'EN dictionary must be an object');

  function checkKeys(dictA: Record<string, any>, dictB: Record<string, any>, path: string = '') {
    const keysA = Object.keys(dictA);
    const keysB = new Set(Object.keys(dictB));

    for (const key of keysA) {
      const currentPath = path ? `${path}.${key}` : key;
      assert(keysB.has(key), `Missing key in translation dictionary: "${currentPath}"`);

      if (typeof dictA[key] === 'object' && dictA[key] !== null && !Array.isArray(dictA[key])) {
        assert(
          typeof dictB[key] === 'object' && dictB[key] !== null,
          `Type mismatch at key "${currentPath}": expected object in both dictionaries`
        );
        checkKeys(dictA[key], dictB[key], currentPath);
      }
    }
  }

  // Cross check IT -> EN and EN -> IT
  checkKeys(itDict, enDict, 'IT -> EN');
  checkKeys(enDict, itDict, 'EN -> IT');
}

/**
 * Validates LocalStorage StorageSchemaV1 compliance
 */
export function assertStorageSchemaV1(data: any): asserts data is StorageSchemaV1 {
  assert(data !== null && typeof data === 'object', 'Storage payload must be an object');
  assertEquals(data.version, 1, 'Storage payload version must equal 1');
  assert(typeof data.activeScenarioId === 'string' && data.activeScenarioId.length > 0, 'activeScenarioId must be non-empty string');
  assert(Array.isArray(data.scenarios) && data.scenarios.length >= 1, 'scenarios must be non-empty array');
  assert(data.language === 'it' || data.language === 'en', `language must be 'it' or 'en', got ${data.language}`);

  // Check each scenario in store
  for (const s of data.scenarios) {
    assert(typeof s.id === 'string', 'Scenario id must be a string');
    assert(typeof s.name === 'string', 'Scenario name must be a string');
    assert(typeof s.timeHorizonYears === 'number' && s.timeHorizonYears >= 1 && s.timeHorizonYears <= 50, 'timeHorizonYears must be 1..50');
    assert(Array.isArray(s.investmentBuckets), 's.investmentBuckets must be array');
    assert(Array.isArray(s.salaryPhases), 's.salaryPhases must be array');
  }
}

/**
 * Enforces UI validation requirement: investment bucket allocation percentages sum to 100%
 */
export function assertAllocation100Percent(buckets: InvestmentBucket[]): void {
  assert(Array.isArray(buckets) && buckets.length > 0, 'Investment buckets list must not be empty');
  const sum = buckets.reduce((acc, b) => acc + (b.allocationPercent || 0), 0);
  assertNearEqual(sum, 100, 0.001, 'Investment bucket allocations must sum to exactly 100%');
}

/**
 * Asserts that a function throws an error matching an optional message regex/string
 */
export function assertThrows(fn: () => void, expectedMessagePattern?: string | RegExp): void {
  let threw = false;
  try {
    fn();
  } catch (err: any) {
    threw = true;
    if (expectedMessagePattern) {
      const msg = err?.message || String(err);
      if (typeof expectedMessagePattern === 'string') {
        assert(msg.includes(expectedMessagePattern), `Error message "${msg}" does not contain expected substring "${expectedMessagePattern}"`);
      } else {
        assert(expectedMessagePattern.test(msg), `Error message "${msg}" does not match regex ${expectedMessagePattern}`);
      }
    }
  }
  assert(threw, 'Expected function to throw an error, but it succeeded');
}
