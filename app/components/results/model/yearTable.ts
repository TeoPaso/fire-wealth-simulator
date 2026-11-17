/**
 * Columns of the "Anno per anno" table and its CSV export. Each column reads engine row fields (or sums of them);
 * flows are converted with the start-of-year price index, balances with the end-of-year one.
 */
import type { YearRow } from '@/lib/engine';
import { fundAndTfrIncome, payrollIncomeTax, yearSpending } from './flows';
import { balanceValue, flowValue, type ValueMode } from './values';

export type ColumnGroup = 'income' | 'taxes' | 'spending' | 'savings' | 'tfr' | 'pensionFund' | 'balances';

export interface YearColumn {
  id: string;
  group: ColumnGroup;
  /** 'flow' = amount of the year, 'balance' = end-of-year balance. */
  kind: 'flow' | 'balance';
  /** Nominal value from the row. */
  get: (row: YearRow) => number;
  /** Signed values (savings / withdrawals) are shown with an explicit sign. */
  signed?: boolean;
  /** Emphasised column (net worth). */
  strong?: boolean;
}

/** i18n key of a column label / group label. */
export const columnLabelKey = (id: string) => `results.table.col.${id}`;
export const groupLabelKey = (group: ColumnGroup) => `results.table.group.${group}`;

export const YEAR_COLUMNS: readonly YearColumn[] = [
  { id: 'grossPay', group: 'income', kind: 'flow', get: (r) => r.ral + r.bonusGross },
  { id: 'netPay', group: 'income', kind: 'flow', get: (r) => (r.payroll ? r.payroll.netIncome : 0) + (r.welfareBenefit ?? 0) },
  { id: 'statePension', group: 'income', kind: 'flow', get: (r) => r.statePensionNet },
  { id: 'fundAndTfr', group: 'income', kind: 'flow', get: fundAndTfrIncome },
  { id: 'otherIncome', group: 'income', kind: 'flow', get: (r) => r.cashInterestNet + r.eventsInflow },
  {
    id: 'incomeTax',
    group: 'taxes',
    kind: 'flow',
    get: (r) => (r.payroll ? payrollIncomeTax(r.payroll) : 0) + (r.statePensionTax ?? 0),
  },
  { id: 'inps', group: 'taxes', kind: 'flow', get: (r) => (r.payroll ? r.payroll.inps : 0) },
  {
    id: 'otherTaxes',
    group: 'taxes',
    kind: 'flow',
    get: (r) =>
      r.realizedGainsTax +
      (r.cashInterestTax ?? 0) +
      r.stampDuty +
      r.pfYieldTax +
      r.pfExitTax +
      r.tfrRevaluationTax +
      r.tfrPayoutTax,
  },
  { id: 'spending', group: 'spending', kind: 'flow', get: (r) => r.livingExpenses + r.eventsExpense },
  { id: 'netSavings', group: 'savings', kind: 'flow', get: (r) => r.netSavings, signed: true },
  { id: 'withdrawals', group: 'savings', kind: 'flow', get: (r) => r.withdrawalGross },
  { id: 'tfrAccrued', group: 'tfr', kind: 'flow', get: (r) => r.tfrAccrued },
  { id: 'companyTfr', group: 'tfr', kind: 'balance', get: (r) => r.companyTfr },
  { id: 'pfContributions', group: 'pensionFund', kind: 'flow', get: (r) => r.pfEmployee + r.pfEmployer + r.pfTfr + r.pfBonus },
  { id: 'pensionFund', group: 'pensionFund', kind: 'balance', get: (r) => r.pensionFund },
  { id: 'portfolio', group: 'balances', kind: 'balance', get: (r) => r.portfolioValue },
  { id: 'cash', group: 'balances', kind: 'balance', get: (r) => r.cash },
  { id: 'accessible', group: 'balances', kind: 'balance', get: (r) => r.accessibleNet },
  { id: 'locked', group: 'balances', kind: 'balance', get: (r) => r.lockedNet },
  { id: 'netWorth', group: 'balances', kind: 'balance', get: (r) => r.netWorth, strong: true },
];

/** Column groups in display order with their column count (for the grouped header). */
export function columnGroups(columns: readonly YearColumn[] = YEAR_COLUMNS): { group: ColumnGroup; span: number }[] {
  const out: { group: ColumnGroup; span: number }[] = [];
  for (const c of columns) {
    const last = out[out.length - 1];
    if (last && last.group === c.group) last.span += 1;
    else out.push({ group: c.group, span: 1 });
  }
  return out;
}

/** Value of a column for a row in the chosen unit. */
export function columnValue(column: YearColumn, row: YearRow, mode: ValueMode): number {
  const v = column.get(row);
  return column.kind === 'flow' ? flowValue(row, v, mode) : balanceValue(row, v, mode);
}

export interface CsvOptions {
  /** Field separator: ';' for Italian Excel, ',' otherwise. */
  separator: ';' | ',';
  /** Decimal separator of the numbers. */
  decimal: ',' | '.';
  /** Header labels: age, year, status, then one per column. */
  headers: string[];
  /** Status label per row status. */
  statusLabel: (status: YearRow['status']) => string;
}

function csvCell(text: string, separator: string): string {
  return /["\r\n]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvNumber(value: number, decimal: string): string {
  if (!Number.isFinite(value)) return '';
  const fixed = (Math.round(value * 100) / 100).toFixed(2);
  return decimal === ',' ? fixed.replace('.', ',') : fixed;
}

/**
 * CSV text of the table (no thousands separators, 2 decimals, CRLF line ends, UTF-8 BOM so Excel detects the
 * encoding). Every column of YEAR_COLUMNS is exported in the chosen unit.
 */
export function buildCsv(rows: readonly YearRow[], mode: ValueMode, opts: CsvOptions, columns: readonly YearColumn[] = YEAR_COLUMNS): string {
  const lines = [opts.headers.map((h) => csvCell(h, opts.separator)).join(opts.separator)];
  for (const row of rows) {
    const cells = [
      String(row.age),
      String(row.calendarYear),
      csvCell(opts.statusLabel(row.status), opts.separator),
      ...columns.map((c) => csvNumber(columnValue(c, row, mode), opts.decimal)),
    ];
    lines.push(cells.join(opts.separator));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}
