import { test } from '../harness/runner';
import { assertEquals, assertNearEqual, assert, assertScenarioResultStructure } from '../harness/asserts';
import { discountForInflation } from '../harness/financial-math';
import { calculateProjection } from '../../lib/engine/calculator';
import { ScenarioParameters } from '../harness/types';

const baseParams: ScenarioParameters = {
  id: 't1-f6-scenario',
  name: 'Inflation Test',
  description: 'Tier 1 tests for Feature 6 (Parametric Inflation)',
  timeHorizonYears: 10,
  inflationRatePercent: 2.5,
  tfrDivisor: 13.5,
  initialWealth: { investedCapital: 20000, cashLiquidity: 5000, pensionBalance: 0, accumulatedTfr: 0 },
  salaryPhases: [
    { id: 'p1', startYear: 1, endYear: 10, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 1000 },
  ],
  pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
  investmentBuckets: [
    { id: 'b1', name: 'Global Equities', allocationPercent: 100, expectedReturnPercent: 7, terPercent: 0, taxRatePercent: 0 },
  ],
  taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35, tfrSubtractedPercentage: 0.5, tfrCompanyInflationWeight: 0 },
};

test('T1-F6-1: 0% inflation results in totalWealthReal equal to totalWealthNominal', () => {
  const zeroInflParams: ScenarioParameters = {
    ...baseParams,
    inflationRatePercent: 0,
  };
  const res = calculateProjection(zeroInflParams);
  assertScenarioResultStructure(res);
  for (const row of res.yearlyProjections) {
    assertEquals(row.totalWealthReal, row.totalWealthNominal);
  }
}, { tier: 'Tier 1' });

test('T1-F6-2: Non-zero inflation (2.5%) discounts real wealth by (1 + inflation)^year', () => {
  const res = calculateProjection(baseParams);
  for (const row of res.yearlyProjections) {
    const expectedReal = discountForInflation(row.totalWealthNominal, 2.5, row.year);
    assertNearEqual(row.totalWealthReal, expectedReal, 0.01);
  }
}, { tier: 'Tier 1' });

test('T1-F6-3: Higher inflation rate (5% vs 2%) produces lower real purchasing power over 10 years', () => {
  const params2: ScenarioParameters = { ...baseParams, inflationRatePercent: 2.0 };
  const params5: ScenarioParameters = { ...baseParams, inflationRatePercent: 5.0 };

  const res2 = calculateProjection(params2);
  const res5 = calculateProjection(params5);

  assertEquals(res2.kpiSummary.finalTotalWealthNominal, res5.kpiSummary.finalTotalWealthNominal);
  assert(
    res2.kpiSummary.finalTotalWealthReal > res5.kpiSummary.finalTotalWealthReal,
    'Real wealth at 2% inflation should be strictly higher than at 5% inflation'
  );
}, { tier: 'Tier 1' });

test('T1-F6-4: Company TFR revaluation formula includes 75% of inflation rate', () => {
  const res = calculateProjection({ ...baseParams, taxes: { ...baseParams.taxes, tfrCompanyInflationWeight: 75.0 } });
  // Reval rate = 1.5% fixed + 0.75 * 2.5% = 1.5% + 1.875% = 3.375% = 0.03375
  const expectedTfrYr1 = (40000 * 0.995) / 13.5;
  const expectedTfrYr2 = expectedTfrYr1 * (1 + 0.03375) + (40000 * 0.995) / 13.5;
  assertNearEqual(res.yearlyProjections[1].tfrCompanyBalance, expectedTfrYr2, 0.01);
}, { tier: 'Tier 1' });

test('T1-F6-5: KPI Summary reports both final nominal and final real wealth values', () => {
  const res = calculateProjection(baseParams);
  const lastRow = res.yearlyProjections[9];
  assertEquals(res.kpiSummary.finalTotalWealthNominal, lastRow.totalWealthNominal);
  assertEquals(res.kpiSummary.finalTotalWealthReal, lastRow.totalWealthReal);
}, { tier: 'Tier 1' });
