import type { Plan, TaxRules, YearRow } from '../types';
import { createDefaultPlan } from '../defaults';
import { cloneRules } from '../rules/it2026';

/** The default example plan with a fixed start year and timestamp (deterministic tests). */
export function basePlan(): Plan {
  return createDefaultPlan({ startYear: 2026, now: '2026-01-01T00:00:00.000Z' });
}

/** A copy of the 2026 rules where every tax, contribution, surcharge, duty and TFR deduction/revaluation is 0. */
export function zeroTaxRules(): TaxRules {
  const r = cloneRules();
  r.irpef.brackets = r.irpef.brackets.map((b) => ({ ...b, ratePct: 0 }));
  r.irpef.regionalSurchargeBands = r.irpef.regionalSurchargeBands.map((b) => ({ ...b, ratePct: 0 }));
  r.irpef.municipalSurchargePct = 0;
  r.irpef.cuneo.exemptSumBands = r.irpef.cuneo.exemptSumBands.map((b) => ({ ...b, ratePct: 0 }));
  r.irpef.cuneo.extraDeductionAmount = 0;
  delete r.irpef.supplementaryTreatment;
  r.inps.employeeRatePct = 0;
  r.inps.additionalRatePct = 0;
  r.productivityBonus.ratePct = 0;
  r.productivityBonus.afterRatePct = 0;
  r.tfr.contributionPct = 0;
  r.tfr.revalFixedPct = 0;
  r.tfr.revalInflationSharePct = 0;
  r.tfr.revalTaxPct = 0;
  r.pensionFund.yieldTaxPct = 0;
  r.pensionFund.govBondYieldTaxPct = 0;
  r.pensionFund.exitTaxMaxPct = 0;
  r.pensionFund.exitTaxMinPct = 0;
  r.pensionFund.exitTaxReductionPerYearPct = 0;
  r.investments.capitalGainsPct = 0;
  r.investments.govBondPct = 0;
  r.investments.stampDutyPct = 0;
  r.investments.cashStampDuty = 0;
  r.investments.cashInterestTaxPct = 0;
  return r;
}

/**
 * A plan with no market effects at all: zero returns, costs, inflation, cash rate and taxes (assets taxed at 0%).
 * Money can only move between cash, portfolio, pension fund and company TFR, or enter/leave as income/spending.
 */
export function zeroWorldPlan(): Plan {
  const plan = basePlan();
  plan.taxRules = zeroTaxRules();
  plan.market.inflationPct = 0;
  plan.market.cashRatePct = 0;
  for (const a of plan.portfolio.assets) {
    a.expectedReturnPct = 0;
    a.terPct = 0;
    a.taxRatePct = 0;
  }
  plan.pensionFund.expectedReturnPct = 0;
  plan.pensionFund.costPct = 0;
  return plan;
}

/** Sum of the balances that hold money: cash + portfolio + pension fund + company TFR (end of year). */
export function balances(r: YearRow): number {
  return r.cash + r.portfolioValue + r.pensionFund + r.companyTfr;
}

/** Same sum at t = 0 (before the first year). */
export function startBalances(plan: Plan): number {
  const holdings = plan.assets.holdings.reduce((s, h) => s + h.value, 0);
  return plan.assets.cash + holdings + plan.assets.pensionFund.balance + plan.assets.companyTfr;
}

/**
 * Money entering the household/its locked accounts from outside during a year: take-home pay plus the employee
 * contributions withheld, employer contributions, the whole TFR quota, bonus to fund, welfare, interest, inflow
 * events, state pension and annuity. Pension-fund lump sums/RITA and the TFR payout are internal transfers.
 */
export function externalInflows(r: YearRow): number {
  return (
    (r.payroll ? r.payroll.netIncome + r.pfEmployee : 0) +
    r.pfEmployer +
    r.tfrAccrued +
    r.pfBonus +
    (r.welfareBenefit ?? 0) +
    r.cashInterestNet +
    r.eventsInflow +
    r.statePensionNet +
    r.pensionAnnuityNet
  );
}

export function outflows(r: YearRow): number {
  return r.livingExpenses + r.eventsExpense + r.stampDuty;
}

export function rowAt(rows: YearRow[], age: number): YearRow {
  const row = rows.find((r) => r.age === age);
  if (!row) throw new Error(`no row at age ${age}`);
  return row;
}
