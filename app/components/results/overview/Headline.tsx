'use client';

/**
 * Headline card. It never presents a coin-flip age as THE answer (UX-01):
 * - 'auto' mode: the deterministic FI age ("scenario medio") and the age that meets the Monte Carlo target are shown
 *   side by side, with the same weight, followed by a verdict coloured by how the success at the displayed age
 *   compares with the target;
 * - 'fixedAge' mode: the answer to "can I stop at N?" — whether accessible money lasts, and the success rate —
 *   with the computed FI age as the secondary line (UX-07);
 * - no FI age because the money runs out WHILE STILL WORKING (engine issue `shortfallWhileWorking`): the headline
 *   names that cash gap (age, amount, event) instead of "FI not reachable", since no retirement age can fix it;
 * - then the success probability (toned), the FIRE number with progress, and the current savings rate.
 */
import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import type { MonteCarloResult } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { Card, HelpTooltip, SERIES_COLORS, Skeleton, cn } from '../../ui';
import { cashGapWhileWorking, currentMonteCarlo, successTone, type SuccessTone } from '../model/overview';
import type { TabProps } from '../types';

const TONE_STYLE: Record<SuccessTone, { box: string; text: string; icon: typeof CircleCheck }> = {
  good: { box: 'border-emerald-400/30 bg-emerald-400/10', text: 'text-emerald-100', icon: CircleCheck },
  near: { box: 'border-amber-400/30 bg-amber-400/10', text: 'text-amber-100', icon: TriangleAlert },
  bad: { box: 'border-rose-400/40 bg-rose-400/10', text: 'text-rose-100', icon: CircleAlert },
};

function Figure({
  label,
  help,
  children,
  sub,
  stale,
  tone,
  testId,
}: {
  label: string;
  help?: string;
  children: ReactNode;
  sub?: ReactNode;
  stale?: boolean;
  tone?: SuccessTone | null;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      data-tone={tone ?? undefined}
      className={cn('min-w-0 rounded-xl border p-3', tone ? TONE_STYLE[tone].box : 'border-slate-800 bg-slate-950/30')}
    >
      <div className="flex items-start gap-1 text-sm text-slate-400">
        <span className={cn('min-w-0', tone && 'text-slate-300')}>{label}</span>
        {help ? <HelpTooltip content={help} label={label} /> : null}
      </div>
      <div
        className={cn(
          'mt-1 text-2xl font-semibold tracking-tight transition-opacity',
          tone ? TONE_STYLE[tone].text : 'text-slate-50',
          stale && 'opacity-50',
        )}
      >
        {children}
      </div>
      {sub ? <div className={cn('mt-1 text-xs', tone ? TONE_STYLE[tone].text : 'text-slate-400')}>{sub}</div> : null}
    </div>
  );
}

/** One of the two co-equal ages of the hero. */
function HeroAge({
  children,
  caption,
  when,
  help,
  testId,
  stale,
}: {
  children: ReactNode;
  caption: string;
  when?: ReactNode;
  help?: string;
  testId?: string;
  stale?: boolean;
}) {
  return (
    <div className="min-w-0">
      <span
        className={cn('block text-4xl font-semibold tracking-tight text-slate-50 transition-opacity sm:text-5xl', stale && 'opacity-50')}
        data-testid={testId}
      >
        {children}
      </span>
      <span className="mt-1 flex items-start gap-1 text-sm text-slate-300">
        <span className="min-w-0">{caption}</span>
        {help ? <HelpTooltip content={help} label={caption} /> : null}
      </span>
      {when ? <span className="mt-0.5 block text-sm text-slate-400">{when}</span> : null}
    </div>
  );
}

function Verdict({ tone, children, testId }: { tone: SuccessTone; children: ReactNode; testId?: string }) {
  const style = TONE_STYLE[tone];
  const Icon = style.icon;
  return (
    <p
      data-testid={testId}
      data-tone={tone}
      className={cn('mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm leading-relaxed', style.box, style.text)}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function Headline({ data }: TabProps) {
  const { t, tp, format } = useI18n();
  const { plan, result, analysis } = data;
  const { summary, rows } = result;
  const target = plan.simulation.successTargetPct;
  const targetText = format.pct(target, 0);
  // Monte Carlo of the displayed retirement age only (a result for another age is hidden, not relabelled).
  const mcAny: MonteCarloResult | null = analysis.available ? (analysis.result?.monteCarlo ?? null) : null;
  const mc = currentMonteCarlo(mcAny, result);
  const mcFailed = analysis.available && analysis.error !== null;
  const fixed = plan.retirement.mode === 'fixedAge';
  const savingsRate = rows[0]?.savingsRatePct ?? null;
  const progress = Math.max(0, Math.min(100, summary.progressPct));
  const ageText = (age: number) => t('results.ageValue', { age: format.num(age) });
  const R = summary.retirementAge;
  const gap = cashGapWhileWorking(result);
  const gapTitle = gap ? t('results.headline.cashGap', { age: format.num(gap.age), amount: format.eur(gap.amountToday) }) : '';
  const gapHint = gap
    ? gap.event !== null
      ? t('results.headline.cashGapHintEvent', { event: gap.event })
      : t('results.headline.cashGapHint')
    : '';
  const tone = mc ? successTone(mc.successProbabilityPct, target) : null;
  const maxCandidate = mc ? Math.max(...mc.successByRetirementAge.map((s) => s.age), R) : R;
  const runs = format.num(plan.simulation.monteCarloRuns);
  const whenText = (age: number) => {
    const years = age - plan.profile.currentAge;
    return years <= 0
      ? t('results.headline.now')
      : tp('results.headline.inYears', years, { year: String(plan.profile.startYear + years) });
  };

  const mcPending = <Skeleton className="mt-1 h-7 w-24" />;
  const failedShort = <span className="text-base text-rose-200">{t('results.analysis.failedShort')}</span>;
  const confidentCaption = t('results.headline.confidentHero', { target: targetText });
  const confidentHelp = t('results.headline.confidentHelp', { runs });

  /** Second hero age: the earliest age meeting the Monte Carlo target. */
  const confident = mc ? (
    <HeroAge
      testId="confident-age"
      caption={confidentCaption}
      help={confidentHelp}
      when={mc.confidentFiAge !== null ? whenText(mc.confidentFiAge) : undefined}
      stale={analysis.stale}
    >
      {mc.confidentFiAge !== null ? (
        ageText(mc.confidentFiAge)
      ) : (
        <span className="block text-xl leading-snug sm:text-2xl">
          {t('results.headline.confidentNone', { age: format.num(maxCandidate) })}
        </span>
      )}
    </HeroAge>
  ) : (
    <HeroAge caption={confidentCaption} help={confidentHelp}>
      {mcFailed ? failedShort : <Skeleton className="h-10 w-32 sm:h-12" />}
    </HeroAge>
  );

  /** The verdict for the displayed retirement age, coloured by how its success compares with the target. */
  let verdict: ReactNode = null;
  if (mc && tone) {
    const parts = [
      t(`results.headline.verdict.${tone}`, { age: format.num(R), pct: format.pct(mc.successProbabilityPct, 0), target: targetText }),
    ];
    if (tone !== 'good') {
      parts.push(
        mc.confidentFiAge !== null && mc.confidentFiAge > R
          ? t('results.headline.verdictLater', { age: format.num(mc.confidentFiAge) })
          : t('results.headline.verdictNone', { age: format.num(maxCandidate) }),
      );
      if (!fixed) parts.push(t('results.headline.chartsAtAge', { age: format.num(R) }));
    }
    verdict = (
      <Verdict tone={tone} testId="headline-verdict">
        {parts.join(' ')}
      </Verdict>
    );
  }

  let hero: ReactNode;
  if (fixed) {
    const depletes = summary.depletionAge !== null;
    hero = (
      <>
        <p className="text-base text-slate-300">{t('results.headline.fixedLead', { age: format.num(R) })}</p>
        <p
          data-testid="fixed-verdict"
          className={cn(
            'mt-1 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl',
            depletes ? 'text-rose-200' : 'text-emerald-200',
          )}
        >
          {depletes
            ? t(gap ? 'results.headline.fixedDepletesWorking' : 'results.headline.fixedDepletes', {
                age: format.num(summary.depletionAge as number),
              })
            : t('results.headline.fixedLasts', { age: format.num(plan.profile.lifeExpectancy) })}
        </p>
        {gap ? (
          <p className="mt-1 text-sm text-slate-300" data-testid="cash-gap-hint">
            {t('results.headline.cashGapAmount', { amount: format.eur(gap.amountToday) })} {gapHint}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-slate-300">
          {summary.fiAge !== null ? (
            <>
              {t('results.headline.fixedAuto')}{' '}
              <span className="font-semibold text-slate-100" data-testid="fi-age">
                {ageText(summary.fiAge)}
              </span>
              {mc && mc.confidentFiAge !== null
                ? ` · ${t('results.headline.fixedConfident', { target: targetText, age: format.num(mc.confidentFiAge) })}`
                : null}
            </>
          ) : (
            <span data-testid="fi-age">
              {gap
                ? t('results.headline.fixedNoAgeGap')
                : t('results.headline.notReachable', { age: format.num(plan.profile.lifeExpectancy) })}
            </span>
          )}
        </p>
        {verdict}
      </>
    );
  } else if (summary.fiAge !== null) {
    hero = (
      <>
        <p className="text-base text-slate-300">{t('results.headline.lead')}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
          <HeroAge
            testId="fi-age"
            caption={t('results.headline.medianCaption')}
            help={t('results.headline.medianHelp')}
            when={whenText(summary.fiAge)}
          >
            {ageText(summary.fiAge)}
          </HeroAge>
          {confident}
        </div>
        {verdict}
      </>
    );
  } else {
    hero = (
      <>
        <p className="text-2xl font-semibold leading-snug tracking-tight text-amber-100" data-testid="fi-age">
          {gap ? gapTitle : t('results.headline.notReachable', { age: format.num(plan.profile.lifeExpectancy) })}
        </p>
        <p className="mt-2 text-sm text-slate-300" data-testid={gap ? 'cash-gap-hint' : undefined}>
          {gap ? gapHint : t('results.headline.notReachableHint')}
        </p>
        <p className="mt-2 text-sm text-slate-400">{t('results.headline.fallbackAge', { age: format.num(R) })}</p>
        {verdict}
      </>
    );
  }

  return (
    <Card as="section" aria-labelledby="results-headline" padding="lg">
      <h3 id="results-headline" className="sr-only">
        {t('results.headline.title')}
      </h3>
      {hero}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Figure
          testId="success-card"
          label={t('results.headline.successLabel', { age: format.num(R) })}
          help={t('results.headline.successHelp')}
          stale={analysis.stale}
          tone={tone}
          sub={
            mc && tone
              ? t(tone === 'good' ? 'results.headline.successAbove' : 'results.headline.successBelow', { target: targetText })
              : undefined
          }
        >
          {mc ? format.pct(mc.successProbabilityPct, 0) : mcFailed ? failedShort : mcPending}
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
