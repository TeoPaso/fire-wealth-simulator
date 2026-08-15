/**
 * TFR Destination Routing Option (Legacy / compatibility)
 */
export type TFRDestination = 'PENSION_FUND' | 'COMPANY_RETAINED' | 'CUSTOM_SPLIT';

/**
 * Tax Treatment for Annual Performance Bonus (Premio di Risultato / Variabile)
 */
export type BonusTaxType = 'DETASSAZIONE_5' | 'ORDINARIA_IRPEF' | 'CUSTOM';

/**
 * Multi-Phase Salary & Savings Configuration
 */
export interface SalaryPhase {
  id: string;
  startYear: number; // 1-indexed (e.g. 1)
  endYear: number; // inclusive (e.g. 3)
  annualGrossRAL: number; // Gross annual fixed salary in EUR (e.g. 37500)
  mensilita: number; // Number of salary installments per year (12, 13, or 14)
  monthlyNetSavings: number; // Regular net personal monthly savings allocated to investments (e.g. 600)
  extraSavings13th?: number; // Additional net savings invested from 13th salary installment in EUR (e.g. 500)
  extraSavings14th?: number; // Additional net savings invested from 14th salary installment in EUR (e.g. 500)
  annualBonusGross?: number; // Gross annual variable performance bonus in EUR (e.g. 3750)
  bonusTaxType?: BonusTaxType; // Tax treatment on variable bonus ('DETASSAZIONE_5' or 'ORDINARIA_IRPEF' or 'CUSTOM')
  bonusTaxRatePercent?: number; // Custom tax rate on bonus % if bonusTaxType === 'CUSTOM'
  bonusInvestPercent?: number; // Percentage of net bonus allocated to investments % (remainder goes to cash liquidity, e.g. 100)
  tfrDestination?: TFRDestination; // Phase-level TFR override (optional)
  tfrPensionAllocationPercent?: number; // Percentage of accrued TFR routed to Pension Fund (0 to 100). Default inherits from PensionFundConfig
  savingsToPensionPercent?: number; // Percentage of personal net savings allocated to voluntary Pension Fund contribution (0 to 100, e.g. 0%, 25%, 50%, 75%, 100%). Remainder goes to ETF portfolio.
}

/**
 * Personal Investment Asset Bucket
 */
export interface InvestmentBucket {
  id: string;
  name: string; // e.g. "Global Stocks", "Gov Bonds", "Gold"
  allocationPercent: number; // Allocation percentage (0..100, total across buckets must sum to 100)
  expectedReturnPercent: number; // Gross annual return rate % (e.g. 7.0)
  terPercent: number; // Total Expense Ratio / annual management fee % (e.g. 0.2)
  taxRatePercent: number; // Capital gains tax rate % (e.g. 26.0 for stocks, 12.5 for gov bonds)
}

/**
 * Complementary Pension Fund Configuration (Fondo Pensione Integrativo)
 */
export interface PensionFundConfig {
  enabled: boolean;
  routeTfr: boolean; // Legacy flag: if true and tfrPensionAllocationPercent is undefined, defaults to 100%
  tfrPensionAllocationPercent?: number; // Percentage of accrued TFR routed to pension fund (0 to 100: 0% = 100% company, 100% = 100% fund)
  savingsToPensionPercent?: number; // Default percentage of personal net savings routed to voluntary pension contributions (0 to 100)
  reinvestTaxRebate?: boolean; // If true, IRPEF tax rebate is reinvested into the investment portfolio; if false, retained as cash liquidity (default: true)
  autoMaxDeductibility?: boolean; // If true, automatically calculates employee contribution % to exactly saturate the tax deduction cap (€5,164.57 or custom)
  employeeContributionPercent: number; // Voluntary employee contribution (% of RAL)
  employerContributionPercent: number; // Employer matching contribution (% of RAL)
  expectedReturnPercent: number; // Expected gross annual return %
  terPercent: number; // Annual TER fee %
  taxRatePercent: number; // Effective tax rate on pension payout at retirement (typically 9% to 15%)
  annualYieldTaxRatePercent?: number; // Annual substitute tax on yields inside pension fund % (default 20.0% in Italy)
}

/**
 * Parametric Taxation & Regulatory Configuration
 */
export interface TaxConfig {
  wealthTaxPercent: number; // Annual Imposta di Bollo on financial assets % (default 0.2%)
  pensionDeductionCap: number; // Annual IRPEF tax deduction cap EUR (default €5,164.57)
  marginalIRPEFTaxRate: number; // Marginal IRPEF rate for cash tax rebate % (e.g. 35% or 43%)
  tfrSubtractedPercentage?: number; // Legal deduction base under Art. 3 L. 297/82 % (default 0.5%)
  tfrCompanyTaxRatePercent?: number; // Estimated separate taxation rate on company TFR at exit % (default 23.0%)
  tfrCompanyFixedRevalRate?: number; // Fixed annual TFR revaluation rate in company % (default 1.5%)
  tfrCompanyInflationWeight?: number; // Weight of inflation in company TFR revaluation % (default 75.0%)
  bonusSubstituteTaxRate?: number; // Preferential substitute tax rate on performance bonuses % (default 5.0%)
  pensionAnnualYieldTaxRate?: number; // Annual tax on yields inside pension fund % (default 20.0%)
}

/**
 * Initial Starting Balances & Liquid Capital
 */
export interface InitialWealth {
  investedCapital: number; // Starting liquid investment balance in EUR
  cashLiquidity: number; // Starting emergency fund / cash reserves in EUR
  pensionBalance: number; // Starting balance in pension fund in EUR
  accumulatedTfr: number; // Starting TFR accumulated in company/INPS in EUR
}

/**
 * Complete Scenario Parameters Envelope
 */
export interface ScenarioParameters {
  id: string;
  name: string;
  description: string;
  timeHorizonYears: number; // Time horizon in years (1 to 50)
  inflationEnabled?: boolean; // If false, inflation is disabled (0%); if true, inflationRatePercent is applied (default: true)
  inflationRatePercent: number; // Expected annual inflation rate % (default 2.0%)
  tfrDivisor: number; // Legal/custom TFR divisor (default 13.5)
  initialWealth: InitialWealth;
  salaryPhases: SalaryPhase[];
  pensionFund: PensionFundConfig;
  investmentBuckets: InvestmentBucket[];
  taxes: TaxConfig;
}

/**
 * Single Row in the Year-by-Year Simulation Table
 */
export interface YearlyProjectionRow {
  year: number; // 1-indexed year (1 to N)
  age?: number; // User age (optional display helper)
  ral: number; // Active Gross Annual Salary for year t
  netMonthlySavings: number; // Active monthly net savings rate for year t
  savings13thYear: number; // Additional net savings invested from 13th installment
  savings14thYear: number; // Additional net savings invested from 14th installment
  savingsToPensionYear?: number; // Net personal savings allocated to voluntary pension fund contribution in year t
  savingsToPortfolioYear?: number; // Net personal savings allocated to personal ETF/investment portfolio in year t
  bonusGrossYear: number; // Gross variable bonus earned in year t
  bonusNetYear: number; // Net variable bonus after tax
  bonusInvestedYear: number; // Net variable bonus injected into investments
  bonusCashYear: number; // Net variable bonus kept in cash liquidity
  cashBalance: number; // End-of-year cash & liquidity reserves in EUR
  tfrAccruedYear: number; // Total TFR accrued during year t
  tfrPensionFlowYear: number; // Portion of TFR routed to Pension Fund in year t
  tfrCompanyFlowYear: number; // Portion of TFR retained in company in year t
  tfrCompanyBalance: number; // End-of-year TFR accumulated in company (gross)
  tfrCompanyBalanceGross: number; // Gross TFR balance in company
  tfrCompanyBalanceNet: number; // Net TFR balance in company after separate tax liability
  pensionContributionEmployee: number; // Employee voluntary pension contribution for year t (including savings allocation)
  pensionContributionEmployer: number; // Employer matching pension contribution for year t
  pensionTaxRebate: number; // Annual IRPEF tax rebate received from pension contribution
  reinvestedTaxRebateYear?: number; // Portion of IRPEF tax rebate reinvested into investment portfolio
  pensionFundBalance: number; // End-of-year pension fund balance (gross)
  pensionFundBalanceGross: number; // Gross balance in pension fund
  pensionFundBalanceNet: number; // Net balance in pension fund post retirement tax liability
  investmentContributions: number; // Total personal savings + invested bonuses injected into buckets during year t
  investmentGainsYear: number; // Total investment returns earned across buckets in year t (net of TER and annual taxes)
  investmentFeesYear: number; // Total TER fees paid across buckets and pension in year t
  investmentPortfolioBalance: number; // End-of-year investment portfolio value (gross of latent capital gains tax, post-wealth tax)
  investmentPortfolioBalanceGross: number; // Gross investment portfolio value
  investmentPortfolioBalanceNet: number; // Net investment portfolio value after latent capital gains tax
  totalWealthNominal: number; // Total net worth at year t (nominal EUR, net of all latent tax liabilities)
  totalWealthNominalNet: number; // Explicit net total wealth
  totalWealthNominalGross: number; // Total gross wealth before exit/latent taxes
  totalWealthReal: number; // Total net worth at year t (real EUR, discounted by inflation)
  totalWealthRealNet: number; // Real net wealth
  totalWealthRealGross: number; // Real gross wealth
  totalContributionsCumulative: number; // Cumulative capital contributed from year 0 to year t
  totalGainsCumulative: number; // Cumulative gross gains earned from year 0 to year t
  totalFeesCumulative: number; // Cumulative TER fees paid from year 0 to year t
}

/**
 * High-Level Key Performance Indicator Summary
 */
export interface KPISummary {
  finalTotalWealthNominal: number; // Nominal net worth at year N (Net)
  finalTotalWealthNominalGross: number; // Nominal gross wealth at year N (Gross)
  finalTotalWealthReal: number; // Real net worth at year N
  irrAnnualPercent: number; // Internal Rate of Return / TIR (Money-Weighted Rate of Return % per annum)
  averageAnnualReturnPercent: number; // Alias to IRR for UI backwards compatibility
  totalContributions: number; // Total cumulative personal + employer + TFR capital injected over N years
  totalInvestmentGains: number; // Total cumulative net gains earned over N years (Final Net Wealth - Total Contributions)
  totalGrossGains: number; // Total cumulative gross investment returns before taxes & fees
  totalFeesPaid: number; // Total cumulative TER management fees paid over N years
  totalTaxesPaid: number; // Total cumulative wealth taxes & annual fees paid over N years
}

/**
 * Complete Output Result of Scenario Calculation Engine
 */
export interface ScenarioProjectionResult {
  scenarioId: string;
  parameters: ScenarioParameters;
  yearlyProjections: YearlyProjectionRow[];
  kpiSummary: KPISummary;
}
