/**
 * Harness Verification Test Suite
 * Validates math functions, assertion utilities, structure checkers,
 * and test runner capabilities.
 */

import { test } from './runner';
import {
  calculateCompoundInterest,
  calculateMonthlyAnnuityFutureValue,
  discountForInflation,
  calculateTfrAccrual,
  calculatePensionTaxRebate,
  calculateWeightedPortfolioMetrics,
  calculateSimpleZeroFeeProjection,
  getSalaryPhaseForYear,
} from './financial-math';
import {
  assert,
  assertEquals,
  assertWithinTolerance,
  assertNearEqual,
  assertScenarioResultStructure,
  assertCsvStructure,
  assertI18nKeyConsistency,
  assertStorageSchemaV1,
  assertAllocation100Percent,
  assertThrows,
} from './asserts';
import { ScenarioParameters, ScenarioProjectionResult, StorageSchemaV1 } from './types';

test('Harness Math - Compound Interest Calculation', () => {
  // P = 1000, r = 5%, t = 10 -> FV = 1000 * (1.05)^10 = 1628.894626...
  const fv = calculateCompoundInterest(1000, 5, 10);
  assertNearEqual(fv, 1628.8946, 0.001, 'Compound interest value');
}, { tier: 'Harness' });

test('Harness Math - Inflation Discounting', () => {
  // Nominal = 1000, Inflation = 2%, t = 5 -> Real = 1000 / (1.02)^5 = 905.7308...
  const realVal = discountForInflation(1000, 2, 5);
  assertNearEqual(realVal, 905.7308, 0.001, 'Inflation discounting value');
}, { tier: 'Harness' });

test('Harness Math - TFR Accrual Default Divisor', () => {
  // RAL = 35000, divisor = 13.5 -> TFR = 35000 / 13.5 = 2592.59259...
  const tfr = calculateTfrAccrual(35000, 13.5);
  assertNearEqual(tfr, 2592.5925, 0.001, 'TFR accrual value');
}, { tier: 'Harness' });

test('Harness Math - Pension Tax Rebate Cap', () => {
  // Employee 3000 + Employer 3000 = 6000. Cap = 5164.57. Tax rate = 35%
  // Deductible = 5164.57. Rebate = 5164.57 * 0.35 = 1807.5995
  const rebate = calculatePensionTaxRebate(3000, 3000, 5164.57, 35);
  assertNearEqual(rebate, 1807.5995, 0.001, 'Pension tax rebate cap');
}, { tier: 'Harness' });

test('Harness Math - Investment Bucket Weighted Metrics', () => {
  const buckets = [
    { id: 'b1', name: 'Equity', allocationPercent: 60, expectedReturnPercent: 7, terPercent: 0.2, taxRatePercent: 26 },
    { id: 'b2', name: 'Bonds', allocationPercent: 40, expectedReturnPercent: 3, terPercent: 0.1, taxRatePercent: 12.5 },
  ];
  const metrics = calculateWeightedPortfolioMetrics(buckets);
  // Expected Return: 0.6*7 + 0.4*3 = 4.2 + 1.2 = 5.4
  // TER: 0.6*0.2 + 0.4*0.1 = 0.12 + 0.04 = 0.16
  // Net Return: 5.4 - 0.16 = 5.24
  assertNearEqual(metrics.expectedReturnPercent, 5.4, 0.001);
  assertNearEqual(metrics.terPercent, 0.16, 0.001);
  assertNearEqual(metrics.netReturnPercent, 5.24, 0.001);
}, { tier: 'Harness' });

test('Harness Assertions - 0.01% Tolerance Assertion', () => {
  // 10000 vs 10000.5 is 0.005% diff, passes 0.01% tolerance
  assertWithinTolerance(10000.5, 10000, 0.0001, 'Passes 0.01% tolerance');

  // 10000 vs 10050 is 0.5% diff, fails 0.01% tolerance
  assertThrows(() => {
    assertWithinTolerance(10050, 10000, 0.0001, 'Should fail 0.01% tolerance');
  });
}, { tier: 'Harness' });

test('Harness Assertions - Structure Validation', () => {
  const mockResult: ScenarioProjectionResult = {
    scenarioId: 'base',
    parameters: {
      id: 'base',
      name: 'Base Scenario',
      description: 'Test',
      timeHorizonYears: 1,
      inflationRatePercent: 2,
      tfrDivisor: 13.5,
      initialWealth: { investedCapital: 10000, cashLiquidity: 5000, pensionBalance: 0, accumulatedTfr: 0 },
      salaryPhases: [{ id: 'p1', startYear: 1, endYear: 1, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 1000 }],
      pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
      investmentBuckets: [{ id: 'b1', name: 'Global', allocationPercent: 100, expectedReturnPercent: 7, terPercent: 0.2, taxRatePercent: 26 }],
      taxes: { wealthTaxPercent: 0.2, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35 },
    },
    yearlyProjections: [
      {
        year: 1,
        ral: 35000,
        netMonthlySavings: 1000,
        cashBalance: 5000,
        tfrAccruedYear: 2592.59,
        tfrCompanyBalance: 2592.59,
        pensionContributionEmployee: 0,
        pensionContributionEmployer: 0,
        pensionTaxRebate: 0,
        pensionFundBalance: 0,
        investmentContributions: 12000,
        investmentGainsYear: 700,
        investmentFeesYear: 24,
        investmentPortfolioBalance: 22676,
        totalWealthNominal: 30268.59,
        totalWealthReal: 29675.08,
        totalContributionsCumulative: 12000,
        totalGainsCumulative: 700,
        totalFeesCumulative: 24,
      },
    ],
    kpiSummary: {
      finalTotalWealthNominal: 30268.59,
      finalTotalWealthReal: 29675.08,
      averageAnnualReturnPercent: 7.0,
      totalContributions: 12000,
      totalInvestmentGains: 700,
      totalFeesPaid: 24,
    },
  };

  assertScenarioResultStructure(mockResult);
}, { tier: 'Harness' });

test('Harness Assertions - StorageSchemaV1 Validation', () => {
  const mockStorage: StorageSchemaV1 = {
    version: 1,
    activeScenarioId: 'base',
    scenarios: [
      {
        id: 'base',
        name: 'Base Scenario',
        description: 'Base',
        timeHorizonYears: 30,
        inflationRatePercent: 2,
        tfrDivisor: 13.5,
        initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
        salaryPhases: [],
        pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
        investmentBuckets: [],
        taxes: { wealthTaxPercent: 0.2, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35 },
      },
    ],
    language: 'it',
  };

  assertStorageSchemaV1(mockStorage);
}, { tier: 'Harness' });

test('Harness Assertions - i18n Key Consistency', () => {
  const it = { common: { save: 'Salva', cancel: 'Annulla' }, dashboard: { title: 'Dashboard FIRE' } };
  const en = { common: { save: 'Save', cancel: 'Cancel' }, dashboard: { title: 'FIRE Dashboard' } };
  assertI18nKeyConsistency(it, en);

  const incompleteEn = { common: { save: 'Save' } };
  assertThrows(() => {
    assertI18nKeyConsistency(it, incompleteEn);
  });
}, { tier: 'Harness' });
