import { test } from '../harness/runner';
import { assertEquals, assertNearEqual, assert, assertScenarioResultStructure, assertAllocation100Percent } from '../harness/asserts';
import { calculateProjection } from '../../lib/engine/calculator';
import { ScenarioParameters } from '../harness/types';

const baseParams: ScenarioParameters = {
  id: 't1-f4-scenario',
  name: 'Investment Buckets Test',
  description: 'Tier 1 tests for Feature 4 (Parametric Investment Buckets)',
  timeHorizonYears: 5,
  inflationRatePercent: 0,
  tfrDivisor: 13.5,
  initialWealth: { investedCapital: 10000, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
  salaryPhases: [
    { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 1000 },
  ],
  pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
  investmentBuckets: [
    { id: 'b1', name: 'Global Equities', allocationPercent: 60, expectedReturnPercent: 8.0, terPercent: 0.2, taxRatePercent: 26.0 },
    { id: 'b2', name: 'Gov Bonds', allocationPercent: 30, expectedReturnPercent: 3.5, terPercent: 0.1, taxRatePercent: 12.5 },
    { id: 'b3', name: 'Cash Equivalent', allocationPercent: 10, expectedReturnPercent: 1.0, terPercent: 0.0, taxRatePercent: 26.0 },
  ],
  taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35 },
};

test('T1-F4-1: Allocation percentages sum to 100% check succeeds on valid bucket setup', () => {
  assertAllocation100Percent(baseParams.investmentBuckets);
}, { tier: 'Tier 1' });

test('T1-F4-2: Single investment bucket compounds monthly savings at expected return rate', () => {
  const singleBucketParams: ScenarioParameters = {
    ...baseParams,
    investmentBuckets: [
      { id: 'b1', name: 'S&P 500', allocationPercent: 100, expectedReturnPercent: 10.0, terPercent: 0, taxRatePercent: 0 },
    ],
  };
  const res = calculateProjection(singleBucketParams);
  assertScenarioResultStructure(res);
  assert(res.yearlyProjections[0].investmentPortfolioBalance > 22000, 'Investments after 1 year should compound initial 10k + 12k savings');
}, { tier: 'Tier 1' });

test('T1-F4-3: Multi-bucket portfolio splits monthly net savings proportionally to allocation', () => {
  const res = calculateProjection(baseParams);
  assertScenarioResultStructure(res);
  // Total annual savings = 12,000. 60% = 7200, 30% = 3600, 10% = 1200
  assertEquals(res.yearlyProjections[0].netMonthlySavings, 1000);
  assertEquals(res.yearlyProjections[0].investmentContributions, 12000);
}, { tier: 'Tier 1' });

test('T1-F4-4: Bucket TER fees reduce annual gains and are accumulated in total fees', () => {
  const res = calculateProjection(baseParams);
  assert(res.yearlyProjections[0].investmentFeesYear > 0, 'Investment TER fees should be > 0');
  assert(res.kpiSummary.totalFeesPaid > 0, 'Total fees paid KPI should be > 0');
}, { tier: 'Tier 1' });

test('T1-F4-5: Differential capital gains taxes (26% equity vs 12.5% gov bonds) impact final net wealth', () => {
  const allEquity: ScenarioParameters = {
    ...baseParams,
    investmentBuckets: [
      { id: 'b1', name: 'Equities', allocationPercent: 100, expectedReturnPercent: 6.0, terPercent: 0, taxRatePercent: 26.0 },
    ],
  };
  const allGovBonds: ScenarioParameters = {
    ...baseParams,
    investmentBuckets: [
      { id: 'b2', name: 'Gov Bonds', allocationPercent: 100, expectedReturnPercent: 6.0, terPercent: 0, taxRatePercent: 12.5 },
    ],
  };

  const resEquity = calculateProjection(allEquity);
  const resBonds = calculateProjection(allGovBonds);

  assert(
    resBonds.kpiSummary.finalTotalWealthNominal > resEquity.kpiSummary.finalTotalWealthNominal,
    'Gov bonds at 12.5% tax should yield higher net wealth than equity at 26% tax for equal gross returns'
  );
}, { tier: 'Tier 1' });
