import { test } from '../harness/runner';
import {
  assert,
  assertEquals,
  assertWithinTolerance,
  assertNearEqual,
  assertThrows,
} from '../harness/asserts';
import { calculateProjection, ValidationError } from '../../lib/engine/calculator';
import { ScenarioParameters } from '../harness/types';

const defaultBaseParams: ScenarioParameters = {
  id: 'f1-test',
  name: 'Salary Boundary Test Scenario',
  description: 'Scenario for testing salary phase boundaries',
  timeHorizonYears: 5,
  inflationRatePercent: 0,
  tfrDivisor: 13.5,
  initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
  salaryPhases: [
    { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 1000 },
  ],
  pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
  investmentBuckets: [
    { id: 'b1', name: 'Global Equity', allocationPercent: 100, expectedReturnPercent: 5.0, terPercent: 0.0, taxRatePercent: 0.0 },
  ],
  taxes: { wealthTaxPercent: 0.0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 0 },
};

test('T2-F1-1: Single salary phase covering full 50-year maximum horizon boundary', () => {
  const params: ScenarioParameters = {
    ...defaultBaseParams,
    timeHorizonYears: 50,
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 50, annualGrossRAL: 50000, mensilita: 13, monthlyNetSavings: 1200 },
    ],
  };

  const result = calculateProjection(params);
  assertEquals(result.yearlyProjections.length, 50, 'Should produce exactly 50 rows');
  assertEquals(result.yearlyProjections[0].ral, 50000, 'Year 1 RAL should match');
  assertEquals(result.yearlyProjections[49].ral, 50000, 'Year 50 RAL should match');
}, { tier: 'Tier 2' });

test('T2-F1-2: Salary phase boundary gap (years 1..2 and 4..5) throws ValidationError', () => {
  const params: ScenarioParameters = {
    ...defaultBaseParams,
    timeHorizonYears: 5,
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 2, annualGrossRAL: 30000, mensilita: 13, monthlyNetSavings: 500 },
      { id: 'p2', startYear: 4, endYear: 5, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 800 },
    ],
  };

  assertThrows(() => {
    calculateProjection(params);
  }, /gap/i);
}, { tier: 'Tier 2' });

test('T2-F1-3: Salary phase boundary overlap (years 1..3 and 3..5) throws ValidationError', () => {
  const params: ScenarioParameters = {
    ...defaultBaseParams,
    timeHorizonYears: 5,
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 3, annualGrossRAL: 30000, mensilita: 13, monthlyNetSavings: 500 },
      { id: 'p2', startYear: 3, endYear: 5, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 800 },
    ],
  };

  assertThrows(() => {
    calculateProjection(params);
  }, /overlap/i);
}, { tier: 'Tier 2' });

test('T2-F1-4: Salary phase mensilita configuration (13 vs 14 mensilità)', () => {
  const params13: ScenarioParameters = {
    ...defaultBaseParams,
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 42000, mensilita: 13, monthlyNetSavings: 1000 },
    ],
  };
  const params14: ScenarioParameters = {
    ...defaultBaseParams,
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 42000, mensilita: 14, monthlyNetSavings: 1000 },
    ],
  };

  const res13 = calculateProjection(params13);
  const res14 = calculateProjection(params14);

  assertEquals(res13.yearlyProjections[0].ral, 42000, 'RAL for 13 mensilità');
  assertEquals(res14.yearlyProjections[0].ral, 42000, 'RAL for 14 mensilità');
}, { tier: 'Tier 2' });

test('T2-F1-5: Extreme RAL boundaries (€0 RAL vs €1,000,000 RAL)', () => {
  const paramsZero: ScenarioParameters = {
    ...defaultBaseParams,
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 0, mensilita: 13, monthlyNetSavings: 0 },
    ],
  };
  const params1M: ScenarioParameters = {
    ...defaultBaseParams,
    timeHorizonYears: 1,
    taxes: { ...defaultBaseParams.taxes, tfrSubtractedPercentage: 0.5 },
    salaryPhases: [
      { id: 'p1', startYear: 1, endYear: 1, annualGrossRAL: 1000000, mensilita: 13, monthlyNetSavings: 0 },
    ],
  };

  const resZero = calculateProjection(paramsZero);
  assertEquals(resZero.yearlyProjections[0].tfrAccruedYear, 0, 'Zero RAL should produce 0 TFR accrued');

  const res1M = calculateProjection(params1M);
  // TFR = 1,000,000 * (1 - 0.005) / 13.5 = 995,000 / 13.5 = 73,703.7037...
  const expectedTfr = (1000000 * 0.995) / 13.5;
  assertNearEqual(res1M.yearlyProjections[0].tfrAccruedYear, expectedTfr, 0.01, '1M RAL TFR accrued');
}, { tier: 'Tier 2' });
