import {
  ScenarioParameters,
  ScenarioProjectionResult,
  YearlyProjectionRow,
  KPISummary,
  SalaryPhase,
} from './types';

/**
 * Custom validation error for calculator input parameter bounds
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Solves for the annualized Internal Rate of Return (IRR / MWRR / TIR)
 * based on monthly cash injections and ending nominal net wealth.
 * Uses Newton-Raphson with robust boundary guarding and bisection fallback.
 */
export function calculateAnnualizedIRR(
  initialCapitalOutflow: number,
  monthlyCashflows: number[], // positive values represent personal/out-of-pocket contributions injected in month m
  finalNetWealth: number
): number {
  const totalMonths = monthlyCashflows.length;
  if (totalMonths === 0) return 0;

  const totalInflows = initialCapitalOutflow + monthlyCashflows.reduce((sum, c) => sum + c, 0);

  // If no capital ever invested and no wealth, return 0
  if (totalInflows <= 0 && finalNetWealth <= 0) return 0;

  // If final net wealth equals total inflows within tiny tolerance, IRR is 0%
  if (Math.abs(finalNetWealth - totalInflows) < 0.01) return 0;

  // Objective function: NPV(r_m) = - initialCapital - sum(c_m / (1+r_m)^m) + finalNetWealth / (1+r_m)^M = 0
  function npv(r: number): number {
    if (r <= -1.0) return Number.NEGATIVE_INFINITY;
    let val = -initialCapitalOutflow;
    for (let m = 0; m < totalMonths; m++) {
      const c = monthlyCashflows[m];
      if (c > 0) {
        val -= c / Math.pow(1 + r, m + 1);
      }
    }
    val += finalNetWealth / Math.pow(1 + r, totalMonths);
    return val;
  }

  function npvPrime(r: number): number {
    if (r <= -1.0) return Number.NEGATIVE_INFINITY;
    let dVal = 0;
    for (let m = 0; m < totalMonths; m++) {
      const c = monthlyCashflows[m];
      if (c > 0) {
        dVal += ((m + 1) * c) / Math.pow(1 + r, m + 2);
      }
    }
    dVal -= (totalMonths * finalNetWealth) / Math.pow(1 + r, totalMonths + 1);
    return dVal;
  }

  // Initial estimate for monthly rate
  let r = 0.005; // ~6% annual
  if (totalInflows > 0 && finalNetWealth > 0) {
    const approxRatio = finalNetWealth / totalInflows;
    r = Math.pow(approxRatio, 1 / totalMonths) - 1;
    r = Math.max(-0.5, Math.min(0.5, r));
  }

  let converged = false;
  const maxNewtonIter = 50;
  for (let iter = 0; iter < maxNewtonIter; iter++) {
    const fVal = npv(r);
    if (Math.abs(fVal) < 1e-4) {
      converged = true;
      break;
    }
    const fPrime = npvPrime(r);
    if (Math.abs(fPrime) < 1e-12 || !isFinite(fPrime)) {
      break;
    }
    const nextR = r - fVal / fPrime;
    if (nextR <= -0.99 || nextR > 5.0 || isNaN(nextR)) {
      break;
    }
    if (Math.abs(nextR - r) < 1e-7) {
      r = nextR;
      converged = true;
      break;
    }
    r = nextR;
  }

  // Fallback to Bisection if Newton-Raphson didn't converge cleanly
  if (!converged) {
    let rLow = -0.95;
    let rHigh = 2.0;
    let fLow = npv(rLow);
    let fHigh = npv(rHigh);

    // Expand upper bound if necessary
    if (fLow * fHigh > 0 && fHigh < 0) {
      rHigh = 10.0;
      fHigh = npv(rHigh);
    }

    if (fLow * fHigh <= 0) {
      for (let i = 0; i < 100; i++) {
        const rMid = (rLow + rHigh) / 2;
        const fMid = npv(rMid);
        if (Math.abs(fMid) < 1e-4 || (rHigh - rLow) < 1e-7) {
          r = rMid;
          break;
        }
        if (fLow * fMid <= 0) {
          rHigh = rMid;
          fHigh = fMid;
        } else {
          rLow = rMid;
          fLow = fMid;
        }
      }
    }
  }

  // Convert monthly rate to annual percentage
  const annualRate = (Math.pow(1 + r, 12) - 1) * 100;
  return isNaN(annualRate) || !isFinite(annualRate) ? 0 : annualRate;
}

/**
 * Sanitizes scenario parameters into a mathematically sound, valid structure
 * to prevent UI blanking during interactive live editing.
 */
export function sanitizeScenarioParameters(scenario: ScenarioParameters): ScenarioParameters {
  const timeHorizonYears = Math.max(1, Math.min(50, scenario.timeHorizonYears || 30));

  // 1. Sanitize investment buckets
  let investmentBuckets = (scenario.investmentBuckets && scenario.investmentBuckets.length > 0)
    ? scenario.investmentBuckets.map((b) => ({ ...b }))
    : [
        {
          id: 'ib-default-1',
          name: 'Global Equities',
          allocationPercent: 100,
          expectedReturnPercent: 7.0,
          terPercent: 0.2,
          taxRatePercent: 26.0,
        },
      ];

  const sumAlloc = investmentBuckets.reduce((sum, b) => sum + (b.allocationPercent || 0), 0);
  if (sumAlloc <= 0) {
    investmentBuckets[0].allocationPercent = 100;
  } else if (Math.abs(sumAlloc - 100) > 0.001) {
    investmentBuckets = investmentBuckets.map((b) => ({
      ...b,
      allocationPercent: (b.allocationPercent / sumAlloc) * 100,
    }));
  }

  // 2. Sanitize salary phases
  let salaryPhases = (scenario.salaryPhases && scenario.salaryPhases.length > 0)
    ? [...scenario.salaryPhases].sort((a, b) => a.startYear - b.startYear).map((p) => ({ ...p }))
    : [
        {
          id: 'sp-default-1',
          startYear: 1,
          endYear: timeHorizonYears,
          annualGrossRAL: 35000,
          mensilita: 13,
          monthlyNetSavings: 600,
          extraSavings13th: 0,
          extraSavings14th: 0,
          annualBonusGross: 0,
          bonusTaxType: 'DETASSAZIONE_5' as const,
          bonusInvestPercent: 100,
        },
      ];

  salaryPhases[0].startYear = 1;
  for (let i = 0; i < salaryPhases.length; i++) {
    if (i > 0) {
      salaryPhases[i].startYear = salaryPhases[i - 1].endYear + 1;
    }
    if (salaryPhases[i].endYear < salaryPhases[i].startYear) {
      salaryPhases[i].endYear = salaryPhases[i].startYear;
    }
    salaryPhases[i].mensilita = salaryPhases[i].mensilita || 13;
    salaryPhases[i].monthlyNetSavings = Math.max(0, salaryPhases[i].monthlyNetSavings || 0);
    salaryPhases[i].extraSavings13th = Math.max(0, salaryPhases[i].extraSavings13th || 0);
    salaryPhases[i].extraSavings14th = Math.max(0, salaryPhases[i].extraSavings14th || 0);
    salaryPhases[i].annualBonusGross = Math.max(0, salaryPhases[i].annualBonusGross || 0);
    salaryPhases[i].bonusTaxType = salaryPhases[i].bonusTaxType || 'DETASSAZIONE_5';
    const rawBonusInvest = salaryPhases[i].bonusInvestPercent;
    salaryPhases[i].bonusInvestPercent = typeof rawBonusInvest === 'number' ? Math.min(100, Math.max(0, rawBonusInvest)) : 100;
  }
  if (salaryPhases[salaryPhases.length - 1].endYear < timeHorizonYears) {
    salaryPhases[salaryPhases.length - 1].endYear = timeHorizonYears;
  }

  // 3. Sanitize Pension Fund Config
  const rawPf = scenario.pensionFund || { enabled: false, routeTfr: false, employeeContributionPercent: 0, employerContributionPercent: 0, expectedReturnPercent: 4.0, terPercent: 0.3, taxRatePercent: 12.0 };
  const tfrPensionAllocationPercent = rawPf.tfrPensionAllocationPercent !== undefined
    ? Math.min(100, Math.max(0, rawPf.tfrPensionAllocationPercent))
    : (rawPf.routeTfr ? 100 : 0);

  return {
    ...scenario,
    timeHorizonYears,
    investmentBuckets,
    salaryPhases,
    pensionFund: {
      ...rawPf,
      tfrPensionAllocationPercent,
      routeTfr: tfrPensionAllocationPercent > 0,
      savingsToPensionPercent: rawPf.savingsToPensionPercent !== undefined ? Math.min(100, Math.max(0, rawPf.savingsToPensionPercent)) : 0,
      reinvestTaxRebate: rawPf.reinvestTaxRebate !== false,
      autoMaxDeductibility: !!rawPf.autoMaxDeductibility,
      expectedReturnPercent: rawPf.expectedReturnPercent ?? 4.0,
      terPercent: rawPf.terPercent ?? 0.3,
      taxRatePercent: rawPf.taxRatePercent ?? 12.0,
      annualYieldTaxRatePercent: rawPf.annualYieldTaxRatePercent ?? 20.0,
    },
    inflationEnabled: scenario.inflationEnabled !== false,
    inflationRatePercent: scenario.inflationRatePercent ?? 2.0,
    tfrDivisor: scenario.tfrDivisor > 0 ? scenario.tfrDivisor : 13.5,
    initialWealth: {
      investedCapital: Math.max(0, scenario.initialWealth?.investedCapital || 0),
      cashLiquidity: Math.max(0, scenario.initialWealth?.cashLiquidity || 0),
      pensionBalance: Math.max(0, scenario.initialWealth?.pensionBalance || 0),
      accumulatedTfr: Math.max(0, scenario.initialWealth?.accumulatedTfr || 0),
    },
    taxes: {
      wealthTaxPercent: Math.max(0, scenario.taxes?.wealthTaxPercent ?? 0.2),
      pensionDeductionCap: Math.max(0, scenario.taxes?.pensionDeductionCap ?? 5164.57),
      marginalIRPEFTaxRate: Math.max(0, scenario.taxes?.marginalIRPEFTaxRate ?? 35),
      tfrSubtractedPercentage: scenario.taxes?.tfrSubtractedPercentage ?? 0.5,
      tfrCompanyTaxRatePercent: scenario.taxes?.tfrCompanyTaxRatePercent ?? 23.0,
      tfrCompanyFixedRevalRate: scenario.taxes?.tfrCompanyFixedRevalRate ?? 1.5,
      tfrCompanyInflationWeight: scenario.taxes?.tfrCompanyInflationWeight ?? 75.0,
      bonusSubstituteTaxRate: scenario.taxes?.bonusSubstituteTaxRate ?? 5.0,
      pensionAnnualYieldTaxRate: scenario.taxes?.pensionAnnualYieldTaxRate ?? 20.0,
    },
  };
}

/**
 * Pure TypeScript Parametric Financial Projection Engine.
 * Fully transparent calculation with exact gross/net breakdown and IRR.
 */
export function calculateProjection(
  parameters: ScenarioParameters
): ScenarioProjectionResult {
  const {
    timeHorizonYears,
    inflationRatePercent,
    tfrDivisor,
    initialWealth,
    salaryPhases,
    pensionFund,
    investmentBuckets,
    taxes,
  } = parameters;

  // 1. Validation Logic
  if (typeof timeHorizonYears !== 'number' || timeHorizonYears < 1 || timeHorizonYears > 50) {
    throw new ValidationError('Time horizon must be between 1 and 50 years');
  }

  if (!investmentBuckets || investmentBuckets.length === 0) {
    throw new ValidationError('Investment buckets array cannot be empty');
  }

  const totalAllocation = investmentBuckets.reduce(
    (sum, b) => sum + (b.allocationPercent || 0),
    0
  );
  if (Math.abs(totalAllocation - 100) > 0.001) {
    throw new ValidationError('Bucket allocation percentage must sum to 100%');
  }

  const normalizedBuckets = investmentBuckets.map((b) => ({
    ...b,
    normalizedWeight: b.allocationPercent / 100,
  }));

  // Validate salary phase continuity & overlaps if provided
  let sortedPhases: SalaryPhase[] = [];
  if (salaryPhases && salaryPhases.length > 0) {
    sortedPhases = [...salaryPhases].sort((a, b) => a.startYear - b.startYear);

    if (sortedPhases[0].startYear > 1) {
      throw new ValidationError('Salary phases must continuously cover years 1 to N without gaps');
    }
    if (sortedPhases[sortedPhases.length - 1].endYear < timeHorizonYears) {
      throw new ValidationError('Salary phases must continuously cover years 1 to N without gaps');
    }

    for (let i = 0; i < sortedPhases.length - 1; i++) {
      const current = sortedPhases[i];
      const next = sortedPhases[i + 1];

      if (current.endYear >= next.startYear) {
        throw new ValidationError('Salary phases cannot overlap');
      }
      if (next.startYear !== current.endYear + 1) {
        throw new ValidationError('Salary phases must continuously cover years 1 to N without gaps');
      }
    }
  }

  // 2. Initialize State at t = 0
  let currentCash = initialWealth.cashLiquidity;
  let currentCompanyTfr = initialWealth.accumulatedTfr;
  let currentPensionBalance = initialWealth.pensionBalance;
  let currentPensionCostBasis = initialWealth.pensionBalance;

  const bucketStates = normalizedBuckets.map((b) => ({
    bucketId: b.id,
    balance: initialWealth.investedCapital * b.normalizedWeight,
    costBasis: initialWealth.investedCapital * b.normalizedWeight,
  }));

  const initialCapitalTotal =
    initialWealth.investedCapital +
    initialWealth.cashLiquidity +
    initialWealth.pensionBalance +
    initialWealth.accumulatedTfr;

  let cumContributions = initialCapitalTotal;
  let cumFees = 0;
  let cumWealthTaxes = 0;

  const monthlyOutflowsForIRR: number[] = [];
  const yearlyProjections: YearlyProjectionRow[] = [];

  function getActivePhase(year: number): SalaryPhase {
    if (sortedPhases.length > 0) {
      const matched = sortedPhases.find(
        (p) => year >= p.startYear && year <= p.endYear
      );
      if (matched) return matched;
    }
    return {
      id: 'default',
      startYear: 1,
      endYear: timeHorizonYears,
      annualGrossRAL: 0,
      mensilita: 13,
      monthlyNetSavings: 0,
    };
  }

  // 3. Main Yearly Simulation Loop
  const effectiveInflationRate = parameters.inflationEnabled === false ? 0 : (inflationRatePercent ?? 2.0);

  for (let t = 1; t <= timeHorizonYears; t++) {
    const activePhase = getActivePhase(t);
    const ral = activePhase.annualGrossRAL;
    const monthlyNetSavings = activePhase.monthlyNetSavings;

    // 13th and 14th Extra Savings
    const savings13thYear = activePhase.mensilita >= 13 ? (activePhase.extraSavings13th || 0) : 0;
    const savings14thYear = activePhase.mensilita >= 14 ? (activePhase.extraSavings14th || 0) : 0;

    // Annual Performance Bonus Treatment
    const bonusGrossYear = activePhase.annualBonusGross || 0;
    let bonusTaxRate = taxes?.bonusSubstituteTaxRate ?? 5.0;
    if (activePhase.bonusTaxType === 'ORDINARIA_IRPEF') {
      bonusTaxRate = taxes?.marginalIRPEFTaxRate ?? 35.0;
    } else if (activePhase.bonusTaxType === 'CUSTOM') {
      bonusTaxRate = activePhase.bonusTaxRatePercent ?? 5.0;
    }
    const bonusNetYear = bonusGrossYear * (1 - bonusTaxRate / 100);
    const bonusInvestPct = (activePhase.bonusInvestPercent ?? 100) / 100;
    const bonusInvestedYear = bonusNetYear * bonusInvestPct;
    const bonusCashYear = bonusNetYear - bonusInvestedYear;

    // Personal Net Savings Available in year t
    const totalPersonalSavingsAvailable = (monthlyNetSavings * 12) + savings13thYear + savings14thYear + bonusInvestedYear;

    // Allocation of personal net savings between Pension Fund and Portfolio
    const pAllocPct = activePhase.savingsToPensionPercent !== undefined
      ? activePhase.savingsToPensionPercent
      : (pensionFund.savingsToPensionPercent ?? 0);

    const savingsToPensionYear = pensionFund.enabled ? (totalPersonalSavingsAvailable * (pAllocPct / 100)) : 0;
    const savingsToPortfolioYear = totalPersonalSavingsAvailable - savingsToPensionYear;

    // TFR Accrual & Destination Routing
    let tfrPensionAllocPct = pensionFund.tfrPensionAllocationPercent !== undefined
      ? pensionFund.tfrPensionAllocationPercent
      : (pensionFund.routeTfr ? 100 : 0);

    if (activePhase.tfrPensionAllocationPercent !== undefined) {
      tfrPensionAllocPct = activePhase.tfrPensionAllocationPercent;
    } else if (activePhase.tfrDestination) {
      tfrPensionAllocPct = activePhase.tfrDestination === 'PENSION_FUND' ? 100 : 0;
    }

    const tfrSubtractedPct = taxes?.tfrSubtractedPercentage ?? 0;
    const tfrAccruedYear =
      tfrDivisor > 0
        ? (ral * (1 - tfrSubtractedPct / 100)) / tfrDivisor
        : 0;

    const tfrPensionFlow = tfrAccruedYear * (tfrPensionAllocPct / 100);
    const tfrCompanyFlow = tfrAccruedYear * (1 - tfrPensionAllocPct / 100);

    // Company TFR Revaluation
    const fixedReval = taxes?.tfrCompanyFixedRevalRate ?? 1.5;
    const inflWeight = taxes?.tfrCompanyInflationWeight ?? 75.0;
    const tfrRevalRate =
      fixedReval / 100 + (inflWeight / 100) * (effectiveInflationRate / 100);
    currentCompanyTfr =
      currentCompanyTfr * (1 + tfrRevalRate) + tfrCompanyFlow;

    // Net company TFR after separate tax liability at exit
    const tfrCompanyTaxRate = taxes?.tfrCompanyTaxRatePercent ?? 23.0;
    const currentCompanyTfrNet = currentCompanyTfr * (1 - tfrCompanyTaxRate / 100);

    // Pension Fund Flow & IRPEF Rebate
    let pensionEmp = 0;
    let pensionEr = 0;
    let pensionTaxRebate = 0;
    let monthlyPensionFlow = 0;

    if (pensionFund.enabled) {
      let empPct = pensionFund.employeeContributionPercent;
      const erPct = pensionFund.employerContributionPercent;
      const cap = taxes?.pensionDeductionCap ?? 5164.57;

      if (pensionFund.autoMaxDeductibility && ral > 0) {
        const erEuro = (ral * erPct) / 100;
        const remainingCap = Math.max(0, cap - erEuro);
        empPct = (remainingCap / ral) * 100;
      }

      const baseEmpFromRal = (ral * empPct) / 100;
      pensionEmp = baseEmpFromRal + savingsToPensionYear;

      if (pensionEmp > 0) {
        pensionEr = (ral * erPct) / 100;
      }

      const eligibleDeduction = Math.min(
        pensionEmp,
        cap
      );
      pensionTaxRebate =
        (eligibleDeduction * (taxes?.marginalIRPEFTaxRate ?? 35)) / 100;

      const totalPensionAnnualFlow = pensionEmp + pensionEr + tfrPensionFlow;
      monthlyPensionFlow = totalPensionAnnualFlow / 12;
      currentPensionCostBasis += (eligibleDeduction + pensionEr + tfrPensionFlow);
    }

    // Reinvestment of IRPEF Tax Rebate
    const shouldReinvestRebate = pensionFund.enabled && (pensionFund.reinvestTaxRebate !== false);
    const reinvestedTaxRebateYear = shouldReinvestRebate ? pensionTaxRebate : 0;
    const cashTaxRebateYear = shouldReinvestRebate ? 0 : pensionTaxRebate;

    // Liquid cash update
    currentCash += (cashTaxRebateYear + bonusCashYear);

    // Monthly Iteration Loop (m = 1..12) for Investment Buckets & Pension
    let yearInvFees = 0;
    const invStartTotal = bucketStates.reduce((sum, s) => sum + s.balance, 0);

    // Total contributions flowing into personal investment portfolio
    const actualPersonalPortfolioContributionsYear = savingsToPortfolioYear + reinvestedTaxRebateYear;

    const baseMonthlyPortfolio = (monthlyNetSavings * (1 - pAllocPct / 100));
    const savings13thPortfolio = (savings13thYear * (1 - pAllocPct / 100));
    const savings14thPortfolio = (savings14thYear * (1 - pAllocPct / 100));
    const bonusInvestedPortfolio = (bonusInvestedYear * (1 - pAllocPct / 100));

    // 3.1 Investment Buckets Compounding
    for (let i = 0; i < normalizedBuckets.length; i++) {
      const b = normalizedBuckets[i];
      const state = bucketStates[i];

      const netAnnualReturn =
        (1 + b.expectedReturnPercent / 100) * (1 - b.terPercent / 100) - 1;
      const jMonthly = Math.pow(1 + Math.max(-0.99, netAnnualReturn), 1 / 12) - 1;

      for (let m = 1; m <= 12; m++) {
        let monthlyFlow = baseMonthlyPortfolio * b.normalizedWeight;
        if (m === 6 && savings14thPortfolio > 0) {
          monthlyFlow += savings14thPortfolio * b.normalizedWeight;
        }
        if (m === 12) {
          if (savings13thPortfolio > 0) monthlyFlow += savings13thPortfolio * b.normalizedWeight;
          if (bonusInvestedPortfolio > 0) monthlyFlow += bonusInvestedPortfolio * b.normalizedWeight;
          if (reinvestedTaxRebateYear > 0) monthlyFlow += reinvestedTaxRebateYear * b.normalizedWeight;
        }

        const startBal = state.balance;
        const feeM = (startBal * (b.terPercent / 100)) / 12;
        yearInvFees += feeM;
        state.balance = startBal * (1 + jMonthly) + monthlyFlow;
      }
      state.costBasis += actualPersonalPortfolioContributionsYear * b.normalizedWeight;
    }

    // Record monthly cash outflows for IRR calculation
    const baseEmpFromRal = pensionFund.enabled ? (ral * pensionFund.employeeContributionPercent) / 100 : 0;
    for (let m = 1; m <= 12; m++) {
      let mOutflow = monthlyNetSavings + (baseEmpFromRal + pensionEr + tfrAccruedYear) / 12;
      if (m === 6) mOutflow += savings14thYear;
      if (m === 12) mOutflow += savings13thYear + bonusGrossYear;
      monthlyOutflowsForIRR.push(mOutflow);
    }

    // 3.2 Pension Fund Compounding
    let yearPensionFees = 0;
    if (pensionFund.enabled) {
      const yieldTaxRate = taxes?.pensionAnnualYieldTaxRate ?? 0;
      const grossYield = pensionFund.expectedReturnPercent / 100;
      const netPenAnnual = (1 + grossYield * (1 - yieldTaxRate / 100)) * (1 - pensionFund.terPercent / 100) - 1;
      const jPenMonthly = Math.pow(1 + Math.max(-0.99, netPenAnnual), 1 / 12) - 1;

      for (let m = 1; m <= 12; m++) {
        const startPen = currentPensionBalance;
        const feeM = (startPen * (pensionFund.terPercent / 100)) / 12;
        yearPensionFees += feeM;
        currentPensionBalance =
          startPen * (1 + jPenMonthly) + monthlyPensionFlow;
      }
    }

    const yearTotalFees = yearInvFees + yearPensionFees;

    // 4. Annual Wealth Tax (Imposta di Bollo) Deduction at Month 12
    let totalPortfolioBalanceGross = 0;
    let totalPortfolioBalanceNet = 0;
    let yearWealthTax = 0;

    for (let i = 0; i < normalizedBuckets.length; i++) {
      const b = normalizedBuckets[i];
      const state = bucketStates[i];

      const wealthTax = (state.balance * (taxes?.wealthTaxPercent ?? 0)) / 100;
      yearWealthTax += wealthTax;
      state.balance -= wealthTax;

      totalPortfolioBalanceGross += state.balance;

      // Capital gains tax liability
      const unrealizedGain = Math.max(0, state.balance - state.costBasis);
      const cgTaxLiability = (unrealizedGain * b.taxRatePercent) / 100;
      const bucketNetVal = state.balance - cgTaxLiability;
      totalPortfolioBalanceNet += bucketNetVal;
    }

    cumWealthTaxes += yearWealthTax;

    // Pension Net Balance after Exit Tax Liability
    const penExitTaxRate = pensionFund.taxRatePercent ?? 12.0;
    const penTaxableBasis = Math.min(currentPensionBalance, currentPensionCostBasis);
    const penExitTax = (penTaxableBasis * penExitTaxRate) / 100;
    const currentPensionBalanceNet = Math.max(0, currentPensionBalance - penExitTax);

    // Investment Gains for Year t (net of TER fees)
    const invEndPreTax = totalPortfolioBalanceGross + yearWealthTax;
    const yearInvGains = invEndPreTax - invStartTotal - actualPersonalPortfolioContributionsYear;

    // 5. Total Wealth Aggregation
    const totalWealthNominalGross =
      totalPortfolioBalanceGross +
      currentPensionBalance +
      currentCompanyTfr +
      currentCash;

    const totalWealthNominalNet =
      totalPortfolioBalanceNet +
      currentPensionBalanceNet +
      currentCompanyTfrNet +
      currentCash;

    const discountFactor = Math.pow(1 + effectiveInflationRate / 100, t);
    const totalWealthRealGross = totalWealthNominalGross / discountFactor;
    const totalWealthRealNet = totalWealthNominalNet / discountFactor;

    // Cumulative Counters
    cumContributions +=
      totalPersonalSavingsAvailable +
      bonusCashYear +
      baseEmpFromRal +
      pensionEr +
      tfrAccruedYear;
    cumFees += yearTotalFees;

    const cumGains =
      totalWealthNominalGross + cumFees + cumWealthTaxes - cumContributions;

    yearlyProjections.push({
      year: t,
      ral,
      netMonthlySavings: monthlyNetSavings,
      savings13thYear,
      savings14thYear,
      savingsToPensionYear,
      savingsToPortfolioYear,
      bonusGrossYear,
      bonusNetYear,
      bonusInvestedYear,
      bonusCashYear,
      cashBalance: currentCash,
      tfrAccruedYear,
      tfrPensionFlowYear: tfrPensionFlow,
      tfrCompanyFlowYear: tfrCompanyFlow,
      tfrCompanyBalance: currentCompanyTfr,
      tfrCompanyBalanceGross: currentCompanyTfr,
      tfrCompanyBalanceNet: currentCompanyTfrNet,
      pensionContributionEmployee: pensionEmp,
      pensionContributionEmployer: pensionEr,
      pensionTaxRebate,
      reinvestedTaxRebateYear,
      pensionFundBalance: currentPensionBalance,
      pensionFundBalanceGross: currentPensionBalance,
      pensionFundBalanceNet: currentPensionBalanceNet,
      investmentContributions: actualPersonalPortfolioContributionsYear,
      investmentGainsYear: yearInvGains,
      investmentFeesYear: yearTotalFees,
      investmentPortfolioBalance: totalPortfolioBalanceGross,
      investmentPortfolioBalanceGross: totalPortfolioBalanceGross,
      investmentPortfolioBalanceNet: totalPortfolioBalanceNet,
      totalWealthNominal: totalWealthNominalNet,
      totalWealthNominalNet: totalWealthNominalNet,
      totalWealthNominalGross: totalWealthNominalGross,
      totalWealthReal: totalWealthRealNet,
      totalWealthRealNet: totalWealthRealNet,
      totalWealthRealGross: totalWealthRealGross,
      totalContributionsCumulative: cumContributions,
      totalGainsCumulative: cumGains,
      totalFeesCumulative: cumFees,
    });
  }

  // 6. Final KPI Summary Calculation with Robust IRR
  const finalRow = yearlyProjections[timeHorizonYears - 1];
  const finalNominalNet = finalRow.totalWealthNominalNet;
  const finalNominalGross = finalRow.totalWealthNominalGross;
  const finalRealNet = finalRow.totalWealthRealNet;

  // Calculate Money-Weighted Rate of Return / Internal Rate of Return (IRR)
  const irr = calculateAnnualizedIRR(initialCapitalTotal, monthlyOutflowsForIRR, finalNominalNet);

  const totalNetGains = finalNominalNet - cumContributions;
  const totalGrossGains = finalNominalGross + cumFees + cumWealthTaxes - cumContributions;

  const kpiSummary: KPISummary = {
    finalTotalWealthNominal: finalNominalNet,
    finalTotalWealthNominalGross: finalNominalGross,
    finalTotalWealthReal: finalRealNet,
    irrAnnualPercent: irr,
    averageAnnualReturnPercent: irr,
    totalContributions: cumContributions,
    totalInvestmentGains: totalNetGains,
    totalGrossGains: totalGrossGains,
    totalFeesPaid: cumFees,
    totalTaxesPaid: cumWealthTaxes,
  };

  return {
    scenarioId: parameters.id,
    parameters,
    yearlyProjections,
    kpiSummary,
  };
}
