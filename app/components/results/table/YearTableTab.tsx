'use client';

/**
 * "Anno per anno": every simulated year in a grouped table (sticky header and first column), in today's or nominal
 * euros following the header toggle, with a client-side CSV export (";" and decimal comma for Italian Excel).
 */
import { useMemo } from 'react';
import { Download } from 'lucide-react';
import type { YearRow } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { Button, Card, cn } from '../../ui';
import { downloadTextFile } from '../../shell/download';
import { YEAR_COLUMNS, buildCsv, columnGroups, columnLabelKey, columnValue, groupLabelKey } from '../model/yearTable';
import { unitKey } from '../model/values';
import type { TabProps } from '../types';

/** File-name-safe version of the plan name. */
function slug(text: string): string {
  const s = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.slice(0, 40) || 'piano';
}

export function YearTableTab({ data }: TabProps) {
  const { t, lang, format } = useI18n();
  const { plan, result, mode } = data;
  const rows = result.rows;
  const groups = useMemo(() => columnGroups(), []);
  const retirementAge = result.summary.retirementAge;
  const statusLabel = (status: YearRow['status']) => t(`results.table.status.${status}`);

  const exportCsv = () => {
    const csv = buildCsv(rows, mode, {
      separator: lang === 'it' ? ';' : ',',
      decimal: lang === 'it' ? ',' : '.',
      headers: [
        t('results.col.age'),
        t('results.col.year'),
        t('results.table.col.status'),
        ...YEAR_COLUMNS.map((c) => `${t(groupLabelKey(c.group))} - ${t(columnLabelKey(c.id))}`),
      ],
      statusLabel,
    });
    downloadTextFile(`fire-planner-${slug(plan.name)}-${mode === 'real' ? t('results.table.fileReal') : t('results.table.fileNominal')}.csv`, csv, 'text/csv');
  };

  return (
    <Card as="section" aria-labelledby="results-table" padding="sm" className="sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="results-table" className="text-base font-semibold text-slate-100">
            {t('results.table.title')}
          </h3>
          <p className="mt-0.5 text-sm text-slate-400">{t('results.table.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-xs text-slate-300">{t(unitKey(mode))}</span>
          <Button size="sm" icon={<Download />} onClick={exportCsv}>
            {t('results.table.exportCsv')}
          </Button>
        </div>
      </div>
      <div
        className="scroll-thin max-h-[70vh] overflow-auto rounded-xl border border-slate-800"
        tabIndex={0}
        role="region"
        aria-label={t('results.table.scrollLabel')}
      >
        <table className="tabular w-max min-w-full border-separate border-spacing-0 text-xs">
          <caption className="sr-only">{t('results.table.caption', { unit: t(unitKey(mode)) })}</caption>
          <thead>
            <tr>
              <th
                rowSpan={2}
                scope="col"
                className="sticky left-0 top-0 z-30 border-b border-r border-slate-800 bg-slate-900 px-2.5 py-2 text-left font-medium text-slate-300"
              >
                {t('results.col.age')}
              </th>
              {groups.map((g) => (
                <th
                  key={g.group}
                  colSpan={g.span}
                  scope="colgroup"
                  className="sticky top-0 z-20 h-8 border-b border-l border-slate-800 bg-slate-900 px-2.5 text-left font-semibold text-slate-200"
                >
                  {t(groupLabelKey(g.group))}
                </th>
              ))}
            </tr>
            <tr>
              {YEAR_COLUMNS.map((c, i) => (
                <th
                  key={c.id}
                  scope="col"
                  className={cn(
                    'sticky top-8 z-20 whitespace-nowrap border-b border-slate-800 bg-slate-900 px-2.5 py-1.5 text-right font-medium text-slate-400',
                    (i === 0 || YEAR_COLUMNS[i - 1].group !== c.group) && 'border-l',
                  )}
                >
                  {t(columnLabelKey(c.id))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const firstRetired = row.age === retirementAge && row.status === 'retired';
              const failed = row.shortfall > 0.5;
              return (
                <tr key={row.t} data-age={row.age} className={cn('group', failed && 'bg-rose-400/10')}>
                  <th
                    scope="row"
                    className={cn(
                      'sticky left-0 z-10 whitespace-nowrap border-r border-slate-800 bg-slate-950 px-2.5 py-1.5 text-left font-normal group-hover:bg-slate-900',
                      firstRetired ? 'border-t-2 border-t-cyan-400/70' : 'border-t border-t-slate-800/70',
                    )}
                  >
                    <span className="font-semibold text-slate-100">{format.num(row.age)}</span>
                    <span className="ml-1.5 text-slate-400">
                      {row.calendarYear} · {statusLabel(row.status)}
                    </span>
                  </th>
                  {YEAR_COLUMNS.map((c, i) => {
                    const value = columnValue(c, row, mode);
                    return (
                      <td
                        key={c.id}
                        data-col={c.id}
                        className={cn(
                          'whitespace-nowrap px-2.5 py-1.5 text-right group-hover:bg-slate-800/40',
                          firstRetired ? 'border-t-2 border-t-cyan-400/70' : 'border-t border-t-slate-800/70',
                          (i === 0 || YEAR_COLUMNS[i - 1].group !== c.group) && 'border-l border-l-slate-800',
                          c.strong ? 'font-semibold text-slate-50' : Math.abs(value) < 0.5 ? 'text-slate-400' : 'text-slate-200',
                        )}
                      >
                        {Math.abs(value) < 0.5 ? '—' : format.eur(value, { signed: c.signed && value < 0 })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">{t('results.table.footer')}</p>
    </Card>
  );
}
