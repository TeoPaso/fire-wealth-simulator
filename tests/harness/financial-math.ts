/**
 * Reference Financial Math Formulas for FIRE PWA E2E Test Harness
 * Strictly based on ORIGINAL_REQUEST.md R1 & Acceptance Criteria.
 */

import { InvestmentBucket, ScenarioParameters } from './types';

/**
 * Standard Compound Interest for a Lump Sum:
 * FV = P * (1 + r)^t
 */
export function calculateCompoundInterest(
  principal: number,
  annualRatePercent: number,
  years: number
): number {
  const r = annualRatePercent / 100;
  return principal * Math.pow(1 + r, years);
}

/**
 * Monthly Annuity Future Value (compounded monthly with effective monthly rate r_m = (1+r)^(1/12)-1 or nominal r/12):
 * Standard monthly annuity formula: FV = PMT * (((1 + r_m)^n - 1) / r_m)
 */
export function calculateMonthlyAnnuityFutureValue(
  monthlyContribution: number,
  annualRatePercent: number,
  years: number,
  compounding: 'nominal' | 'effective' = 'effective'
): number {
  if (annualRatePercent === 0) {
    return monthlyContribution * 12 * years;
  }
  const r = annualRatePercent / 100;
  const rm = compounding === 'effective' ? Math.pow(1 + r, 1 / 12) - 1 : r / 12;
  const totalMonths = years * 12;
  return monthlyContribution * ((Math.pow(1 + rm, totalMonths) - 1) / rm);
}

/**
 * Inflation Discounting (Nominal to Real):
 * Real = Nominal / (1 + i)^t
 * Where i is annual inflation rate fraction, t is years.
 */
export function discountForInflation(
  nominalValue: number,
  inflationRatePercent: number,
  years: number
): number {
  const i = inflationRatePercent / 100;
  if (i === 0 || years === 0) return nominalValue;
  return nominalValue / Math.pow(1 + i, years);
}

/**
 * TFR (Trattamento di Fine Rapporto) Accrual for 1 Year:
 * TFR = RAL / tfrDivisor
 * Default divisor = 13.5
 */
export function calculateTfrAccrual(ral: number, tfrDivisor: number = 13.5): number {
  if (tfrDivisor <= 0) throw new Error('tfrDivisor must be greater than 0');
  return ral / tfrDivisor;
}

/**
 * Pension Fund Tax Rebate (IRPEF Deduction):
 * Deductible contribution = min(Employee Contribution + Employer Contribution, pensionDeductionCap)
 * Rebate = Deductible Contribution * (marginalIRPEFTaxRate / 100)
 */
export function calculatePensionTaxRebate(
  employeeContribution: number,
  employerContribution: number,
  pensionDeductionCap: number = 5164.57,
  marginalIRPEFTaxRatePercent: number = 35
): number {
  const totalContrib = Math.max(0, employeeContribution) + Math.max(0, employerContribution);
  const deductible = Math.min(totalContrib, Math.max(0, pensionDeductionCap));
  return deductible * (marginalIRPEFTaxRatePercent / 100);
}

/**
 * Weighted Portfolio Metrics across Investment Buckets:
 * Allocation percentages must sum to 100%.
 */
export function calculateWeightedPortfolioMetrics(buckets: InvestmentBucket[]): {
  expectedReturnPercent: number;
  terPercent: number;
  taxRatePercent: number;
  netReturnPercent: number;
} {
  if (!buckets || buckets.length === 0) {
    return { expectedReturnPercent: 0, terPercent: 0, taxRatePercent: 0, netReturnPercent: 0 };
  }

  let totalAlloc = 0;
  let weightedReturn = 0;
  let weightedTer = 0;
  let weightedTax = 0;

  for (const b of buckets) {
    const allocFrac = b.allocationPercent / 100;
    totalAlloc += b.allocationPercent;
    weightedReturn += allocFrac * b.expectedReturnPercent;
    weightedTer += allocFrac * b.terPercent;
    weightedTax += allocFrac * b.taxRatePercent;
  }

  return {
    expectedReturnPercent: weightedReturn,
    terPercent: weightedTer,
    taxRatePercent: weightedTax,
    netReturnPercent: weightedReturn - weightedTer,
  };
}

/**
 * Ideal Simple Zero-Fee Zero-Tax Zero-Inflation Future Value Benchmark:
 * Combines initial capital growth and monthly contribution accumulation over N years.
 */
export function calculateSimpleZeroFeeProjection(
  initialCapital: number,
  monthlySavings: number,
  annualReturnPercent: number,
  years: number
): number {
  const lumpSumFV = calculateCompoundInterest(initialCapital, annualReturnPercent, years);
  const annuityFV = calculateMonthlyAnnuityFutureValue(monthlySavings, annualReturnPercent, years);
  return lumpSumFV + annuityFV;
}

/**
 * Get active RAL and net monthly savings for a given year (1-indexed) based on salary phases.
 */
export function getSalaryPhaseForYear(
  phases: ScenarioParameters['salaryPhases'],
  year: number
): { ral: number; monthlyNetSavings: number; mensilita: number } {
  const sorted = [...phases].sort((a, b) => a.startYear - b.startYear);
  for (const p of sorted) {
    if (year >= p.startYear && year <= p.endYear) {
      return { ral: p.annualGrossRAL, monthlyNetSavings: p.monthlyNetSavings, mensilita: p.mensilita };
    }
  }
  // Fallback to last phase if year extends beyond last endYear
  if (sorted.length > 0) {
    const last = sorted[sorted.length - 1];
    return { ral: last.annualGrossRAL, monthlyNetSavings: last.monthlyNetSavings, mensilita: last.mensilita };
  }
  return { ral: 0, monthlyNetSavings: 0, mensilita: 13 };
}
