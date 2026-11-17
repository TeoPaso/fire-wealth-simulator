/**
 * FIRE Planner Italia — engine contract (schema v2).
 *
 * Conventions (see docs/SPEC.md):
 * - Every money INPUT is in TODAY'S EUROS (purchasing power of the plan's start year) unless the field name ends in
 *   `Nominal`. The engine simulates in NOMINAL euros, one step per year, and every output row carries `priceIndex`
 *   (1 at t = 0) so the UI can show real values (nominal / priceIndex) or nominal values.
 * - Percentages are expressed as numbers in percent (7 means 7%), never as fractions, in inputs and outputs.
 * - t = 0 is the plan's start year; age at t is profile.currentAge + t. Flows inside a year follow the mid-year
 *   convention (a flow invested during year t earns sqrt(1 + r_t) - 1 in that year).
 * - The engine never mutates or silently "fixes" a Plan. validatePlan() returns Issues; run* functions throw
 *   PlanValidationError if any Issue has level 'error'.
 */

export const SCHEMA_VERSION = 2 as const;

/* ───────────────────────────── Tax & legal rules ───────────────────────────── */

export interface RateBand {
  /** Upper bound of the band in nominal € (inclusive); null = no upper bound. */
  upTo: number | null;
  ratePct: number;
}

export interface SourceRef {
  key: string;
  label: string;
  url: string;
}

/** All Italian legal/tax parameters. Versioned and editable; defaults live in lib/engine/rules/it2026.ts. */
export interface TaxRules {
  id: string; // e.g. 'IT-2026'
  label: string;
  referenceYear: number; // calendar year the nominal thresholds refer to (2026)
  irpef: {
    brackets: RateBand[]; // 23 / 33 / 43 in 2026
    /** Italian brackets/deductions are NOT indexed by law (fiscal drag). false = realistic default. */
    indexToInflation: boolean;
    /** art. 13 c.1 TUIR — detrazione lavoro dipendente, RC = reddito complessivo */
    employeeDeduction: {
      band1Limit: number; // 15000
      band1Amount: number; // 1955
      band2Limit: number; // 28000
      band2Base: number; // 1910
      band2Extra: number; // 1190  -> base + extra*(band2Limit-RC)/(band2Limit-band1Limit)
      band3Limit: number; // 50000 -> band2Base*(band3Limit-RC)/(band3Limit-band2Limit)
      bonusFrom: number; // 25000 (exclusive)
      bonusTo: number; // 35000 (inclusive)
      bonusAmount: number; // 65
    };
    /** art. 13 c.3 TUIR — detrazione redditi da pensione */
    pensionerDeduction: {
      band1Limit: number; // 8500
      band1Amount: number; // 1955
      band2Limit: number; // 28000
      band2Base: number; // 700
      band2Extra: number; // 1255
      band3Limit: number; // 50000
      bonusFrom: number; // 25000
      bonusTo: number; // 29000
      bonusAmount: number; // 50
    };
    /** L. 207/2024 c.4-9 — cuneo fiscale (structural from 2025). */
    cuneo: {
      /** Tax-free extra sum for employment income <= last upTo: pct × employment income (ADDED to net, not taxable). */
      exemptSumBands: RateBand[]; // [{8500,7.1},{15000,5.3},{20000,4.8}]
      extraDeductionAmount: number; // 1000
      extraDeductionFrom: number; // 20000 (exclusive)
      extraDeductionFullUpTo: number; // 32000
      extraDeductionZeroAt: number; // 40000
    };
    regionalSurchargeBands: RateBand[]; // addizionale regionale (progressive by band). Default: legal minimum 1.23% flat
    municipalSurchargePct: number; // addizionale comunale, flat on the whole taxable income
    municipalExemptionThreshold: number; // if taxable income <= threshold, municipal surcharge = 0
    /**
     * OPTIONAL (added by tax engine): trattamento integrativo (ex "bonus Renzi", DL 3/2020 art. 1 as amended by
     * L. 234/2021): tax-free `amount` paid in payroll to employees with RC <= `incomeLimit` whose gross IRPEF exceeds
     * the art. 13 c.1 deduction minus `capacityMargin`. Absent = not modelled.
     */
    supplementaryTreatment?: {
      amount: number; // 1200
      incomeLimit: number; // 15000
      capacityMargin: number; // 75
    };
  };
  inps: {
    employeeRatePct: number; // 9.19
    additionalRatePct: number; // 1 (on the part above additionalThreshold)
    additionalThreshold: number; // 56224 (2026, indexed yearly by law)
    ceiling: number; // 122295 massimale (2026, indexed)
    indexThresholdsToInflation: boolean; // true (INPS thresholds ARE indexed)
    pensionAccrualRatePct: number; // 33 — aliquota di computo for the montante contributivo
  };
  productivityBonus: {
    ratePct: number; // 1 (2026-2027, L. 199/2025)
    cap: number; // 5000
    priorYearIncomeLimit: number; // 80000
    validUntilYear: number | null; // 2027; after it the "after*" values apply (unless null)
    afterRatePct: number; // 10
    afterCap: number; // 3000
  };
  tfr: {
    divisor: number; // 13.5
    contributionPct: number; // 0.5 — subtracted from the annual quota (art. 3 c.15 L. 297/1982): quota = RAL/13.5 - 0.5%·RAL
    revalFixedPct: number; // 1.5
    revalInflationSharePct: number; // 75
    revalTaxPct: number; // 17 imposta sostitutiva on revaluation, yearly
  };
  pensionFund: {
    deductionCap: number; // 5300 from 2026 (employee + employer, TFR excluded). NOT indexed.
    yieldTaxPct: number; // 20 on net result
    govBondYieldTaxPct: number; // 12.5 on the white-list share
    exitTaxMaxPct: number; // 15
    exitTaxMinPct: number; // 9
    exitTaxReductionPerYearPct: number; // 0.3
    exitTaxReductionAfterYears: number; // 15
    earlyRedemptionTaxPct: number; // 23 (riscatto per altre cause / anticipazioni non sanitarie)
    maxCapitalSharePct: number; // 50 at retirement
    minMembershipYears: number; // 5
    ritaMaxYearsEarly: number; // 5 (10 if unemployed > 24 months — modelled only as a user choice)
    /** OPTIONAL (added by simulation engine): RITA window for the long-term unemployed (10). Absent = 2 × ritaMaxYearsEarly. */
    ritaMaxYearsEarlyUnemployed?: number;
    /** Riscatto totale per inoccupazione (art. 14 c.2 lett. c D.Lgs. 252/2005): allowed after MORE than 48 months → 4. */
    redemptionAfterUnemployedYears: number;
    /** The riscatto per inoccupazione is not allowed in the last N years before the old-age pension requirements → 5. */
    redemptionBlockedYearsBeforeOldAge: number;
  };
  investments: {
    capitalGainsPct: number; // 26
    govBondPct: number; // 12.5
    stampDutyPct: number; // 0.2 on securities deposit
    cashStampDuty: number; // 34.20 on current account
    cashStampDutyThreshold: number; // 5000 (average balance)
    cashInterestTaxPct: number; // 26
  };
  statePension: {
    oldAgeAge: number; // 67 (vecchiaia)
    oldAgeMinYears: number; // 20
    fallbackAge: number; // 71
    fallbackMinYears: number; // 5
    /** coefficienti di trasformazione (% of montante) by claim age. */
    transformationCoefficients: Record<string, number>;
    installmentsPerYear: number; // 13
  };
  sources: SourceRef[];
}

/* ───────────────────────────── Plan (inputs) ───────────────────────────── */

export type AssetKind = 'equity' | 'bond' | 'cash' | 'other';
export type BonusRegime = 'productivity' | 'ordinary' | 'pensionFund' | 'welfare';
export type RebalancingMode = 'flows' | 'annual';
export type WithdrawalStrategy = 'constantReal' | 'guardrails';
export type StatePensionMode = 'estimate' | 'contributivo';
export type RetirementMode = 'auto' | 'fixedAge';
export type VoluntaryPensionMode = 'none' | 'fillCap' | 'fixed';
/** How the pension fund is accessed (see Plan.pensionFund.accessMode). */
export type PensionFundAccessMode = 'retirement' | 'rita' | 'redemption';

export interface CareerPhase {
  id: string;
  label?: string;
  /** Phase lasts from the previous phase's untilAge (or currentAge) up to this age (exclusive). Must be increasing. */
  untilAge: number;
  /** Gross annual salary (RAL) at the START of the phase, in today's euros. */
  ralToday: number;
  /** Real (above-inflation) yearly raise inside the phase, %. */
  realRaisePct: number;
  /** 12, 13 or 14: only affects monthly figures shown in the UI (annual totals are RAL-based). */
  mensilita: number;
  /** Gross yearly variable bonus at the start of the phase, today's euros; grows with the salary. */
  bonusGrossToday: number;
  bonusRegime: BonusRegime;
  /** Employee contribution to the pension fund, % of RAL (withheld in payroll). */
  employeePensionPct: number;
  /** Employer contribution, % of RAL (paid only if employeePensionPct > 0). */
  employerPensionPct: number;
  /** Share of the TFR quota sent to the pension fund (0 or 100; partial only for members before 29/04/1993). */
  tfrToFundPct: number;
}

export interface LifeEvent {
  id: string;
  label: string;
  /** Age at which the event (first) happens. */
  age: number;
  /** Today's euros. Positive = expense (house, car), negative = inflow (inheritance, sale). */
  amountToday: number;
  /** 1 = one-off; N = repeats yearly for N years. */
  years: number;
}

export interface AssetClass {
  id: string;
  name: string;
  kind: AssetKind;
  /** Target allocation %, all assets must sum to 100. */
  allocationPct: number;
  /** Expected nominal COMPOUND (geometric, median) annual return before costs, %. */
  expectedReturnPct: number;
  /** Annual volatility of returns, % (used by Monte Carlo only). */
  volatilityPct: number;
  /** Annual product cost (TER), %. */
  terPct: number;
  /** Effective capital-gains tax rate, % (26 equity; 12.5 direct white-list govies; blended for bond ETFs). */
  taxRatePct: number;
}

export interface Holding {
  assetId: string;
  /** Current market value, €. */
  value: number;
  /** Fiscal cost basis (prezzo medio di carico × quantity), €. Defaults to value when unknown. */
  costBasis: number;
}

export interface Plan {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  notes: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO

  profile: {
    currentAge: number; // integer
    lifeExpectancy: number; // plan horizon: simulate until this age (inclusive)
    startYear: number; // calendar year of t = 0
  };

  career: CareerPhase[];

  retirement: {
    /** 'auto' = stop working at the computed FI age; 'fixedAge' = stop at fixedAge (to test a target). */
    mode: RetirementMode;
    fixedAge: number;
  };

  spending: {
    /** Monthly living expenses while working, today's euros (rent/mortgage included). */
    monthlyToday: number;
    /** Spending after stopping work, % of working spending. */
    retirementPct: number;
    events: LifeEvent[];
  };

  savingsPolicy: {
    /** Emergency fund kept in cash, in months of current expenses. Savings fill it before investing. */
    emergencyFundMonths: number;
    /** Extra voluntary pension contribution beyond employeePensionPct (withheld in payroll). */
    voluntaryPension: VoluntaryPensionMode;
    /** For 'fixed': yearly amount, today's euros. */
    voluntaryPensionFixedToday: number;
  };

  assets: {
    cash: number;
    holdings: Holding[];
    pensionFund: {
      balance: number;
      /** Part of the balance that will be taxed at exit (deducted contributions + employer + TFR). Default = balance. */
      taxableBasis: number;
      /** Calendar year of first enrolment (all membership periods count for the exit-tax reduction). */
      membershipStartYear: number;
    };
    /** TFR already accrued and kept by the employer (or INPS Tesoreria), €. */
    companyTfr: number;
    /** Years of service the companyTfr refers to (for the tassazione separata rate). */
    companyTfrYears: number;
    inps: {
      /** Contribution years already accrued. */
      contributionYears: number;
      /** Montante contributivo already accrued (from the INPS statement), €. 0 = unknown → engine estimates it. */
      montante: number;
    };
  };

  portfolio: {
    assets: AssetClass[];
    /** Correlation between equity-like and bond-like returns (MC). Equity-equity uses 0.85, bond-bond 0.7. */
    equityBondCorrelation: number;
    rebalancing: RebalancingMode;
  };

  pensionFund: {
    enabled: boolean;
    name: string;
    expectedReturnPct: number; // nominal compound, before costs
    volatilityPct: number;
    costPct: number; // ISC / TER, %
    /** Share of the fund invested in white-list government bonds (lowers the yield tax). */
    govBondSharePct: number;
    /** Correlation of the fund line with equities (MC). */
    equityCorrelation: number;
    /** Age at which the position is redeemed (default = state-pension age; RITA allows up to 5/10 years earlier). */
    accessAge: number;
    /**
     * How the position is accessed:
     * - 'retirement': ordinary benefit at max(accessAge, retirement age): capital share (≤ 50%) + annuity;
     * - 'rita': Rendita Integrativa Temporanea Anticipata — equal yearly instalments from accessAge until the
     *   state-pension age (accessAge ≥ oldAgeAge − ritaMaxYearsEarly, or − 10 years if unemployed > 24 months);
     * - 'redemption': riscatto totale per inoccupazione — 100% lump sum `redemptionAfterUnemployedYears` years after
     *   stopping work, taxed like a benefit (15% → 9%); not allowed within `redemptionBlockedYearsBeforeOldAge` years of
     *   the state-pension age (the engine then falls back to RITA from that window, with an info issue).
     */
    accessMode: PensionFundAccessMode;
    /** Share taken as lump sum at accessAge (max 50% by law unless the annuity would be tiny). */
    capitalSharePct: number;
    /** Annuity conversion rate applied to the remaining share at accessAge, % per year (nominal, not indexed). */
    annuityRatePct: number;
  };

  statePension: {
    mode: StatePensionMode;
    /** For 'estimate': expected NET monthly pension in today's euros (e.g. from INPS "La mia pensione futura"). */
    monthlyNetToday: number;
    /** Age at which the state pension is claimed (>= oldAgeAge unless user knows better). */
    claimAge: number;
    /** For 'contributivo': real GDP growth used to revalue the montante, % (montante grows at inflation + this). */
    realGdpGrowthPct: number;
    /** Share of inflation applied to pension indexation (perequazione), %. */
    indexationPct: number;
  };

  withdrawal: {
    /** Safe withdrawal rate used for the classic FIRE number (expenses / SWR). */
    swrPct: number;
    strategy: WithdrawalStrategy;
    /** For 'guardrails': spending cut applied while the withdrawal rate exceeds swrPct × 1.2. */
    guardrailCutPct: number;
  };

  market: {
    inflationPct: number;
    inflationVolatilityPct: number;
    /** Nominal gross interest on cash/conto deposito, %. */
    cashRatePct: number;
  };

  simulation: {
    monteCarloRuns: number; // e.g. 1000
    seed: number;
    /** Required Monte Carlo success probability for the "confident" FI age, %. */
    successTargetPct: number;
  };

  taxRules: TaxRules;
}

/* ───────────────────────────── Validation ───────────────────────────── */

export type IssueLevel = 'error' | 'warning' | 'info';

export interface Issue {
  level: IssueLevel;
  /** JSON-ish path of the offending field, e.g. 'career[1].untilAge' or 'portfolio.assets'. */
  path: string;
  /** Stable code used as i18n key suffix: issues.<code> */
  code: string;
  params?: Record<string, string | number>;
}

export class PlanValidationError extends Error {
  issues: Issue[];
  constructor(issues: Issue[]) {
    super(`Plan has ${issues.filter((i) => i.level === 'error').length} validation error(s)`);
    this.name = 'PlanValidationError';
    this.issues = issues;
  }
}

/* ───────────────────────────── Payroll ───────────────────────────── */

export interface PayrollInput {
  /** Nominal gross salary of the year (RAL), €. */
  ral: number;
  /** Bonus taxed ordinarily (added to RAL for INPS and IRPEF), €. */
  ordinaryBonus: number;
  /** Productivity bonus requested under the substitute regime, €. Excess over cap is taxed ordinarily. */
  productivityBonus: number;
  /** Prior-year employment income (for the productivity-bonus eligibility), €. */
  priorYearIncome: number;
  /** Employee pension contribution withheld in payroll (incl. voluntary), €. */
  employeePensionContribution: number;
  /** Employer pension contribution, €. */
  employerPensionContribution: number;
  calendarYear: number;
  /** Price index of the year (for indexing thresholds that are indexed by law/user choice). */
  priceIndex: number;
}

export interface PayrollBreakdown {
  gross: number; // ral + ordinaryBonus + productivityBonus
  inps: number; // employee social contributions (incl. on bonuses)
  deductiblePension: number; // employee contribution excluded from taxable income
  nonDeductiblePension: number; // employee contribution above the cap
  employerExcessTaxable: number; // employer contribution above the cap (becomes taxable)
  taxableIncome: number; // reddito complessivo used for IRPEF
  irpefGross: number;
  employeeDeduction: number;
  cuneoExtraDeduction: number;
  irpefNet: number;
  regionalSurcharge: number;
  municipalSurcharge: number;
  cuneoExemptSum: number; // tax-free sum added to net (income <= 20k)
  /** OPTIONAL (added by tax engine): trattamento integrativo, tax-free, added to net. computePayroll always sets it. */
  supplementaryTreatment?: number;
  productivityBonusTax: number; // substitute tax
  netIncome: number; // cash take-home for the year (after employee pension contributions)
  /** Taxes saved thanks to the deductible pension contributions (IRPEF + surcharges), €. */
  pensionTaxSaving: number;
  marginalRatePct: number; // IRPEF + surcharges marginal rate on the last euro of ordinary income
  averageRatePct: number; // (irpefNet + surcharges) / gross
}

/* ───────────────────────────── Simulation outputs ───────────────────────────── */

export type YearStatus = 'working' | 'retired';

/** One simulated year. ALL money fields are NOMINAL €. Divide by priceIndex for today's euros. */
export interface YearRow {
  t: number;
  age: number;
  calendarYear: number;
  status: YearStatus;
  priceIndex: number; // cumulative inflation factor at the START of the year (1 at t = 0)
  /**
   * OPTIONAL (added by simulation engine, always set by runPlan): price index at the END of the year (= next row's
   * priceIndex). Balances are end-of-year values: divide them by priceIndexEnd for today's euros (flows by priceIndex).
   */
  priceIndexEnd?: number;
  inflationPct: number; // inflation realised during the year

  // Income
  ral: number;
  bonusGross: number;
  /** OPTIONAL (added by simulation engine, always set): welfare bonus (tax-free benefit counted as income), €. */
  welfareBenefit?: number;
  payroll: PayrollBreakdown | null; // null when not working
  statePensionNet: number;
  /** OPTIONAL (added by simulation engine, always set): gross state pension and its IRPEF + surcharges, €. */
  statePensionGross?: number;
  statePensionTax?: number;
  pensionAnnuityNet: number;
  cashInterestNet: number;
  eventsInflow: number; // negative-amount life events (inheritance, …)

  // Outflows
  livingExpenses: number;
  eventsExpense: number;
  stampDuty: number; // bollo securities + cash

  // Savings & allocation
  netSavings: number; // netIncome + other income − expenses − events − bollo (can be negative)
  savingsRatePct: number | null; // netSavings / payroll.netIncome (working years only)
  /** Net flow into cash this year (negative when cash is drawn to cover expenses). */
  toEmergencyFund: number;
  toPortfolio: number;
  withdrawalGross: number; // portfolio sold to cover needs
  withdrawalTax: number; // capital-gains tax on those sales
  rebalancingTax: number;
  shortfall: number; // need not covered by accessible assets (> 0 means the plan failed this year)
  spendingCutPct: number; // guardrails

  // Pension fund
  pfEmployee: number;
  pfEmployer: number;
  pfTfr: number;
  pfBonus: number;
  pfReturn: number; // gross market return before costs and tax
  pfCosts: number;
  pfYieldTax: number;
  pfLumpSumNet: number; // capital paid at accessAge (net of exit tax)
  pfExitTax: number;

  // TFR kept by the employer
  tfrAccrued: number;
  tfrToFund: number;
  tfrToCompany: number;
  tfrRevaluationNet: number;
  tfrRevaluationTax: number;
  tfrPayoutNet: number; // paid at job exit
  tfrPayoutTax: number;

  // Personal portfolio
  portfolioReturn: number; // market return before costs
  portfolioCosts: number; // TER
  realizedGainsTax: number; // withdrawalTax + rebalancingTax

  // Balances at END of year (nominal €)
  cash: number;
  portfolioValue: number;
  portfolioCostBasis: number;
  portfolioByAsset: number[]; // same order as plan.portfolio.assets
  pensionFund: number;
  pensionFundTaxableBasis: number;
  companyTfr: number;
  inpsMontante: number;

  // Derived
  portfolioLatentTax: number;
  pensionFundNet: number; // value if redeemed at the ordinary exit-tax rate
  companyTfrNet: number;
  accessibleNet: number; // cash + portfolio − latent tax
  lockedNet: number; // pensionFundNet + companyTfrNet (while not yet paid out)
  netWorth: number; // accessibleNet + lockedNet
  /** Annual retirement spending / SWR at this year's prices — the classic FIRE target. */
  fireTarget: number;
}

/** Sums over the whole horizon, in TODAY'S euros (each year's flow divided by that year's priceIndex). */
export interface LifetimeTotals {
  grossIncome: number;
  netIncome: number;
  irpefAndSurcharges: number;
  inps: number;
  capitalGainsTax: number;
  stampDuty: number;
  pensionFundTaxes: number; // yield + exit
  tfrTaxes: number;
  productCosts: number; // TER portfolio + pension fund costs
  pensionTaxSaving: number;
  employerContributions: number;
}

export interface PlanSummary {
  /** Earliest age at which stopping work keeps accessible wealth >= 0 until lifeExpectancy (deterministic). */
  fiAge: number | null;
  /** Age at which work stops in the displayed plan (fiAge in 'auto' mode, fixedAge otherwise; fallback state-pension age). */
  retirementAge: number;
  yearsToFi: number | null;
  /** Classic FIRE number in today's euros: annual retirement spending / SWR. */
  fireNumberToday: number;
  netWorthTodayStart: number; // net worth at t = 0 (today's €)
  accessibleTodayStart: number;
  progressPct: number; // accessibleTodayStart / fireNumberToday
  /** First year (age) with shortfall > 0, if any. */
  depletionAge: number | null;
  success: boolean;
  netWorthAtRetirementToday: number;
  accessibleAtRetirementToday: number;
  finalNetWorthToday: number;
  avgSavingsRatePct: number | null;
  statePensionAnnualNetToday: number; // at claim age, in today's euros
  statePensionClaimAge: number;
  pensionFundAccessAge: number;
  /** Years between retirement and the first unlock of locked income (min(accessAge, claimAge)). */
  bridgeYears: number;
  totals: LifetimeTotals;
}

export interface PlanResult {
  rows: YearRow[];
  summary: PlanSummary;
  issues: Issue[]; // warnings / infos (errors make run* throw)
}

export interface PercentileRow {
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface MonteCarloResult {
  runs: number;
  seed: number;
  retirementAge: number;
  successProbabilityPct: number;
  /** Net worth in TODAY'S euros by age. */
  netWorth: PercentileRow[];
  /** Accessible wealth in TODAY'S euros by age. */
  accessible: PercentileRow[];
  /** Histogram of depletion ages among failed runs. */
  depletionAges: { age: number; count: number }[];
  /** Earliest retirement age whose success probability >= successTargetPct (null if none up to state-pension age). */
  confidentFiAge: number | null;
  /** Success probability by candidate retirement age (for the chart). */
  successByRetirementAge: { age: number; successPct: number }[];
}

export interface SensitivityItem {
  key: string; // e.g. 'returns', 'inflation', 'spending', 'salary', 'retirementSpending', 'lifeExpectancy', 'statePension'
  lowDelta: string; // human label of the low variation, e.g. '-1 pp'
  highDelta: string;
  /** OPTIONAL (added by simulation engine): structured variation for i18n formatting, e.g. unit 'pp', values -1 / +1. */
  unit?: 'pp' | 'pct' | 'years';
  lowValue?: number;
  highValue?: number;
  fiAgeLow: number | null;
  fiAgeHigh: number | null;
  fiAgeBase: number | null;
}

/* ───────────────────────────── Market paths ───────────────────────────── */

/** Year-by-year nominal returns (decimals, e.g. 0.07) used by the simulation. Index [t]. */
export interface MarketPath {
  assetReturns: number[][]; // [t][assetIndex], gross of TER
  pensionFundReturns: number[]; // [t], gross of costs
  inflation: number[]; // [t]
}
