import { test } from '../harness/runner';
import { assertEquals, assertNearEqual, assert, assertScenarioResultStructure } from '../harness/asserts';
import { calculateProjection } from '../../lib/engine/calculator';
import { ScenarioParameters } from '../harness/types';

const baseParams: ScenarioParameters = {
  id: 't1-f3-scenario',
  name: 'Pension Fund Test',
  description: 'Tier 1 tests for Feature 3 (Parametric Pension Fund)',
  timeHorizonYears: 5,
  inflationRatePercent: 0,
  tfrDivisor: 13.5,
  initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
  salaryPhases: [
    { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 50000, mensilita: 13, monthlyNetSavings: 1000 },
  ],
  pensionFund: {
    enabled: true,
    routeTfr: false,
    employeeContributionPercent: 2.0, // 2% of 50k = 1,000
    employerContributionPercent: 1.5, // 1.5% of 50k = 750
    expectedReturnPercent: 4.0,
    terPercent: 0.3,
    taxRatePercent: 12.0,
  },
  investmentBuckets: [
    { id: 'b1', name: 'Equities', allocationPercent: 100, expectedReturnPercent: 5, terPercent: 0, taxRatePercent: 0 },
  ],
  taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35 },
};

test('T1-F3-1: Voluntary employee pension contribution is calculated as % of active RAL', () => {
  const res = calculateProjection(baseParams);
  assertScenarioResultStructure(res);
  // 2% of 50,000 = 1,000
  assertEquals(res.yearlyProjections[0].pensionContributionEmployee, 1000);
}, { tier: 'Tier 1' });

test('T1-F3-2: Employer matching contribution triggers when employee contribution > 0', () => {
  const res = calculateProjection(baseParams);
  // 1.5% of 50,000 = 750
  assertEquals(res.yearlyProjections[0].pensionContributionEmployer, 750);
}, { tier: 'Tier 1' });

test('T1-F3-3: Employer matching contribution is 0 when employee contribution is 0%', () => {
  const params: ScenarioParameters = {
    ...baseParams,
    pensionFund: {
      ...baseParams.pensionFund,
      employeeContributionPercent: 0,
      employerContributionPercent: 1.5,
    },
  };
  const res = calculateProjection(params);
  assertEquals(res.yearlyProjections[0].pensionContributionEmployee, 0);
  assertEquals(res.yearlyProjections[0].pensionContributionEmployer, 0);
}, { tier: 'Tier 1' });

test('T1-F3-4: IRPEF tax rebate is calculated up to deduction cap and added to cash liquidity', () => {
  const res = calculateProjection(baseParams);
  // Employee contrib = 1,000 <= 5164.57 -> rebate = 1000 * 35% = 350
  assertEquals(res.yearlyProjections[0].pensionTaxRebate, 350);

  // High salary & contribution exceeding cap
  const highParams: ScenarioParameters = {
    ...baseParams,
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 200000, mensilita: 13, monthlyNetSavings: 1000 },
    ],
    pensionFund: {
      ...baseParams.pensionFund,
      employeeContributionPercent: 5.0, // 5% of 200k = 10,000 (> 5164.57)
    },
  };
  const highRes = calculateProjection(highParams);
  // Max rebate = 5164.57 * 35% = 1807.5995
  const expectedMaxRebate = 5164.57 * 0.35;
  assertNearEqual(highRes.yearlyProjections[0].pensionTaxRebate, expectedMaxRebate, 0.01);
}, { tier: 'Tier 1' });

test('T1-F3-5: Pension fund TER management fee reduces pension fund balance compounding', () => {
  const noFeeParams: ScenarioParameters = {
    ...baseParams,
    pensionFund: { ...baseParams.pensionFund, terPercent: 0 },
  };
  const feeParams: ScenarioParameters = {
    ...baseParams,
    pensionFund: { ...baseParams.pensionFund, terPercent: 1.5 },
  };

  const resNoFee = calculateProjection(noFeeParams);
  const resFee = calculateProjection(feeParams);

  assert(
    resNoFee.yearlyProjections[4].pensionFundBalance > resFee.yearlyProjections[4].pensionFundBalance,
    'Pension balance with TER fee should be lower than zero fee'
  );
}, { tier: 'Tier 1' });
