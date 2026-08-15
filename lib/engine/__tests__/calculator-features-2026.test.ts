import { describe, it, expect } from 'vitest';
import { calculateProjection, calculateAnnualizedIRR } from '../calculator';
import { ScenarioParameters } from '../types';

describe('FIRE Calculator 2026 Features & Polish', () => {
  const baseTestScenario: ScenarioParameters = {
    id: 'test-2026-base',
    name: '2026 Baseline Contract Case',
    description: 'Testing CCNL Terziario 14 mensilita, IRR, Bonus, and TFR split',
    timeHorizonYears: 10,
    inflationRatePercent: 2.0,
    tfrDivisor: 13.5,
    initialWealth: {
      investedCapital: 10000,
      cashLiquidity: 5000,
      pensionBalance: 0,
      accumulatedTfr: 0,
    },
    salaryPhases: [
      {
        id: 'p1',
        startYear: 1,
        endYear: 10,
        annualGrossRAL: 37500,
        mensilita: 14,
        monthlyNetSavings: 600,
        extraSavings13th: 500,
        extraSavings14th: 500,
        annualBonusGross: 3750, // 10% bonus
        bonusTaxType: 'DETASSAZIONE_5',
        bonusInvestPercent: 100,
        tfrPensionAllocationPercent: 100,
      },
    ],
    pensionFund: {
      enabled: true,
      routeTfr: true,
      tfrPensionAllocationPercent: 100,
      employeeContributionPercent: 2.0,
      employerContributionPercent: 2.0,
      expectedReturnPercent: 4.0,
      terPercent: 0.3,
      taxRatePercent: 12.0,
      annualYieldTaxRatePercent: 0,
    },
    investmentBuckets: [
      {
        id: 'b1',
        name: 'Global Equities',
        allocationPercent: 100,
        expectedReturnPercent: 7.0,
        terPercent: 0.2,
        taxRatePercent: 26.0,
      },
    ],
    taxes: {
      wealthTaxPercent: 0.2,
      pensionDeductionCap: 5164.57,
      marginalIRPEFTaxRate: 35.0,
      tfrSubtractedPercentage: 0.5,
      tfrCompanyTaxRatePercent: 23.0,
      bonusSubstituteTaxRate: 5.0,
    },
  };

  describe('1. IRR (Money-Weighted Rate of Return / TIR) Calculation', () => {
    it('calculates 0% IRR when returns are 0% with regular cash contributions', () => {
      // If zero return and no fees/taxes, money in equals money out -> IRR = 0%
      const zeroReturnScenario: ScenarioParameters = {
        ...baseTestScenario,
        inflationRatePercent: 0,
        salaryPhases: [
          {
            id: 'p1',
            startYear: 1,
            endYear: 5,
            annualGrossRAL: 0,
            mensilita: 12,
            monthlyNetSavings: 500,
            extraSavings13th: 0,
            extraSavings14th: 0,
            annualBonusGross: 0,
          },
        ],
        pensionFund: {
          enabled: false,
          routeTfr: false,
          employeeContributionPercent: 0,
          employerContributionPercent: 0,
          expectedReturnPercent: 0,
          terPercent: 0,
          taxRatePercent: 0,
        },
        investmentBuckets: [
          {
            id: 'b1',
            name: 'Cash/Zero Return',
            allocationPercent: 100,
            expectedReturnPercent: 0,
            terPercent: 0,
            taxRatePercent: 0,
          },
        ],
        taxes: {
          wealthTaxPercent: 0,
          pensionDeductionCap: 5164.57,
          marginalIRPEFTaxRate: 35,
          tfrSubtractedPercentage: 0,
          tfrCompanyTaxRatePercent: 0,
        },
        initialWealth: {
          investedCapital: 1000,
          cashLiquidity: 0,
          pensionBalance: 0,
          accumulatedTfr: 0,
        },
        timeHorizonYears: 5,
      };

      const result = calculateProjection(zeroReturnScenario);
      expect(result.kpiSummary.irrAnnualPercent).toBeCloseTo(0, 1);
    });

    it('matches compound annual growth for a single lump sum without contributions', () => {
      const lumpSumRate = calculateAnnualizedIRR(10000, new Array(120).fill(0), 20000);
      // (20000/10000)^(1/10) - 1 = 2^(0.1) - 1 = 7.177%
      expect(lumpSumRate).toBeCloseTo(7.18, 1);
    });
  });

  describe('2. 13th & 14th Extra Savings & Performance Bonus Simulation', () => {
    it('injects 13th and 14th savings in months 6 and 12 and includes them in investment contributions', () => {
      const res = calculateProjection(baseTestScenario);
      const row1 = res.yearlyProjections[0];

      // Base monthly: 600 * 12 = 7200
      // 13th extra: 500
      // 14th extra: 500
      // Bonus: 3750 gross * (1 - 0.05) = 3562.50 net * 100% invested = 3562.50
      // Employee pension contrib: 2% of 37500 = 750 -> Tax Rebate = 750 * 35% = 262.50 (reinvested)
      // Total investment contributions = 7200 + 500 + 500 + 3562.50 + 262.50 = 12025.00
      expect(row1.savings13thYear).toBe(500);
      expect(row1.savings14thYear).toBe(500);
      expect(row1.bonusGrossYear).toBe(3750);
      expect(row1.bonusNetYear).toBeCloseTo(3562.5, 2);
      expect(row1.bonusInvestedYear).toBeCloseTo(3562.5, 2);
      expect(row1.reinvestedTaxRebateYear).toBeCloseTo(262.5, 2);
      expect(row1.investmentContributions).toBeCloseTo(12025.0, 2);
    });

    it('handles preferential 5% bonus tax vs ordinary IRPEF tax correctly', () => {
      const irpefBonusScenario: ScenarioParameters = {
        ...baseTestScenario,
        salaryPhases: [
          {
            ...baseTestScenario.salaryPhases[0],
            bonusTaxType: 'ORDINARIA_IRPEF',
          },
        ],
      };

      const resDetass = calculateProjection(baseTestScenario);
      const resIrpef = calculateProjection(irpefBonusScenario);

      // 5% tax net: 3750 * 0.95 = 3562.5
      // 35% tax net: 3750 * 0.65 = 2437.5
      expect(resDetass.yearlyProjections[0].bonusNetYear).toBeCloseTo(3562.5, 2);
      expect(resIrpef.yearlyProjections[0].bonusNetYear).toBeCloseTo(2437.5, 2);
      expect(resDetass.yearlyProjections[0].totalWealthNominal).toBeGreaterThan(
        resIrpef.yearlyProjections[0].totalWealthNominal
      );
    });
  });

  describe('3. TFR Percentage Routing (0%, 50%, 100%)', () => {
    it('routes 100% of TFR to Pension Fund when set to 100%', () => {
      const res = calculateProjection(baseTestScenario);
      const row1 = res.yearlyProjections[0];

      // TFR accrued = 37500 * (1 - 0.005) / 13.5 = 2763.888
      expect(row1.tfrPensionFlowYear).toBeCloseTo(row1.tfrAccruedYear, 2);
      expect(row1.tfrCompanyFlowYear).toBe(0);
      expect(row1.tfrCompanyBalance).toBe(0);
    });

    it('retains 100% of TFR in company when set to 0%', () => {
      const companyTfrScenario: ScenarioParameters = {
        ...baseTestScenario,
        salaryPhases: [
          {
            ...baseTestScenario.salaryPhases[0],
            tfrPensionAllocationPercent: 0,
          },
        ],
      };

      const res = calculateProjection(companyTfrScenario);
      const row1 = res.yearlyProjections[0];

      expect(row1.tfrPensionFlowYear).toBe(0);
      expect(row1.tfrCompanyFlowYear).toBeCloseTo(row1.tfrAccruedYear, 2);
      expect(row1.tfrCompanyBalance).toBeCloseTo(row1.tfrAccruedYear, 2);
    });

    it('splits TFR 50/50 between Company and Pension Fund when set to 50%', () => {
      const splitScenario: ScenarioParameters = {
        ...baseTestScenario,
        salaryPhases: [
          {
            ...baseTestScenario.salaryPhases[0],
            tfrPensionAllocationPercent: 50,
          },
        ],
      };

      const res = calculateProjection(splitScenario);
      const row1 = res.yearlyProjections[0];

      expect(row1.tfrPensionFlowYear).toBeCloseTo(row1.tfrAccruedYear / 2, 2);
      expect(row1.tfrCompanyFlowYear).toBeCloseTo(row1.tfrAccruedYear / 2, 2);
    });
  });

  describe('4. Gross vs Net Wealth Reconciliation', () => {
    it('ensures Net Wealth components sum exactly to totalWealthNominalNet', () => {
      const res = calculateProjection(baseTestScenario);
      for (const row of res.yearlyProjections) {
        const netSum =
          row.cashBalance +
          row.tfrCompanyBalanceNet +
          row.pensionFundBalanceNet +
          row.investmentPortfolioBalanceNet;

        expect(row.totalWealthNominalNet).toBeCloseTo(netSum, 4);
        expect(row.totalWealthNominal).toBeCloseTo(netSum, 4);
      }
    });

    it('ensures Gross Wealth components sum exactly to totalWealthNominalGross', () => {
      const res = calculateProjection(baseTestScenario);
      for (const row of res.yearlyProjections) {
        const grossSum =
          row.cashBalance +
          row.tfrCompanyBalanceGross +
          row.pensionFundBalanceGross +
          row.investmentPortfolioBalanceGross;

        expect(row.totalWealthNominalGross).toBeCloseTo(grossSum, 4);
      }
    });

    it('verifies KPI identity: Total Contributions + Total Net Gains = Final Total Net Wealth', () => {
      const res = calculateProjection(baseTestScenario);
      const { finalTotalWealthNominal, totalContributions, totalInvestmentGains } = res.kpiSummary;

      expect(totalContributions + totalInvestmentGains).toBeCloseTo(finalTotalWealthNominal, 4);
    });
  });

  describe('5. Inflation Toggle (On / Off)', () => {
    it('sets real wealth equal to nominal wealth when inflationEnabled is false', () => {
      const noInflScenario: ScenarioParameters = {
        ...baseTestScenario,
        inflationEnabled: false,
        inflationRatePercent: 3.5, // should be ignored when disabled
      };

      const res = calculateProjection(noInflScenario);
      for (const row of res.yearlyProjections) {
        expect(row.totalWealthRealNet).toBeCloseTo(row.totalWealthNominalNet, 4);
        expect(row.totalWealthRealGross).toBeCloseTo(row.totalWealthNominalGross, 4);
      }
    });

    it('discounts real wealth by inflation factor when inflationEnabled is true', () => {
      const inflScenario: ScenarioParameters = {
        ...baseTestScenario,
        inflationEnabled: true,
        inflationRatePercent: 2.0,
      };

      const res = calculateProjection(inflScenario);
      const year10Row = res.yearlyProjections[9];
      const expectedDiscount = Math.pow(1.02, 10);

      expect(year10Row.totalWealthRealNet).toBeCloseTo(year10Row.totalWealthNominalNet / expectedDiscount, 2);
    });
  });

  describe('6. Savings Allocation Split (0%, 25%, 50%, 75%, 100% to Pension Fund)', () => {
    it('allocates 100% of personal savings to ETF portfolio when set to 0%', () => {
      const zeroPensionSavings: ScenarioParameters = {
        ...baseTestScenario,
        pensionFund: {
          ...baseTestScenario.pensionFund,
          employeeContributionPercent: 0,
          employerContributionPercent: 0,
          savingsToPensionPercent: 0,
        },
      };

      const res = calculateProjection(zeroPensionSavings);
      const row1 = res.yearlyProjections[0];

      // Base savings = 600 * 12 + 500 + 500 + 3562.50 = 11762.50
      expect(row1.savingsToPensionYear).toBe(0);
      expect(row1.savingsToPortfolioYear).toBeCloseTo(11762.50, 2);
      expect(row1.pensionContributionEmployee).toBe(0);
      expect(row1.pensionTaxRebate).toBe(0);
    });

    it('allocates 50% to Pension Fund and 50% to ETF Portfolio, triggering tax deduction up to cap', () => {
      const split50Scenario: ScenarioParameters = {
        ...baseTestScenario,
        pensionFund: {
          ...baseTestScenario.pensionFund,
          employeeContributionPercent: 0,
          employerContributionPercent: 0,
          savingsToPensionPercent: 50,
          reinvestTaxRebate: false, // Keep in cash for easy inspection
        },
      };

      const res = calculateProjection(split50Scenario);
      const row1 = res.yearlyProjections[0];

      // Total available = 11762.50
      // 50% to Pension = 5881.25 (exceeds cap 5164.57)
      // 50% to ETF = 5881.25
      // Max deductible = 5164.57 -> Rebate = 5164.57 * 35% = 1807.60
      expect(row1.savingsToPensionYear).toBeCloseTo(5881.25, 2);
      expect(row1.savingsToPortfolioYear).toBeCloseTo(5881.25, 2);
      expect(row1.pensionContributionEmployee).toBeCloseTo(5881.25, 2);
      expect(row1.pensionTaxRebate).toBeCloseTo(5164.57 * 0.35, 2);
      expect(row1.cashBalance).toBeCloseTo(5000 + 5164.57 * 0.35, 2);
    });

    it('reinvests IRPEF tax rebate into ETF portfolio when reinvestTaxRebate is true', () => {
      const reinvestScenario: ScenarioParameters = {
        ...baseTestScenario,
        pensionFund: {
          ...baseTestScenario.pensionFund,
          employeeContributionPercent: 0,
          employerContributionPercent: 0,
          savingsToPensionPercent: 50,
          reinvestTaxRebate: true,
        },
      };

      const res = calculateProjection(reinvestScenario);
      const row1 = res.yearlyProjections[0];
      const rebate = 5164.57 * 0.35;

      // When reinvested, investmentContributions = savingsToPortfolio (5881.25) + rebate (1807.60) = 7688.85
      expect(row1.reinvestedTaxRebateYear).toBeCloseTo(rebate, 2);
      expect(row1.investmentContributions).toBeCloseTo(5881.25 + rebate, 2);
      expect(row1.cashBalance).toBe(5000); // Initial cash unchanged because rebate was reinvested
    });
  });

  describe('6. Auto-Maximize Tax Deductibility', () => {
    it('automatically calculates employee contribution % to exactly saturate deduction cap (€5,164.57) accounting for employer match', () => {
      const autoMaxScenario: ScenarioParameters = {
        ...baseTestScenario,
        salaryPhases: [
          {
            ...baseTestScenario.salaryPhases[0],
            annualGrossRAL: 37500,
            savingsToPensionPercent: 0,
          },
        ],
        pensionFund: {
          ...baseTestScenario.pensionFund,
          autoMaxDeductibility: true,
          employeeContributionPercent: 1.0, // should be overridden by auto-max
          employerContributionPercent: 1.55,
          savingsToPensionPercent: 0,
        },
        taxes: {
          ...baseTestScenario.taxes,
          pensionDeductionCap: 5164.57,
          marginalIRPEFTaxRate: 35.0,
        },
      };

      const res = calculateProjection(autoMaxScenario);
      const row1 = res.yearlyProjections[0];

      // RAL = 37,500
      // Employer 1.55% = 581.25
      // Remaining cap = 5164.57 - 581.25 = 4583.32
      // Employee % = 4583.32 / 37500 = 12.222%
      // pensionContributionEmployee = 4583.32
      // pensionContributionEmployer = 581.25
      expect(row1.pensionContributionEmployer).toBeCloseTo(581.25, 2);
      expect(row1.pensionContributionEmployee).toBeCloseTo(4583.32, 2);
      expect(row1.pensionContributionEmployee + row1.pensionContributionEmployer).toBeCloseTo(5164.57, 2);
      expect(row1.pensionTaxRebate).toBeCloseTo(4583.32 * 0.35, 2);
    });

    it('works with custom deduction cap (e.g. €5,300)', () => {
      const customCapScenario: ScenarioParameters = {
        ...baseTestScenario,
        salaryPhases: [
          {
            ...baseTestScenario.salaryPhases[0],
            annualGrossRAL: 50000,
            savingsToPensionPercent: 0,
          },
        ],
        pensionFund: {
          ...baseTestScenario.pensionFund,
          autoMaxDeductibility: true,
          employeeContributionPercent: 2.0,
          employerContributionPercent: 2.0,
          savingsToPensionPercent: 0,
        },
        taxes: {
          ...baseTestScenario.taxes,
          pensionDeductionCap: 5300.0,
          marginalIRPEFTaxRate: 43.0,
        },
      };

      const res = calculateProjection(customCapScenario);
      const row1 = res.yearlyProjections[0];

      // Employer 2% of 50,000 = 1000
      // Remaining cap = 5300 - 1000 = 4300
      expect(row1.pensionContributionEmployer).toBeCloseTo(1000.0, 2);
      expect(row1.pensionContributionEmployee).toBeCloseTo(4300.0, 2);
      expect(row1.pensionContributionEmployee + row1.pensionContributionEmployer).toBeCloseTo(5300.0, 2);
      expect(row1.pensionTaxRebate).toBeCloseTo(4300.0 * 0.43, 2);
    });
  });
});

