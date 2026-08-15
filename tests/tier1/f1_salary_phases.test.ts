import { test } from '../harness/runner';
import { assertEquals, assertNearEqual, assertScenarioResultStructure } from '../harness/asserts';
import { calculateProjection } from '../../lib/engine/calculator';
import { ScenarioParameters } from '../harness/types';

const baseParams: ScenarioParameters = {
  id: 't1-f1-scenario',
  name: 'Salary Phases Test',
  description: 'Tier 1 tests for Feature 1 (Parametric Salary Phases)',
  timeHorizonYears: 10,
  inflationRatePercent: 0,
  tfrDivisor: 13.5,
  initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
  salaryPhases: [
    { id: 'p1', startYear: 1, endYear: 3, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 1000 },
    { id: 'p2', startYear: 4, endYear: 7, annualGrossRAL: 45000, mensilita: 13, monthlyNetSavings: 1500 },
    { id: 'p3', startYear: 8, endYear: 10, annualGrossRAL: 60000, mensilita: 14, monthlyNetSavings: 2000 },
  ],
  pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
  investmentBuckets: [
    { id: 'b1', name: 'Global Equities', allocationPercent: 100, expectedReturnPercent: 5, terPercent: 0, taxRatePercent: 0 },
  ],
  taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35 },
};

test('T1-F1-1: Single salary phase accurately sets RAL and net monthly savings across projection years', () => {
  const params: ScenarioParameters = {
    ...baseParams,
    timeHorizonYears: 3,
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 3, annualGrossRAL: 38000, mensilita: 13, monthlyNetSavings: 1100 },
    ],
  };

  const res = calculateProjection(params);
  assertScenarioResultStructure(res);
  assertEquals(res.yearlyProjections.length, 3);
  for (let y = 0; y < 3; y++) {
    assertEquals(res.yearlyProjections[y].ral, 38000);
    assertEquals(res.yearlyProjections[y].netMonthlySavings, 1100);
  }
}, { tier: 'Tier 1' });

test('T1-F1-2: Multi-phase salary progression correctly updates annual gross RAL and savings', () => {
  const res = calculateProjection(baseParams);
  assertScenarioResultStructure(res);

  // Phase 1 (years 1..3)
  assertEquals(res.yearlyProjections[0].ral, 35000);
  assertEquals(res.yearlyProjections[2].ral, 35000);
  assertEquals(res.yearlyProjections[0].netMonthlySavings, 1000);

  // Phase 2 (years 4..7)
  assertEquals(res.yearlyProjections[3].ral, 45000);
  assertEquals(res.yearlyProjections[6].ral, 45000);
  assertEquals(res.yearlyProjections[3].netMonthlySavings, 1500);

  // Phase 3 (years 8..10)
  assertEquals(res.yearlyProjections[7].ral, 60000);
  assertEquals(res.yearlyProjections[9].ral, 60000);
  assertEquals(res.yearlyProjections[7].netMonthlySavings, 2000);
}, { tier: 'Tier 1' });

test('T1-F1-3: Investment contributions per year equal netMonthlySavings * 12 for active salary phase', () => {
  const res = calculateProjection(baseParams);
  assertEquals(res.yearlyProjections[0].investmentContributions, 12000); // 1000 * 12
  assertEquals(res.yearlyProjections[3].investmentContributions, 18000); // 1500 * 12
  assertEquals(res.yearlyProjections[7].investmentContributions, 24000); // 2000 * 12
}, { tier: 'Tier 1' });

test('T1-F1-4: Annual gross RAL transition on boundary year switches values without lag or overlap', () => {
  const res = calculateProjection(baseParams);
  // Year 3: End of Phase 1 (35,000)
  assertEquals(res.yearlyProjections[2].ral, 35000);
  // Year 4: Start of Phase 2 (45,000)
  assertEquals(res.yearlyProjections[3].ral, 45000);
  // Year 7: End of Phase 2 (45,000)
  assertEquals(res.yearlyProjections[6].ral, 45000);
  // Year 8: Start of Phase 3 (60,000)
  assertEquals(res.yearlyProjections[7].ral, 60000);
}, { tier: 'Tier 1' });

test('T1-F1-5: Salary phase mensilità attribute is preserved in parameters and output row context', () => {
  const res = calculateProjection(baseParams);
  assertEquals(res.parameters.salaryPhases[0].mensilita, 13);
  assertEquals(res.parameters.salaryPhases[2].mensilita, 14);
}, { tier: 'Tier 1' });
