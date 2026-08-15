import { test } from '../harness/runner';
import { assertEquals, assertNearEqual, assert, assertScenarioResultStructure } from '../harness/asserts';
import { calculateProjection } from '../../lib/engine/calculator';
import { ScenarioParameters } from '../harness/types';

const baseParams: ScenarioParameters = {
  id: 't1-f5-scenario',
  name: 'Initial Wealth Test',
  description: 'Tier 1 tests for Feature 5 (Initial Wealth & Liquidity)',
  timeHorizonYears: 3,
  inflationRatePercent: 0,
  tfrDivisor: 13.5,
  initialWealth: {
    investedCapital: 50000,
    cashLiquidity: 10000,
    pensionBalance: 15000,
    accumulatedTfr: 8000,
  },
  salaryPhases: [
    { id: 'p1', startYear: 1, endYear: 3, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 0 },
  ],
  pensionFund: { enabled: true, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 4, terPercent: 0, taxRatePercent: 0 },
  investmentBuckets: [
    { id: 'b1', name: 'Global Equities', allocationPercent: 100, expectedReturnPercent: 6, terPercent: 0, taxRatePercent: 0 },
  ],
  taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35, tfrSubtractedPercentage: 0.5 },
};

test('T1-F5-1: Starting invested capital (50,000) is loaded into portfolio at t=0 and grows in Year 1', () => {
  const res = calculateProjection(baseParams);
  assertScenarioResultStructure(res);
  // Year 1 investment balance should be 50,000 * 1.06 = 53,000
  assertNearEqual(res.yearlyProjections[0].investmentPortfolioBalance, 53000, 0.01);
}, { tier: 'Tier 1' });

test('T1-F5-2: Starting cash liquidity (10,000) is included in total wealth', () => {
  const res = calculateProjection(baseParams);
  // Total wealth at end of year 1 should reflect 53k investments + pension + company TFR + 10k cash
  assert(res.yearlyProjections[0].totalWealthNominal >= 83000, 'Total wealth includes starting cash');
}, { tier: 'Tier 1' });

test('T1-F5-3: Starting pension fund balance (15,000) compounds from year 1 at expected pension return', () => {
  const res = calculateProjection(baseParams);
  // 15,000 * 1.04 = 15,600
  assertNearEqual(res.yearlyProjections[0].pensionFundBalance, 15600, 0.01);
}, { tier: 'Tier 1' });

test('T1-F5-4: Starting accumulated company TFR (8,000) revalues and adds year 1 accrual', () => {
  const res = calculateProjection(baseParams);
  // Year 1 TFR accrued = (40000 * 0.995) / 13.5 = 2948.148
  // Revaluation = 8000 * (1 + 0.015) = 8120
  // Total TFR = 8120 + 2948.148 = 11068.148
  const expectedTfr = 8000 * 1.015 + (40000 * 0.995) / 13.5;
  assertNearEqual(res.yearlyProjections[0].tfrCompanyBalance, expectedTfr, 0.01);
}, { tier: 'Tier 1' });

test('T1-F5-5: Initial total contributions counter equals sum of all starting wealth balances', () => {
  const res = calculateProjection(baseParams);
  // Initial capital total = 50000 + 10000 + 15000 + 8000 = 83000
  // Plus Year 1 contributions: 0 monthly savings + 0 pension + 2948.148 TFR = 85948.148
  const expectedCumContrib = 83000 + (40000 * 0.995) / 13.5;
  assertNearEqual(res.yearlyProjections[0].totalContributionsCumulative, expectedCumContrib, 0.01);
}, { tier: 'Tier 1' });
