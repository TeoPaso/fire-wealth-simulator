import { test } from '../harness/runner';
import { assert, assertEquals, assertNearEqual, assertScenarioResultStructure } from '../harness/asserts';
import { calculateProjection } from '../../lib/engine/calculator';
import { ScenarioParameters } from '../harness/types';

const baseParams: ScenarioParameters = {
  id: 't1-f2-scenario',
  name: 'TFR Accrual Test',
  description: 'Tier 1 tests for Feature 2 (Parametric TFR Accrual)',
  timeHorizonYears: 5,
  inflationRatePercent: 2,
  tfrDivisor: 13.5,
  initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
  salaryPhases: [
    { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 1000 },
  ],
  pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
  investmentBuckets: [
    { id: 'b1', name: 'Global Equities', allocationPercent: 100, expectedReturnPercent: 5, terPercent: 0, taxRatePercent: 0 },
  ],
  taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35, tfrSubtractedPercentage: 0.5 },
};

test('T1-F2-1: Accrued annual TFR matches (RAL * 0.995) / divisor for company retention', () => {
  const res = calculateProjection(baseParams);
  assertScenarioResultStructure(res);
  // Expected: 40000 * 0.995 / 13.5 = 2948.148148...
  const expectedTfr = (40000 * 0.995) / 13.5;
  assertNearEqual(res.yearlyProjections[0].tfrAccruedYear, expectedTfr, 0.01);
}, { tier: 'Tier 1' });

test('T1-F2-2: Custom TFR divisor correctly recalculates annual TFR accrual', () => {
  const params: ScenarioParameters = {
    ...baseParams,
    tfrDivisor: 14.0,
  };
  const res = calculateProjection(params);
  // Expected: 40000 * 0.995 / 14.0 = 2842.85714...
  const expectedTfr = (40000 * 0.995) / 14.0;
  assertNearEqual(res.yearlyProjections[0].tfrAccruedYear, expectedTfr, 0.01);
}, { tier: 'Tier 1' });

test('T1-F2-3: Routing TFR to pension fund routes TFR to pension and leaves company TFR balance at 0', () => {
  const params: ScenarioParameters = {
    ...baseParams,
    pensionFund: {
      enabled: true,
      routeTfr: true,
      employeeContributionPercent: 0,
      employerContributionPercent: 0,
      expectedReturnPercent: 0,
      terPercent: 0,
      taxRatePercent: 0,
    },
  };
  const res = calculateProjection(params);
  assertEquals(res.yearlyProjections[0].tfrCompanyBalance, 0);
  assertNearEqual(res.yearlyProjections[0].pensionFundBalance, res.yearlyProjections[0].tfrAccruedYear, 0.01);
}, { tier: 'Tier 1' });

test('T1-F2-4: Company-retained TFR accumulates year-over-year with revaluation rate', () => {
  const res = calculateProjection(baseParams);
  // Year 1 revaluation on starting 0 + TFR accrued
  const y1 = res.yearlyProjections[0].tfrCompanyBalance;
  assertNearEqual(y1, res.yearlyProjections[0].tfrAccruedYear, 0.01);

  // Year 2: (y1 * (1 + revalRate)) + y2_accrued
  // revalRate = 1.5% + 0.75 * 2.0% = 3.0% = 0.03
  const expectedY2 = y1 * 1.03 + res.yearlyProjections[1].tfrAccruedYear;
  assertNearEqual(res.yearlyProjections[1].tfrCompanyBalance, expectedY2, 0.01);
}, { tier: 'Tier 1' });

test('T1-F2-5: Phase-level TFR destination override switches TFR destination between company and pension fund', () => {
  const params: ScenarioParameters = {
    ...baseParams,
    pensionFund: { enabled: true, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 2, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 1000, tfrDestination: 'COMPANY_RETAINED' },
      { id: 'p2', startYear: 3, endYear: 5, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 1000, tfrDestination: 'PENSION_FUND' },
    ],
  };
  const res = calculateProjection(params);
  // Years 1-2: company retained balance > 0
  assert(res.yearlyProjections[1].tfrCompanyBalance > 0, 'Year 2 company TFR > 0');
  const compBalYr2 = res.yearlyProjections[1].tfrCompanyBalance;

  // Year 3: TFR goes to pension fund, company TFR balance only grows by revaluation
  const expectedCompBalYr3 = compBalYr2 * 1.03; // no new company flow
  assertNearEqual(res.yearlyProjections[2].tfrCompanyBalance, expectedCompBalYr3, 0.01);
  assert(res.yearlyProjections[2].pensionFundBalance > 0, 'Year 3 pension fund received TFR');
}, { tier: 'Tier 1' });
