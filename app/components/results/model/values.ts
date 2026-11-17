/**
 * Real / nominal display of engine values (docs/SPEC.md §3). Rows are NOMINAL: flows of year t are divided by the
 * price index at the start of the year, end-of-year balances by the price index at the end of the year
 * (`priceIndexEnd`), which is how the engine computes its own "today's €" summary figures.
 */
import type { YearRow } from '@/lib/engine';
import type { ValueMode } from '@/lib/store/state';

export type { ValueMode };

/** A flow of the year (income, taxes, expenses…) in the chosen unit. */
export function flowValue(row: YearRow, nominal: number, mode: ValueMode): number {
  return mode === 'real' ? nominal / row.priceIndex : nominal;
}

/** An end-of-year balance (portfolio, fund, net worth…) in the chosen unit. */
export function balanceValue(row: YearRow, nominal: number, mode: ValueMode): number {
  return mode === 'real' ? nominal / (row.priceIndexEnd ?? row.priceIndex) : nominal;
}

/** i18n key of the unit label shown next to money charts and tables. */
export function unitKey(mode: ValueMode): string {
  return mode === 'real' ? 'results.unit.real' : 'results.unit.nominal';
}

/** The row of a given age (undefined outside the horizon). */
export function rowAtAge(rows: readonly YearRow[], age: number): YearRow | undefined {
  const first = rows[0];
  if (!first) return undefined;
  const row = rows[age - first.age];
  return row && row.age === age ? row : rows.find((r) => r.age === age);
}
