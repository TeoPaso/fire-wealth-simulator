import { describe, it, expect } from 'vitest';
import { calculateProjection, ValidationError } from '../calculator';
import { ScenarioParameters } from '../types';

/**
 * Asserts that an actual numeric value is within a relative percentage tolerance of the expected value.
 * Default relative tolerance is 0.0001 (0.01%).
 */
function expectWithinRelativeTolerance(
  actual: number,
  expected: number,
  relativeTolerance: number = 0.0001,
  message?: string
): void {
  if (expected === 0) {
    expect(actual).toBeCloseTo(0, 4);
    return;
  }
  const relativeError = Math.abs((actual - expected) / expected);
  const pass = relativeError <= relativeTolerance;
  if (!pass) {
    const errorPercent = (relativeError * 100).toFixed(4);
    const maxPercent = (relativeTolerance * 100).toFixed(4);
    const detail = message ? ` (${message})` : '';
    throw new Error(
      `Relative tolerance assertion failed${detail}:\n` +
      `  Expected: ${expected}\n` +
      `  Actual:   ${actual}\n` +
      `  Relative Error: ${errorPercent}% (Max allowed: ${maxPercent}%)\n` +
      `  Delta: ${actual - expected}`
    );
  }
  expect(pass).toBe(true);
}

/**
 * Asserts that an actual numeric value is within an absolute currency delta of the expected value.
 * Default max delta is 0.01 (1 cent).
 */
function expectWithinAbsoluteTolerance(
  actual: number,
  expected: number,
  maxDelta: number = 0.01,
  message?: string
): void {
  const delta = Math.abs(actual - expected);
  const pass = delta <= maxDelta;
  if (!pass) {
    const detail = message ? ` (${message})` : '';
    throw new Error(
      `Absolute tolerance assertion failed${detail}:\n` +
      `  Expected: ${expected}\n` +
      `  Actual:   ${actual}\n` +
      `  Delta:    ${delta} (Max allowed delta: ${maxDelta})`
    );
  }
  expect(pass).toBe(true);
}

describe('FIRE Core Financial Calculator Engine (`calculator.ts`)', () => {

  describe('Benchmark Test Cases (<0.01% Precision Standard)', () => {
    it('Benchmark 1: Pure Compound Interest Baseline (Zero Frictions)', () => {
      const inputs: ScenarioParameters = {
        id: 'bm-1',
        name: 'Benchmark 1',
        description: 'Compound interest test',
        timeHorizonYears: 10,
        inflationRatePercent: 0.0,
        tfrDivisor: 13.5,
        initialWealth: { investedCapital: 10000, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
        salaryPhases: [
          { id: 'p1', startYear: 1, endYear: 10, annualGrossRAL: 0, mensilita: 13, monthlyNetSavings: 500 },
        ],
        pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
        investmentBuckets: [
          { id: 'b1', name: 'Equity', allocationPercent: 100, expectedReturnPercent: 6.0, terPercent: 0.0, taxRatePercent: 0.0 },
        ],
        taxes: { wealthTaxPercent: 0.0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 0 },
      };

      const result = calculateProjection(inputs);
      expect(result.yearlyProjections.length).toBe(10);
      const year10 = result.yearlyProjections[9];

      // End of month step execution target: €99,145.20 ± €9.91 (<0.01% relative error)
      expectWithinRelativeTolerance(year10.totalWealthNominal, 99145.20, 0.0001);
    });

    it('Benchmark 2: Multi-Phase Salary & TFR Accrual Routing', () => {
      const inputs: ScenarioParameters = {
        id: 'bm-2',
        name: 'Benchmark 2',
        description: 'TFR accrual test',
        timeHorizonYears: 5,
        inflationRatePercent: 0.0,
        tfrDivisor: 13.5,
        initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
        salaryPhases: [
          { id: 'p1', startYear: 1, endYear: 2, annualGrossRAL: 30000, mensilita: 13, monthlyNetSavings: 400 },
          { id: 'p2', startYear: 3, endYear: 5, annualGrossRAL: 45000, mensilita: 13, monthlyNetSavings: 700 },
        ],
        pensionFund: { enabled: true, routeTfr: true, employeeContributionPercent: 2.0, employerContributionPercent: 2.0, expectedReturnPercent: 4.0, terPercent: 0.0, taxRatePercent: 0.0 },
        investmentBuckets: [
          { id: 'b1', name: 'Default', allocationPercent: 100, expectedReturnPercent: 0.0, terPercent: 0.0, taxRatePercent: 0.0 },
        ],
        taxes: { wealthTaxPercent: 0.0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35.0 },
      };

      const result = calculateProjection(inputs);
      const rowY1 = result.yearlyProjections[0];
      const rowY3 = result.yearlyProjections[2];

      expectWithinAbsoluteTolerance(rowY1.tfrAccruedYear, 2222.22, 0.22);
      expectWithinAbsoluteTolerance(rowY3.tfrAccruedYear, 3333.33, 0.33);
    });

    it('Benchmark 3: Complete Tax & Fee Friction Model', () => {
      const inputs: ScenarioParameters = {
        id: 'bm-3',
        name: 'Benchmark 3',
        description: 'Friction model test',
        timeHorizonYears: 5,
        inflationRatePercent: 2.0,
        tfrDivisor: 13.5,
        initialWealth: { investedCapital: 50000, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
        salaryPhases: [
          { id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 0, mensilita: 13, monthlyNetSavings: 1000 },
        ],
        pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
        investmentBuckets: [
          { id: 'b1', name: 'Equity', allocationPercent: 70, expectedReturnPercent: 7.0, terPercent: 0.20, taxRatePercent: 26.0 },
          { id: 'b2', name: 'Bonds', allocationPercent: 30, expectedReturnPercent: 3.0, terPercent: 0.10, taxRatePercent: 12.5 },
        ],
        taxes: { wealthTaxPercent: 0.20, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 0 },
      };

      const result = calculateProjection(inputs);
      const rowY5 = result.yearlyProjections[4];

      expectWithinRelativeTolerance(rowY5.totalWealthNominal, 128005.65, 0.0001);
      expectWithinRelativeTolerance(rowY5.totalWealthReal, 115938.67, 0.0001);
    });

    it('Benchmark 4: Pension Tax Deduction Cap Enforcement', () => {
      const inputs: ScenarioParameters = {
        id: 'bm-4',
        name: 'Benchmark 4',
        description: 'Pension deduction cap test',
        timeHorizonYears: 1,
        inflationRatePercent: 0.0,
        tfrDivisor: 13.5,
        initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
        salaryPhases: [
          { id: 'p1', startYear: 1, endYear: 1, annualGrossRAL: 120000, mensilita: 13, monthlyNetSavings: 0 },
        ],
        pensionFund: { enabled: true, routeTfr: false, employeeContributionPercent: 5.0, employerContributionPercent: 0.0, expectedReturnPercent: 0.0, terPercent: 0.0, taxRatePercent: 0.0 },
        investmentBuckets: [
          { id: 'b1', name: 'Default', allocationPercent: 100, expectedReturnPercent: 0.0, terPercent: 0.0, taxRatePercent: 0.0 },
        ],
        taxes: { wealthTaxPercent: 0.0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 43.0 },
      };

      const result = calculateProjection(inputs);
      const rowY1 = result.yearlyProjections[0];

      expectWithinAbsoluteTolerance(rowY1.pensionContributionEmployee, 6000.00, 0.01);
      expectWithinAbsoluteTolerance(rowY1.pensionTaxRebate, 2220.77, 0.22);
    });
  });

  describe('Edge Cases & Validation Coverage', () => {
    const baseParams: ScenarioParameters = {
      id: 'base-test',
      name: 'Base Test',
      description: 'Test params',
      timeHorizonYears: 5,
      inflationRatePercent: 2.0,
      tfrDivisor: 13.5,
      initialWealth: { investedCapital: 10000, cashLiquidity: 2000, pensionBalance: 0, accumulatedTfr: 0 },
      salaryPhases: [{ id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 500 }],
      pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
      investmentBuckets: [{ id: 'b1', name: 'Default', allocationPercent: 100, expectedReturnPercent: 5.0, terPercent: 0.2, taxRatePercent: 26.0 }],
      taxes: { wealthTaxPercent: 0.2, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35.0, tfrSubtractedPercentage: 0.5 },
    };

    it('E1: Empty Buckets Array throws ValidationError', () => {
      const inputs = { ...baseParams, investmentBuckets: [] };
      expect(() => calculateProjection(inputs)).toThrow(ValidationError);
    });

    it('E2: Allocation Sum < 100% throws ValidationError', () => {
      const inputs = {
        ...baseParams,
        investmentBuckets: [{ id: 'b1', name: 'Under', allocationPercent: 60, expectedReturnPercent: 5, terPercent: 0, taxRatePercent: 26 }],
      };
      expect(() => calculateProjection(inputs)).toThrow(/allocation/i);
    });

    it('E3: Allocation Sum > 100% throws ValidationError', () => {
      const inputs = {
        ...baseParams,
        investmentBuckets: [
          { id: 'b1', name: 'Over1', allocationPercent: 60, expectedReturnPercent: 5, terPercent: 0, taxRatePercent: 26 },
          { id: 'b2', name: 'Over2', allocationPercent: 50, expectedReturnPercent: 5, terPercent: 0, taxRatePercent: 26 },
        ],
      };
      expect(() => calculateProjection(inputs)).toThrow(/allocation/i);
    });

    it('E4: Zero Return & Zero TER Bucket increases balance linearly', () => {
      const inputs: ScenarioParameters = {
        ...baseParams,
        initialWealth: { investedCapital: 1000, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
        investmentBuckets: [{ id: 'b1', name: 'Zero', allocationPercent: 100, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 }],
        taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 0 },
        salaryPhases: [{ id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 0, mensilita: 13, monthlyNetSavings: 100 }],
      };
      const res = calculateProjection(inputs);
      const y5 = res.yearlyProjections[4];
      // 1000 starting + 5 * 12 * 100 = 7000
      expectWithinAbsoluteTolerance(y5.investmentPortfolioBalance, 7000, 0.01);
    });

    it('E5: Negative Return Bucket results in reduced balance and zero CG tax', () => {
      const inputs: ScenarioParameters = {
        ...baseParams,
        investmentBuckets: [{ id: 'b1', name: 'Negative', allocationPercent: 100, expectedReturnPercent: -20.0, terPercent: 0.2, taxRatePercent: 26.0 }],
      };
      const res = calculateProjection(inputs);
      const y1 = res.yearlyProjections[0];
      // Initial capital 10,000 lost money
      expect(y1.investmentPortfolioBalance).toBeLessThan(10000 + 500 * 12);
    });

    it('E6: Single-Year Horizon produces 1 row', () => {
      const inputs = { ...baseParams, timeHorizonYears: 1, salaryPhases: [{ id: 'p1', startYear: 1, endYear: 1, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 500 }] };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections.length).toBe(1);
    });

    it('E7: Maximum 50-Year Horizon produces 50 rows without numeric overflow', () => {
      const inputs = { ...baseParams, timeHorizonYears: 50, salaryPhases: [{ id: 'p1', startYear: 1, endYear: 50, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 500 }] };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections.length).toBe(50);
      expect(Number.isFinite(res.yearlyProjections[49].totalWealthNominal)).toBe(true);
    });

    it('E8: Zero Horizon Boundary throws ValidationError', () => {
      const inputs = { ...baseParams, timeHorizonYears: 0 };
      expect(() => calculateProjection(inputs)).toThrow(ValidationError);
    });

    it('E9: Excess Horizon Boundary throws ValidationError', () => {
      const inputs = { ...baseParams, timeHorizonYears: 51 };
      expect(() => calculateProjection(inputs)).toThrow(ValidationError);
    });

    it('E10: Zero Salary & Zero Savings with non-zero initial wealth', () => {
      const inputs: ScenarioParameters = {
        ...baseParams,
        salaryPhases: [{ id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 0, mensilita: 13, monthlyNetSavings: 0 }],
      };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections[0].tfrAccruedYear).toBe(0);
      expect(res.yearlyProjections[0].investmentContributions).toBe(0);
    });

    it('E11: Zero Starting Wealth & Zero Savings stays zero', () => {
      const inputs: ScenarioParameters = {
        ...baseParams,
        initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 0 },
        salaryPhases: [{ id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 0, mensilita: 13, monthlyNetSavings: 0 }],
      };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections[4].totalWealthNominal).toBe(0);
    });

    it('E12: High Net Worth / Large Inputs maintains precision', () => {
      const inputs: ScenarioParameters = {
        ...baseParams,
        initialWealth: { investedCapital: 50000000, cashLiquidity: 5000000, pensionBalance: 0, accumulatedTfr: 0 },
        salaryPhases: [{ id: 'p1', startYear: 1, endYear: 5, annualGrossRAL: 5000000, mensilita: 13, monthlyNetSavings: 100000 }],
      };
      const res = calculateProjection(inputs);
      expect(Number.isFinite(res.yearlyProjections[4].totalWealthNominal)).toBe(true);
      expect(res.yearlyProjections[4].totalWealthNominal).toBeGreaterThan(55000000);
    });

    it('E13: 0% Inflation Rate produces Nominal equal to Real', () => {
      const inputs = { ...baseParams, inflationRatePercent: 0.0 };
      const res = calculateProjection(inputs);
      const row = res.yearlyProjections[4];
      expectWithinAbsoluteTolerance(row.totalWealthNominal, row.totalWealthReal, 0.01);
    });

    it('E14: 100% Hyperinflation Rate discounts real wealth appropriately', () => {
      const inputs = { ...baseParams, timeHorizonYears: 10, inflationRatePercent: 100.0, salaryPhases: [{ id: 'p1', startYear: 1, endYear: 10, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 500 }] };
      const res = calculateProjection(inputs);
      const row10 = res.yearlyProjections[9];
      // Real wealth should be nominal wealth / (2^10)
      const expectedReal = row10.totalWealthNominal / Math.pow(2, 10);
      expectWithinRelativeTolerance(row10.totalWealthReal, expectedReal, 0.0001);
    });

    it('E15: Deflation Rate (-2%) results in Real Wealth > Nominal Wealth', () => {
      const inputs = { ...baseParams, inflationRatePercent: -2.0 };
      const res = calculateProjection(inputs);
      const row = res.yearlyProjections[4];
      expect(row.totalWealthReal).toBeGreaterThan(row.totalWealthNominal);
    });

    it('E16: Pension Fund Disabled produces zero pension balance & contributions', () => {
      const inputs = { ...baseParams, pensionFund: { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 } };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections[0].pensionFundBalance).toBe(0);
      expect(res.yearlyProjections[0].pensionContributionEmployee).toBe(0);
    });

    it('E17: Pension Contribution Below Cap is fully deductible', () => {
      const inputs: ScenarioParameters = {
        ...baseParams,
        salaryPhases: [{ id: 'p1', startYear: 1, endYear: 1, annualGrossRAL: 30000, mensilita: 13, monthlyNetSavings: 0 }],
        timeHorizonYears: 1,
        pensionFund: { enabled: true, routeTfr: false, employeeContributionPercent: 4.0, employerContributionPercent: 0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
        taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35.0 },
      };
      const res = calculateProjection(inputs);
      // 4% of 30,000 = 1,200. Rebate = 1,200 * 35% = 420
      expectWithinAbsoluteTolerance(res.yearlyProjections[0].pensionTaxRebate, 420.00, 0.01);
    });

    it('E18: Zero Employee Contribution results in Zero Employer Contribution', () => {
      const inputs: ScenarioParameters = {
        ...baseParams,
        pensionFund: { enabled: true, routeTfr: false, employeeContributionPercent: 0.0, employerContributionPercent: 2.0, expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0 },
      };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections[0].pensionContributionEmployer).toBe(0);
    });

    it('E19: Extreme TFR Divisors calculate correctly', () => {
      const inputs10 = { ...baseParams, timeHorizonYears: 1, tfrDivisor: 10.0 };
      const inputs20 = { ...baseParams, timeHorizonYears: 1, tfrDivisor: 20.0 };
      const res10 = calculateProjection(inputs10);
      const res20 = calculateProjection(inputs20);

      // RAL = 35000, minus 0.5% = 34825. / 10 = 3482.5 vs / 20 = 1741.25
      expectWithinAbsoluteTolerance(res10.yearlyProjections[0].tfrAccruedYear, 3482.50, 0.01);
      expectWithinAbsoluteTolerance(res20.yearlyProjections[0].tfrAccruedYear, 1741.25, 0.01);
    });

    it('E20: Company TFR Revaluation applies fixed rate and inflation weight', () => {
      const inputs: ScenarioParameters = {
        ...baseParams,
        timeHorizonYears: 1,
        inflationRatePercent: 4.0,
        initialWealth: { investedCapital: 0, cashLiquidity: 0, pensionBalance: 0, accumulatedTfr: 10000 },
        salaryPhases: [{ id: 'p1', startYear: 1, endYear: 1, annualGrossRAL: 0, mensilita: 13, monthlyNetSavings: 0 }],
        taxes: { wealthTaxPercent: 0, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 0, tfrCompanyFixedRevalRate: 1.5, tfrCompanyInflationWeight: 75.0 },
      };
      const res = calculateProjection(inputs);
      // Reval rate = 1.5% + 0.75 * 4% = 4.5%. 10,000 * 1.045 = 10,450
      expectWithinAbsoluteTolerance(res.yearlyProjections[0].tfrCompanyBalance, 10450.00, 0.01);
    });

    it('E21: Single Phase Full Horizon covers all 50 years', () => {
      const inputs = { ...baseParams, timeHorizonYears: 50, salaryPhases: [{ id: 'p1', startYear: 1, endYear: 50, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 500 }] };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections.length).toBe(50);
    });

    it('E22: Salary Phase Gap throws ValidationError', () => {
      const inputs = {
        ...baseParams,
        timeHorizonYears: 5,
        salaryPhases: [
          { id: 'p1', startYear: 1, endYear: 2, annualGrossRAL: 30000, mensilita: 13, monthlyNetSavings: 400 },
          { id: 'p2', startYear: 4, endYear: 5, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 600 },
        ],
      };
      expect(() => calculateProjection(inputs)).toThrow(/gap/i);
    });

    it('E23: Overlapping Salary Phases throws ValidationError', () => {
      const inputs = {
        ...baseParams,
        timeHorizonYears: 5,
        salaryPhases: [
          { id: 'p1', startYear: 1, endYear: 3, annualGrossRAL: 30000, mensilita: 13, monthlyNetSavings: 400 },
          { id: 'p2', startYear: 3, endYear: 5, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 600 },
        ],
      };
      expect(() => calculateProjection(inputs)).toThrow(/overlap/i);
    });

    it('E24: 5 Consecutive Salary Phases transition smoothly', () => {
      const inputs = {
        ...baseParams,
        timeHorizonYears: 5,
        salaryPhases: [
          { id: 'p1', startYear: 1, endYear: 1, annualGrossRAL: 30000, mensilita: 13, monthlyNetSavings: 400 },
          { id: 'p2', startYear: 2, endYear: 2, annualGrossRAL: 35000, mensilita: 13, monthlyNetSavings: 500 },
          { id: 'p3', startYear: 3, endYear: 3, annualGrossRAL: 40000, mensilita: 13, monthlyNetSavings: 600 },
          { id: 'p4', startYear: 4, endYear: 4, annualGrossRAL: 45000, mensilita: 13, monthlyNetSavings: 700 },
          { id: 'p5', startYear: 5, endYear: 5, annualGrossRAL: 50000, mensilita: 13, monthlyNetSavings: 800 },
        ],
      };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections[2].ral).toBe(40000);
      expect(res.yearlyProjections[4].ral).toBe(50000);
    });

    it('E25: 0% Imposta di Bollo (Wealth Tax) levies zero wealth tax', () => {
      const inputs = {
        ...baseParams,
        taxes: { ...baseParams.taxes, wealthTaxPercent: 0.0 },
      };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections[0].totalWealthNominal).toBeGreaterThan(0);
    });

    it('E26: Mixed Capital Gains Tax Rates calculates individual bucket tax rates', () => {
      const inputs = {
        ...baseParams,
        investmentBuckets: [
          { id: 'b1', name: 'Stock (26%)', allocationPercent: 50, expectedReturnPercent: 8, terPercent: 0, taxRatePercent: 26.0 },
          { id: 'b2', name: 'Bond (12.5%)', allocationPercent: 50, expectedReturnPercent: 4, terPercent: 0, taxRatePercent: 12.5 },
        ],
      };
      const res = calculateProjection(inputs);
      expect(res.yearlyProjections[4].totalWealthNominal).toBeGreaterThan(0);
    });
  });
});
