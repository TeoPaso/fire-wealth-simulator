'use client';

/**
 * Headline card: the FI age (deterministic), when, the age reaching the Monte Carlo target, the success
 * probability at the displayed retirement age, the FIRE number with progress, and the current savings rate.
 */
import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { Card, HelpTooltip, SERIES_COLORS, Skeleton, cn } from '../../ui';
import type { TabProps } from '../types';

function Figure({
  label,
  help,
  children,
  sub,
  stale,
}: {
  label: string;
  help?: string;
  children: ReactNode;
  sub?: ReactNode;
  stale?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="flex items-start gap-1 text-sm text-slate-400">
        <span className="min-w-0">{label}</span>
        {help ? <HelpTooltip content={help} label={label} /> : null}
      </div>
      <div className={cn('mt-1 text-2xl font-semibold tracking-tight text-slate-50 transition-opacity', stale && 'opacity-50')}>
        {children}
      </div>
      {sub ? <div className="mt-1 text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

export function Headline({ data }: TabProps) {
  const { t, tp, format } = useI18n();
  const { plan, result, analysis } = data;
  const { summary, rows } = result;
  const target = plan.simulation.successTargetPct;
  const mc = analysis.available ? (analysis.result?.monteCarlo ?? null) : null;
  const mcFailed = analysis.available && analysis.error !== null;
  const fixed = plan.retirement.mode === 'fixedAge';
  const savingsRate = rows[0]?.savingsRatePct ?? null;
  const progress = Math.max(0, Math.min(100, summary.progressPct));
  const ageText = (age: number) => t('results.ageValue', { age: format.num(age) });

  const mcPending = <Skeleton className="mt-1 h-7 w-24" />;

  return (
    <Card as="section" aria-labelledby="results-headline" padding="lg">
      <h3 id="results-headline" className="sr-only">
        {t('results.headline.title')}
      </h3>
      {summary.fiAge !== null ? (
        <>
          <p className="text-slate-300">
            <span className="block text-base">{t('results.headline.lead')}</span>
            <span className="mt-1 block text-5xl font-semibold tracking-tight text-slate-50" data-testid="fi-age">
              {ageText(summary.fiAge)}
            </span>
          </p>
          <p className="mt-2 text-base text-slate-300">
            {summary.yearsToFi === 0
              ? t('results.headline.now')
              : tp('results.headline.inYears', summary.yearsToFi ?? 0, {
                  year: String(plan.profile.startYear + (summary.yearsToFi ?? 0)),
                })}
          </p>
        </>
      ) : (
        <>
          <p className="text-2xl font-semibold leading-snug tracking-tight text-amber-100" data-testid="fi-age">
            {t('results.headline.notReachable', { age: format.num(plan.profile.lifeExpectancy) })}
          </p>
          <p className="mt-2 text-sm text-slate-300">{t('results.headline.notReachableHint')}</p>
        </>
      )}
      {fixed || summary.fiAge === null ? (
        <p className="mt-2 text-sm text-slate-400">
          {fixed
            ? t('results.headline.fixedAge', { age: format.num(summary.retirementAge) })
            : t('results.headline.fallbackAge', { age: format.num(summary.retirementAge) })}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <Figure
          label={t('results.headline.confidentLabel', { target: format.pct(target, 0) })}
          help={t('results.headline.confidentHelp', { runs: format.num(plan.simulation.monteCarloRuns) })}
          stale={analysis.stale}
          sub={mc ? t('results.headline.confidentSub') : undefined}
        >
          {mc ? (
            mc.confidentFiAge !== null ? (
              ageText(mc.confidentFiAge)
            ) : (
              <span className="text-lg">
                {t('results.headline.confidentNone', {
                  age: format.num(Math.max(...mc.successByRetirementAge.map((s) => s.age), summary.retirementAge)),
                })}
              </span>
            )
          ) : mcFailed ? (
            <span className="text-base text-rose-200">{t('results.analysis.failedShort')}</span>
          ) : (
            mcPending
          )}
        </Figure>
        <Figure
          label={t('results.headline.successLabel', { age: format.num(summary.retirementAge) })}
          help={t('results.headline.successHelp')}
          stale={analysis.stale}
        >
          {mc ? (
            format.pct(mc.successProbabilityPct, 0)
          ) : mcFailed ? (
            <span className="text-base text-rose-200">{t('results.analysis.failedShort')}</span>
          ) : (
            mcPending
          )}
        </Figure>
        <Figure
          label={t('results.headline.fireNumberLabel')}
          help={t('results.headline.fireNumberHelp', { swr: format.pct(plan.withdrawal.swrPct, 1) })}
          sub={
            <>
              <div
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                aria-label={t('results.headline.progressLabel')}
                className="mt-1 h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: `${SERIES_COLORS.accessible}40` }}
              >
                <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: SERIES_COLORS.accessible }} />
              </div>
              <p className="mt-1.5">
                {t('results.headline.progress', {
                  pct: format.pct(summary.progressPct, 0),
                  amount: format.eur(summary.accessibleTodayStart),
                })}
              </p>
            </>
          }
        >
          {format.eur(summary.fireNumberToday)}
        </Figure>
        <Figure
          label={t('results.headline.savingsRateLabel')}
          help={t('results.headline.savingsRateHelp')}
          sub={
            summary.avgSavingsRatePct !== null
              ? t('results.headline.savingsRateAvg', { pct: format.pct(summary.avgSavingsRatePct, 0) })
              : undefined
          }
        >
          {savingsRate !== null ? format.pct(savingsRate, 0) : '—'}
        </Figure>
      </div>
      <p className="mt-3 text-xs text-slate-400">{t('results.headline.todayNote')}</p>
    </Card>
  );
}
