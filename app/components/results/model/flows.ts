/**
 * Data for the "Flussi" tab: per-year composition of the money, grouped from engine row fields (sums of engine
 * values only, no tax or finance logic).
 *
 * - Working years: where the year's pay goes. Above zero what you keep (expenses and savings), below zero what is
 *   withheld (IRPEF + surcharges, employee INPS).
 * - Retired years: where the money for the year comes from (net state pension, net pension-fund / TFR payments,
 *   net withdrawals from savings) and, below zero, the taxes paid on them; the spending of the year as a line.
 */
import type { LifetimeTotals, PayrollBreakdown, YearRow } from '@/lib/engine';
import { flowValue, type ValueMode } from './values';

/** Lifetime totals listed in the "Flussi" tab, in display order (i18n: results.totals.<key>). */
export const TOTAL_KEYS: readonly (keyof LifetimeTotals)[] = [
  'grossIncome',
  'netIncome',
  'irpefAndSurcharges',
  'inps',
  'capitalGainsTax',
  'stampDuty',
  'pensionFundTaxes',
  'tfrTaxes',
  'productCosts',
  'pensionTaxSaving',
  'employerContributions',
];

/** IRPEF + regional and municipal surcharges + productivity-bonus substitute tax withheld in payroll. */
export function payrollIncomeTax(p: PayrollBreakdown): number {
  return p.irpefNet + p.regionalSurcharge + p.municipalSurcharge + p.productivityBonusTax;
}

/** Living expenses + life events + stamp duty of the year. */
export function yearSpending(row: YearRow): number {
  return row.livingExpenses + row.eventsExpense + row.stampDuty;
}

/** Net pension-fund and TFR payments of the year (annuity, RITA instalments or capital, TFR at job exit). */
export function fundAndTfrIncome(row: YearRow): number {
  return row.pensionAnnuityNet + row.pfLumpSumNet + row.tfrPayoutNet;
}

/** Net money taken from savings: portfolio sales net of their tax plus cash drawn from the account. */
export function netWithdrawals(row: YearRow): number {
  return row.withdrawalGross - row.withdrawalTax + Math.max(0, -row.toEmergencyFund);
}

/** Taxes paid in a retired year: IRPEF on the state pension, gains tax on sales, fund exit tax, TFR tax. */
export function retiredTaxes(row: YearRow): number {
  return (row.statePensionTax ?? 0) + row.withdrawalTax + row.pfExitTax + row.tfrPayoutTax;
}

export interface WorkingFlow {
  age: number;
  year: number;
  expenses: number;
  /** Net savings of the year (negative when savings were drawn to cover the year). */
  savings: number;
  incomeTax: number;
  inps: number;
}

export interface RetiredFlow {
  age: number;
  year: number;
  statePension: number;
  pensionFund: number;
  withdrawals: number;
  taxes: number;
  spending: number;
}

export function workingFlows(rows: readonly YearRow[], mode: ValueMode): WorkingFlow[] {
  return rows
    .filter((r) => r.status === 'working' && r.payroll)
    .map((r) => {
      const p = r.payroll as PayrollBreakdown;
      return {
        age: r.age,
        year: r.calendarYear,
        expenses: flowValue(r, yearSpending(r), mode),
        savings: flowValue(r, r.netSavings, mode),
        incomeTax: flowValue(r, payrollIncomeTax(p), mode),
        inps: flowValue(r, p.inps, mode),
      };
    });
}

export function retiredFlows(rows: readonly YearRow[], mode: ValueMode): RetiredFlow[] {
  return rows
    .filter((r) => r.status === 'retired')
    .map((r) => ({
      age: r.age,
      year: r.calendarYear,
      statePension: flowValue(r, r.statePensionNet, mode),
      pensionFund: flowValue(r, fundAndTfrIncome(r), mode),
      withdrawals: flowValue(r, netWithdrawals(r), mode),
      taxes: flowValue(r, retiredTaxes(r), mode),
      spending: flowValue(r, yearSpending(r), mode),
    }));
}

/** A chart row for a diverging stack: signed values and the series that end the positive / negative stack. */
export interface StackRow {
  age: number;
  year: number;
  /** Signed values by series key (Recharts reads them as `values.<key>`). */
  values: Record<string, number>;
  /** Last series with a positive value in render order: it carries the rounded data end above zero. */
  topKey: string | null;
  /** Last series with a negative value in render order: it carries the rounded data end below zero. */
  bottomKey: string | null;
}

/**
 * Signed stack layout. Series are rendered in the order [...up, ...down]; `up` values are plotted as they are
 * (a negative saving drops below zero), `down` values (given >= 0) are plotted below zero.
 */
export function stackRows<T extends { age: number; year: number }>(
  points: readonly T[],
  up: readonly (keyof T & string)[],
  down: readonly (keyof T & string)[],
): StackRow[] {
  const order = [...up, ...down];
  return points.map((p) => {
    const values: Record<string, number> = {};
    for (const key of up) values[key] = Number(p[key]);
    for (const key of down) values[key] = -Number(p[key]);
    let topKey: string | null = null;
    let bottomKey: string | null = null;
    for (const key of order) {
      if (values[key] > 0) topKey = key;
      else if (values[key] < 0) bottomKey = key;
    }
    return { age: p.age, year: p.year, values, topKey, bottomKey };
  });
}
