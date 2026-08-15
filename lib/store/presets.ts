import { ScenarioParameters } from '../engine/types';

/**
 * Base Case Scenario Preset
 * Standard Italian white-collar baseline: €37.5k initial salary (CCNL Terziario 14 mensilità),
 * 70/30 global equity/bond split, 2.0% inflation, 100% TFR to Pension Fund, 5% bonus substitute tax.
 */
export const BASE_CASE_PRESET: ScenarioParameters = {
  id: 'preset-base',
  name: 'Base Case',
  description: 'Standard scenario: €37.5k salary (14 mensilità), 70/30 ETF split, 100% TFR to Pension Fund, 2.0% inflation, ~6.0% market return.',
  timeHorizonYears: 30,
  inflationRatePercent: 2.0,
  tfrDivisor: 13.5,
  initialWealth: {
    investedCapital: 15000,
    cashLiquidity: 5000,
    pensionBalance: 3000,
    accumulatedTfr: 4000,
  },
  salaryPhases: [
    {
      id: 'sp-base-1',
      startYear: 1,
      endYear: 5,
      annualGrossRAL: 35000,
      mensilita: 14,
      monthlyNetSavings: 600,
      extraSavings13th: 500,
      extraSavings14th: 500,
      annualBonusGross: 2500,
      bonusTaxType: 'DETASSAZIONE_5',
      bonusInvestPercent: 100,
      tfrPensionAllocationPercent: 100,
    },
    {
      id: 'sp-base-2',
      startYear: 6,
      endYear: 15,
      annualGrossRAL: 48000,
      mensilita: 14,
      monthlyNetSavings: 900,
      extraSavings13th: 750,
      extraSavings14th: 750,
      annualBonusGross: 4000,
      bonusTaxType: 'DETASSAZIONE_5',
      bonusInvestPercent: 100,
      tfrPensionAllocationPercent: 100,
    },
    {
      id: 'sp-base-3',
      startYear: 16,
      endYear: 30,
      annualGrossRAL: 60000,
      mensilita: 14,
      monthlyNetSavings: 1300,
      extraSavings13th: 1000,
      extraSavings14th: 1000,
      annualBonusGross: 6000,
      bonusTaxType: 'ORDINARIA_IRPEF',
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
    annualYieldTaxRatePercent: 20.0,
  },
  investmentBuckets: [
    {
      id: 'ib-base-1',
      name: 'Global Equities (VWCE)',
      allocationPercent: 70,
      expectedReturnPercent: 7.0,
      terPercent: 0.22,
      taxRatePercent: 26.0,
    },
    {
      id: 'ib-base-2',
      name: 'Government & Aggregate Bonds (AGGH)',
      allocationPercent: 30,
      expectedReturnPercent: 3.5,
      terPercent: 0.10,
      taxRatePercent: 12.5,
    },
  ],
  taxes: {
    wealthTaxPercent: 0.2,
    pensionDeductionCap: 5164.57,
    marginalIRPEFTaxRate: 35.0,
    tfrSubtractedPercentage: 0.5,
    tfrCompanyTaxRatePercent: 23.0,
    tfrCompanyFixedRevalRate: 1.5,
    tfrCompanyInflationWeight: 75.0,
    bonusSubstituteTaxRate: 5.0,
    pensionAnnualYieldTaxRate: 20.0,
  },
};

/**
 * Pessimistic Case Scenario Preset
 * Conservative scenario: lower market growth (4.0%), higher inflation (3.5%),
 * 100% TFR retained in company, higher fund fees.
 */
export const PESSIMISTIC_CASE_PRESET: ScenarioParameters = {
  id: 'preset-pessimistic',
  name: 'Pessimistic Case',
  description: 'Conservative scenario: lower growth (4.0%), higher inflation (3.5%), TFR retained in company, cautious allocation.',
  timeHorizonYears: 30,
  inflationRatePercent: 3.5,
  tfrDivisor: 13.5,
  initialWealth: {
    investedCapital: 10000,
    cashLiquidity: 5000,
    pensionBalance: 2000,
    accumulatedTfr: 3000,
  },
  salaryPhases: [
    {
      id: 'sp-pess-1',
      startYear: 1,
      endYear: 10,
      annualGrossRAL: 32000,
      mensilita: 13,
      monthlyNetSavings: 400,
      extraSavings13th: 200,
      extraSavings14th: 0,
      annualBonusGross: 0,
      bonusTaxType: 'DETASSAZIONE_5',
      bonusInvestPercent: 100,
      tfrPensionAllocationPercent: 0,
    },
    {
      id: 'sp-pess-2',
      startYear: 11,
      endYear: 30,
      annualGrossRAL: 38000,
      mensilita: 13,
      monthlyNetSavings: 500,
      extraSavings13th: 250,
      extraSavings14th: 0,
      annualBonusGross: 0,
      bonusTaxType: 'DETASSAZIONE_5',
      bonusInvestPercent: 100,
      tfrPensionAllocationPercent: 0,
    },
  ],
  pensionFund: {
    enabled: true,
    routeTfr: false,
    tfrPensionAllocationPercent: 0,
    employeeContributionPercent: 1.0,
    employerContributionPercent: 1.0,
    expectedReturnPercent: 2.5,
    terPercent: 0.8,
    taxRatePercent: 15.0,
    annualYieldTaxRatePercent: 20.0,
  },
  investmentBuckets: [
    {
      id: 'ib-pess-1',
      name: 'Active Equity Fund',
      allocationPercent: 50,
      expectedReturnPercent: 4.5,
      terPercent: 0.60,
      taxRatePercent: 26.0,
    },
    {
      id: 'ib-pess-2',
      name: 'Corporate Bonds Fund',
      allocationPercent: 40,
      expectedReturnPercent: 3.0,
      terPercent: 0.40,
      taxRatePercent: 26.0,
    },
    {
      id: 'ib-pess-3',
      name: 'Cash / Liquidity Reserves',
      allocationPercent: 10,
      expectedReturnPercent: 1.0,
      terPercent: 0.0,
      taxRatePercent: 26.0,
    },
  ],
  taxes: {
    wealthTaxPercent: 0.2,
    pensionDeductionCap: 5164.57,
    marginalIRPEFTaxRate: 28.0,
    tfrSubtractedPercentage: 0.5,
    tfrCompanyTaxRatePercent: 23.0,
    tfrCompanyFixedRevalRate: 1.5,
    tfrCompanyInflationWeight: 75.0,
    bonusSubstituteTaxRate: 5.0,
    pensionAnnualYieldTaxRate: 20.0,
  },
};

/**
 * Optimistic Case Scenario Preset
 * Bull/High-growth scenario: strong market returns (8.5%), low inflation (1.8%),
 * low-cost index ETFs, bonus plan with 5% substitute tax, aggressive savings.
 */
export const OPTIMISTIC_CASE_PRESET: ScenarioParameters = {
  id: 'preset-optimistic',
  name: 'Optimistic Case',
  description: 'High-growth scenario: strong returns (8.5%), 14 mensilità, 10% annual bonus, low fee ETFs, fast career progression.',
  timeHorizonYears: 30,
  inflationRatePercent: 1.8,
  tfrDivisor: 13.5,
  initialWealth: {
    investedCapital: 25000,
    cashLiquidity: 10000,
    pensionBalance: 5000,
    accumulatedTfr: 6000,
  },
  salaryPhases: [
    {
      id: 'sp-opt-1',
      startYear: 1,
      endYear: 5,
      annualGrossRAL: 42000,
      mensilita: 14,
      monthlyNetSavings: 1000,
      extraSavings13th: 800,
      extraSavings14th: 800,
      annualBonusGross: 4200,
      bonusTaxType: 'DETASSAZIONE_5',
      bonusInvestPercent: 100,
      tfrPensionAllocationPercent: 100,
    },
    {
      id: 'sp-opt-2',
      startYear: 6,
      endYear: 12,
      annualGrossRAL: 65000,
      mensilita: 14,
      monthlyNetSavings: 1800,
      extraSavings13th: 1200,
      extraSavings14th: 1200,
      annualBonusGross: 6500,
      bonusTaxType: 'ORDINARIA_IRPEF',
      bonusInvestPercent: 100,
      tfrPensionAllocationPercent: 100,
    },
    {
      id: 'sp-opt-3',
      startYear: 13,
      endYear: 30,
      annualGrossRAL: 90000,
      mensilita: 14,
      monthlyNetSavings: 2800,
      extraSavings13th: 2000,
      extraSavings14th: 2000,
      annualBonusGross: 9000,
      bonusTaxType: 'ORDINARIA_IRPEF',
      bonusInvestPercent: 100,
      tfrPensionAllocationPercent: 100,
    },
  ],
  pensionFund: {
    enabled: true,
    routeTfr: true,
    tfrPensionAllocationPercent: 100,
    employeeContributionPercent: 3.0,
    employerContributionPercent: 3.0,
    expectedReturnPercent: 5.5,
    terPercent: 0.15,
    taxRatePercent: 9.0,
    annualYieldTaxRatePercent: 20.0,
  },
  investmentBuckets: [
    {
      id: 'ib-opt-1',
      name: 'S&P 500 / Tech Index (VUAA / QDVE)',
      allocationPercent: 80,
      expectedReturnPercent: 9.5,
      terPercent: 0.07,
      taxRatePercent: 26.0,
    },
    {
      id: 'ib-opt-2',
      name: 'Global Government Bonds (VAGF)',
      allocationPercent: 20,
      expectedReturnPercent: 4.5,
      terPercent: 0.10,
      taxRatePercent: 12.5,
    },
  ],
  taxes: {
    wealthTaxPercent: 0.2,
    pensionDeductionCap: 5164.57,
    marginalIRPEFTaxRate: 43.0,
    tfrSubtractedPercentage: 0.5,
    tfrCompanyTaxRatePercent: 23.0,
    tfrCompanyFixedRevalRate: 1.5,
    tfrCompanyInflationWeight: 75.0,
    bonusSubstituteTaxRate: 5.0,
    pensionAnnualYieldTaxRate: 20.0,
  },
};

/**
 * Array of standard default presets
 */
export const DEFAULT_PRESETS: ScenarioParameters[] = [
  BASE_CASE_PRESET,
  PESSIMISTIC_CASE_PRESET,
  OPTIMISTIC_CASE_PRESET,
];

/**
 * Returns a deep copy of default scenario presets to prevent accidental mutation of defaults.
 */
export function getDefaultPresets(): ScenarioParameters[] {
  return JSON.parse(JSON.stringify(DEFAULT_PRESETS));
}
