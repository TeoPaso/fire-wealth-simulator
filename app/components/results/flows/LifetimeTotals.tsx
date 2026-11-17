'use client';

/** Lifetime totals of the displayed plan (summary.totals, always in today's €). */
import { useI18n } from '@/lib/i18n';
import { Card } from '../../ui';
import { TOTAL_KEYS as KEYS } from '../model/flows';
import type { TabProps } from '../types';

export function LifetimeTotals({ data }: TabProps) {
  const { t, format } = useI18n();
  const totals = data.result.summary.totals;
  return (
    <Card as="section" aria-labelledby="results-totals">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id="results-totals" className="text-base font-semibold text-slate-100">
            {t('results.totals.title')}
          </h3>
          <p className="mt-0.5 text-sm text-slate-400">{t('results.totals.description')}</p>
        </div>
        <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-xs text-slate-300">{t('results.unit.real')}</span>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {KEYS.map((key) => (
          <div key={key} className="flex items-baseline justify-between gap-3 border-b border-slate-800/80 pb-1.5 text-sm">
            <dt className="min-w-0 text-slate-300">{t(`results.totals.${key}`)}</dt>
            <dd className="tabular whitespace-nowrap font-medium text-slate-100">{format.eur(totals[key])}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
