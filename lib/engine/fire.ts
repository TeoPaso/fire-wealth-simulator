import type { Issue, LifetimeTotals, MarketPath, Plan, PlanResult, PlanSummary, YearRow } from './types';
import { PlanValidationError } from './types';
import { deterministicPath } from './paths';
import { latentTax } from './portfolio';
import {
  createWorkCache,
  fallbackRetirementAge,
  preparePlan,
  simulatePrepared,
  type PreparedPlan,
  type SimulationResult,
  type WorkCache,
} from './simulate';
import { irpefIndexFactor } from './tax/irpef';
import { exitTaxRatePct } from './tax/pensionFund';
import { tfrSeparateTaxRatePct } from './tax/tfr';
import { hasErrors, validatePlan } from './validate';

/**
 * FI age and the deterministic plan result (docs/SPEC.md §5.8).
 *
 * success(R) = the deterministic simulation that stops work at the start of age R never runs short of accessible
 * money until lifeExpectancy. fiAge = the smallest such R in [currentAge, lifeExpectancy] (linear scan; null if none).
 */

/** Earliest successful retirement age on `path` for a prepared plan (linear scan), or null. */
export function findFiAgePrepared(prep: PreparedPlan, path: MarketPath, cache?: WorkCache): number | null {
  const shared = cache ?? createWorkCache(prep, path, false);
  for (let R = prep.currentAge; R <= prep.lifeExpectancy; R++) {
    const sim = simulatePrepared(prep, { retirementAge: R, path, detail: false, stopOnShortfall: true, cache: shared });
    if (sim.success) return R;
  }
  return null;
}

/** Deterministic FI age of a (valid) plan with its expected returns and inflation. Does not validate. */
export function findFiAge(plan: Plan, path?: MarketPath): number | null {
  const prep = preparePlan(plan);
  return findFiAgePrepared(prep, path ?? deterministicPath(plan, prep.years));
}

/** Clamps a retirement age to the simulated horizon [currentAge, lifeExpectancy]. */
export function clampRetirementAge(prep: PreparedPlan, age: number): number {
  return Math.min(prep.lifeExpectancy, Math.max(prep.currentAge, Math.round(age)));
}

/**
 * Retirement age of the displayed plan: fixedAge in 'fixedAge' mode, else fiAge, else the state-pension age
 * (SPEC §5.8), clamped to the horizon.
 */
export function displayedRetirementAge(prep: PreparedPlan, fiAge: number | null): number {
  const plan = prep.plan;
  const age = plan.retirement.mode === 'fixedAge' ? plan.retirement.fixedAge : (fiAge ?? fallbackRetirementAge(prep));
  return clampRetirementAge(prep, age);
}

/** Classic FIRE number in today's €: annual retirement spending / SWR (a reference, not used for fiAge). */
export function fireNumberToday(plan: Plan): number {
  const swr = plan.withdrawal.swrPct / 100;
  const spending = plan.spending.monthlyToday * 12 * (plan.spending.retirementPct / 100);
  return swr > 0 ? spending / swr : 0;
}

/** Balances at t = 0 (start of the plan; today's € = nominal €). */
export interface StartBalances {
  accessible: number;
  pensionFundNet: number;
  companyTfrNet: number;
  netWorth: number;
}

/** Start-of-plan balances, valued like the rows' derived fields (latent tax, exit tax, TFR separate tax). */
export function startBalances(prep: PreparedPlan): StartBalances {
  const rules = prep.rules;
  let portfolio = 0;
  for (let i = 0; i < prep.nAssets; i++) portfolio += prep.initValues[i];
  const accessible = prep.cash0 + portfolio - latentTax(prep.initValues, prep.initBasis, prep.taxRates);
  const pf = prep.pfBalance0;
  const membership = Math.max(0, prep.startYear - prep.pfMembershipStartYear);
  const pensionFundNet = pf > 0 ? pf - Math.min(prep.pfBasis0, pf) * (exitTaxRatePct(membership, rules) / 100) : 0;
  const tfr = prep.companyTfr0;
  const tfrRate = tfrSeparateTaxRatePct(tfr, prep.companyTfrYears0, rules, irpefIndexFactor(rules, 1)) / 100;
  const companyTfrNet = tfr - Math.min(tfr, tfr * tfrRate);
  return { accessible, pensionFundNet, companyTfrNet, netWorth: accessible + pensionFundNet + companyTfrNet };
}

/** Whether the pension fund holds or will receive money (its access issues are reported only then). */
export function pensionFundMatters(plan: Plan): boolean {
  return plan.pensionFund.enabled || plan.assets.pensionFund.balance > 0;
}

/** Lifetime totals in today's € (each year's flow divided by that year's price index). */
export function lifetimeTotals(rows: YearRow[]): LifetimeTotals {
  const totals: LifetimeTotals = {
    grossIncome: 0,
    netIncome: 0,
    irpefAndSurcharges: 0,
    inps: 0,
    capitalGainsTax: 0,
    stampDuty: 0,
    pensionFundTaxes: 0,
    tfrTaxes: 0,
    productCosts: 0,
    pensionTaxSaving: 0,
    employerContributions: 0,
  };
  for (const r of rows) {
    const d = r.priceIndex;
    const p = r.payroll;
    // Gross: RAL + every bonus (welfare and bonus-to-fund included) + gross state pension.
    totals.grossIncome += (r.ral + r.bonusGross + (r.statePensionGross ?? r.statePensionNet)) / d;
    // Net: payroll take-home + welfare benefit + net state pension.
    totals.netIncome += ((p ? p.netIncome : 0) + (r.welfareBenefit ?? 0) + r.statePensionNet) / d;
    // Income taxes: IRPEF + surcharges + productivity-bonus substitute tax in payroll, and on the state pension.
    const payrollTax = p ? p.irpefNet + p.regionalSurcharge + p.municipalSurcharge + p.productivityBonusTax : 0;
    totals.irpefAndSurcharges += (payrollTax + (r.statePensionTax ?? 0)) / d;
    totals.inps += (p ? p.inps : 0) / d;
    // Capital taxes: realised gains (withdrawals + rebalancing) and the tax withheld on cash interest.
    totals.capitalGainsTax += (r.realizedGainsTax + (r.cashInterestTax ?? 0)) / d;
    totals.stampDuty += r.stampDuty / d;
    totals.pensionFundTaxes += (r.pfYieldTax + r.pfExitTax) / d;
    totals.tfrTaxes += (r.tfrRevaluationTax + r.tfrPayoutTax) / d;
    totals.productCosts += (r.portfolioCosts + r.pfCosts) / d;
    totals.pensionTaxSaving += (p ? p.pensionTaxSaving : 0) / d;
    totals.employerContributions += r.pfEmployer / d;
  }
  return totals;
}

function buildSummary(prep: PreparedPlan, sim: SimulationResult, rows: YearRow[], fiAge: number | null): PlanSummary {
  const plan = prep.plan;
  const R = sim.retirementAge;
  const start = startBalances(prep);
  const fireNumber = fireNumberToday(plan);
  const last = rows[rows.length - 1];
  // Wealth "at retirement" = at the start of the first retired year = end of the last working year.
  const lastWorking = rows.find((r) => r.age === R - 1);
  const today = (r: YearRow, v: number) => v / (r.priceIndexEnd ?? r.priceIndex);

  let savings = 0;
  let netIncome = 0;
  for (const r of rows) {
    if (!r.payroll) continue;
    savings += r.netSavings / r.priceIndex;
    netIncome += r.payroll.netIncome / r.priceIndex;
  }

  const unlocks: number[] = [];
  if (pensionFundMatters(plan)) unlocks.push(sim.pensionFundAccessAge);
  if (sim.statePensionClaimAge !== null) unlocks.push(sim.statePensionClaimAge);
  const bridgeYears = unlocks.length > 0 ? Math.max(0, Math.min(...unlocks) - R) : Math.max(0, prep.lifeExpectancy + 1 - R);

  return {
    fiAge,
    retirementAge: R,
    yearsToFi: fiAge === null ? null : fiAge - prep.currentAge,
    fireNumberToday: fireNumber,
    netWorthTodayStart: start.netWorth,
    accessibleTodayStart: start.accessible,
    progressPct: fireNumber > 0 ? (start.accessible / fireNumber) * 100 : 100,
    depletionAge: sim.depletionAge,
    success: sim.success,
    netWorthAtRetirementToday: lastWorking ? today(lastWorking, lastWorking.netWorth) : start.netWorth,
    accessibleAtRetirementToday: lastWorking ? today(lastWorking, lastWorking.accessibleNet) : start.accessible,
    finalNetWorthToday: last ? today(last, last.netWorth) : start.netWorth,
    avgSavingsRatePct: netIncome > 0 ? (savings / netIncome) * 100 : null,
    statePensionAnnualNetToday: sim.statePensionNetAtClaimToday,
    statePensionClaimAge: sim.statePensionClaimAge ?? fallbackRetirementAge(prep),
    pensionFundAccessAge: sim.pensionFundAccessAge,
    bridgeYears,
    totals: lifetimeTotals(rows),
  };
}

/** Warnings/infos that depend on the simulation of the displayed retirement age (SPEC §5.11 "post-run"). */
export function postRunIssues(prep: PreparedPlan, sim: SimulationResult): Issue[] {
  const plan = prep.plan;
  const rules = prep.rules;
  const issues: Issue[] = [];
  const s = sim.signals;
  if (s.negativeSavingsWhileWorking) {
    issues.push({
      level: 'warning',
      path: 'spending.monthlyToday',
      code: 'negativeSavingsWhileWorking',
      params: { age: s.negativeSavingsWhileWorking.age },
    });
  }
  if (s.bonusAboveCap) {
    issues.push({
      level: 'warning',
      path: `career[${s.bonusAboveCap.phaseIndex}].bonusGrossToday`,
      code: 'bonusAboveCap',
      params: { age: s.bonusAboveCap.age, cap: s.bonusAboveCap.cap },
    });
  }
  if (s.bonusIneligibleIncome) {
    issues.push({
      level: 'warning',
      path: `career[${s.bonusIneligibleIncome.phaseIndex}].bonusRegime`,
      code: 'bonusIneligibleIncome',
      params: { age: s.bonusIneligibleIncome.age, limit: rules.productivityBonus.priorYearIncomeLimit },
    });
  }
  if (s.contributionAboveCap) {
    const path =
      plan.savingsPolicy.voluntaryPension === 'fixed'
        ? 'savingsPolicy.voluntaryPensionFixedToday'
        : `career[${s.contributionAboveCap.phaseIndex}].employeePensionPct`;
    issues.push({
      level: 'warning',
      path,
      code: 'contributionAboveCap',
      params: { age: s.contributionAboveCap.age, cap: rules.pensionFund.deductionCap },
    });
  }
  if (sim.statePensionClaimAge === null) {
    issues.push({
      level: 'warning',
      path: 'assets.inps.contributionYears',
      code: 'noStatePension',
      params: { minYears: rules.statePension.fallbackMinYears, oldAgeMinYears: rules.statePension.oldAgeMinYears },
    });
  } else if (sim.statePensionClaimAge > prep.lifeExpectancy) {
    issues.push({ level: 'info', path: 'statePension.claimAge', code: 'statePensionAfterHorizon', params: { age: sim.statePensionClaimAge } });
  }
  if (pensionFundMatters(plan)) {
    const access = sim.pensionFundAccess;
    if (s.pfMembershipAtAccess !== null && s.pfMembershipAtAccess < rules.pensionFund.minMembershipYears) {
      issues.push({
        level: 'warning',
        path: 'assets.pensionFund.membershipStartYear',
        code: 'pfShortMembership',
        params: { years: s.pfMembershipAtAccess, min: rules.pensionFund.minMembershipYears },
      });
    }
    if (access.redemptionFallbackRita) {
      issues.push({
        level: 'info',
        path: 'pensionFund.accessMode',
        code: 'redemptionFallbackRita',
        params: { age: access.startAge, redemptionAge: sim.retirementAge + rules.pensionFund.redemptionAfterUnemployedYears },
      });
    }
    if (access.ordinaryBenefitFallback) {
      issues.push({ level: 'info', path: 'pensionFund.accessMode', code: 'pfOrdinaryBenefit', params: { age: access.startAge } });
    }
    if (access.ritaDelayed) {
      issues.push({ level: 'info', path: 'pensionFund.accessAge', code: 'ritaDelayedToRetirement', params: { age: access.startAge } });
    }
    if (access.startAge > prep.lifeExpectancy) {
      issues.push({ level: 'warning', path: 'pensionFund.accessAge', code: 'pfAccessAfterHorizon', params: { age: access.startAge } });
    }
  }
  return issues;
}

/**
 * Deterministic plan result (SPEC §5.8): validates (throws PlanValidationError on errors), finds fiAge, simulates the
 * displayed retirement age with full rows and returns the summary plus validation and post-run warnings/infos.
 */
export function runPlan(plan: Plan): PlanResult {
  const issues = validatePlan(plan);
  if (hasErrors(issues)) throw new PlanValidationError(issues);
  const prep = preparePlan(plan);
  const path = deterministicPath(plan, prep.years);
  const cache = createWorkCache(prep, path, true);
  const fiAge = findFiAgePrepared(prep, path, cache);
  const retirementAge = displayedRetirementAge(prep, fiAge);
  const sim = simulatePrepared(prep, { retirementAge, path, detail: true, cache });
  const rows = sim.rows ?? [];
  return {
    rows,
    summary: buildSummary(prep, sim, rows, fiAge),
    issues: [...issues, ...postRunIssues(prep, sim)],
  };
}
