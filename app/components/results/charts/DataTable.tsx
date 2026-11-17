'use client';

/** Accessible table alternative of a chart ("Mostra dati"): every plotted value, plain text. */
import { cn } from '../../ui';

export interface DataColumn {
  key: string;
  label: string;
  /** Numbers are right-aligned with tabular figures. */
  numeric?: boolean;
}

export interface DataTableProps {
  caption: string;
  columns: readonly DataColumn[];
  rows: readonly { key: string | number; cells: Record<string, string> }[];
  className?: string;
}

export function DataTable({ caption, columns, rows, className }: DataTableProps) {
  return (
    <div className={cn('scroll-thin max-h-80 overflow-auto rounded-xl border border-slate-800', className)}>
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-slate-900">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn('whitespace-nowrap px-2.5 py-2 font-medium text-slate-300', c.numeric ? 'text-right' : 'text-left')}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-slate-800/80">
              {columns.map((c, i) =>
                i === 0 ? (
                  <th key={c.key} scope="row" className="whitespace-nowrap px-2.5 py-1.5 text-left font-normal text-slate-300">
                    {row.cells[c.key]}
                  </th>
                ) : (
                  <td
                    key={c.key}
                    className={cn('whitespace-nowrap px-2.5 py-1.5 text-slate-200', c.numeric && 'tabular text-right')}
                  >
                    {row.cells[c.key]}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
