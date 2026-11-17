'use client';

/**
 * Tooltip content for Recharts (dataviz: one tooltip lists every series at that position; value first and strong,
 * series name secondary; series keyed by a short line, never by coloured text).
 */
import type { ReactNode } from 'react';
import type { TooltipContentProps, TooltipValueType } from 'recharts';

export interface TooltipRow {
  key: string;
  label: string;
  value: string;
  /** Series colour for the line key (omit for totals / context rows). */
  color?: string;
  /** Visual weight: totals are emphasised. */
  strong?: boolean;
}

export function TooltipBox({ title, rows, note }: { title: ReactNode; rows: readonly TooltipRow[]; note?: ReactNode }) {
  return (
    <div className="max-w-[18rem] rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-slate-300">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            {row.color ? (
              <span aria-hidden="true" className="inline-block h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            ) : (
              <span aria-hidden="true" className="inline-block w-3 shrink-0" />
            )}
            <span className={row.strong ? 'tabular font-semibold text-slate-50' : 'tabular font-semibold text-slate-100'}>
              {row.value}
            </span>
            <span className="min-w-0 truncate text-slate-400">{row.label}</span>
          </li>
        ))}
      </ul>
      {note ? <p className="mt-1.5 text-slate-400">{note}</p> : null}
    </div>
  );
}

/**
 * Adapter for Recharts' `content` prop: gives the hovered datum to `render` (or nothing when inactive).
 * Usage: <Tooltip content={tooltipContent<Datum>((d) => <TooltipBox … />)} />
 */
export function tooltipContent<D>(render: (datum: D) => ReactNode) {
  function Content(props: TooltipContentProps<TooltipValueType, string | number>) {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;
    const datum = payload[0]?.payload as D | undefined;
    return datum ? <>{render(datum)}</> : null;
  }
  return Content;
}
