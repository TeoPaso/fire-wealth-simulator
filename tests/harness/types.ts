/**
 * E2E Test Harness Type Definitions for FIRE PWA Project
 * Mirrors PROJECT.md § Interface Contracts for opaque-box testing.
 */

export interface SalaryPhase {
  id: string;
  startYear: number; // 1-indexed (e.g. 1)
  endYear: number; // inclusive (e.g. 3)
  annualGrossRAL: number; // e.g. 35000
  mensilita: number; // 13 or 14
  monthlyNetSavings: number; // e.g. 1000
  tfrDestination?: 'PENSION_FUND' | 'COMPANY_RETAINED';
}

export interface InvestmentBucket {
  id: string;
  name: string;
  allocationPercent: number; // e.g. 60 (sum must equal 100)
  expectedReturnPercent: number; // e.g. 7.0
  terPercent: number; // e.g. 0.2
  taxRatePercent: number; // 26 for equity/crypto, 12.5 for gov bonds
}

export interface PensionFundConfig {
  enabled: boolean;
  routeTfr: boolean;
  employeeContributionPercent: number; // % of RAL
  employerContributionPercent: number; // % of RAL
  expectedReturnPercent: number;
  terPercent: number;
  taxRatePercent: number; // 9 to 15%
}

export interface TaxConfig {
  wealthTaxPercent: number; // e.g. 0.2 (Imposta di bollo)
  pensionDeductionCap: number; // e.g. 5164.57
  marginalIRPEFTaxRate: number; // e.g. 35 or 43 % for pension rebate
  tfrSubtractedPercentage?: number;
  tfrCompanyFixedRevalRate?: number;
  tfrCompanyInflationWeight?: number;
}

export interface InitialWealth {
  investedCapital: number;
  cashLiquidity: number;
  pensionBalance: number;
  accumulatedTfr: number; // if kept in company
}

export interface ScenarioParameters {
  id: string;
  name: string;
  description: string;
  timeHorizonYears: number; // 1 to 50
  inflationRatePercent: number;
  tfrDivisor: number; // default 13.5
  initialWealth: InitialWealth;
  salaryPhases: SalaryPhase[];
  pensionFund: PensionFundConfig;
  investmentBuckets: InvestmentBucket[];
  taxes: TaxConfig;
}

export interface YearlyProjectionRow {
  year: number; // 1 to N
  age?: number;
  ral: number;
  netMonthlySavings: number;
  cashBalance: number;
  tfrAccruedYear: number;
  tfrCompanyBalance: number;
  pensionContributionEmployee: number;
  pensionContributionEmployer: number;
  pensionTaxRebate: number;
  pensionFundBalance: number;
  investmentContributions: number;
  investmentGainsYear: number;
  investmentFeesYear: number;
  investmentPortfolioBalance: number;
  totalWealthNominal: number;
  totalWealthReal: number;
  totalContributionsCumulative: number;
  totalGainsCumulative: number;
  totalFeesCumulative: number;
}

export interface ScenarioProjectionResult {
  scenarioId: string;
  parameters: ScenarioParameters;
  yearlyProjections: YearlyProjectionRow[];
  kpiSummary: {
    finalTotalWealthNominal: number;
    finalTotalWealthReal: number;
    averageAnnualReturnPercent: number;
    totalContributions: number;
    totalInvestmentGains: number;
    totalFeesPaid: number;
  };
}

export interface StorageSchemaV1 {
  version: 1;
  activeScenarioId: string;
  scenarios: ScenarioParameters[];
  language: 'it' | 'en';
}

export type TestTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | 'Tier 5' | 'Harness';

export interface TestCase {
  id: string;
  name: string;
  tier: TestTier;
  fn: () => void | Promise<void>;
}

export interface TestResult {
  id: string;
  name: string;
  tier: TestTier;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

export interface SuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  tierBreakdown: Record<TestTier, { total: number; passed: number; failed: number }>;
  results: TestResult[];
}
