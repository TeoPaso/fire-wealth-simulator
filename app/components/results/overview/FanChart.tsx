'use client';

/**
 * Monte Carlo fan chart (today's €): 10–90 and 25–75 percentile bands and the median. It plots ACCESSIBLE wealth by
 * default, since success is measured on it: failing runs visibly reach 0 € before the locked money (pension fund,
 * company TFR) unlocks, while net worth would still show that locked money as a cushion (UX-04). The bridge from
 * retirement to the first unlock is shaded. A toggle switches to total net worth.
 */
import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/lib/i18n';
import { SERIES_COLORS, SegmentedControl } from '../../ui';
import { ChartFrame, isCompact, type LegendItem } from '../charts/ChartFrame';
import { TooltipBox, tooltipContent } from '../charts/ChartTooltip';
import { DataTable } from '../charts/DataTable';
import { MarkerLabel } from '../charts/shapes';
import { AXIS_PROPS, CHART, ageStep, stepTicks } from '../charts/theme';
import { bridgeRange, currentMonteCarlo, fanSeries, type FanMeasure, type FanPoint } from '../model/overview';
import type { TabProps } from '../types';
import { AnalysisPlaceholder } from './AnalysisPlaceholder';

const COLORS: Record<FanMeasure, string> = { accessible: SERIES_COLORS.accessible, netWorth: SERIES_COLORS.netWorth };

export function FanChart({ data }: TabProps) {
  const { t, format } = useI18n();
  const { plan, result, analysis, mode } = data;
  const [measure, setMeasure] = useState<FanMeasure>('accessible');
  const COLOR = COLORS[measure];
  const mc = analysis.available ? (analysis.result?.monteCarlo ?? null) : null;
  const start = measure === 'accessible' ? result.summary.accessibleTodayStart : result.summary.netWorthTodayStart;
  const points = useMemo(
    () => (mc ? fanSeries(mc, start, plan.profile.currentAge, plan.profile.startYear, measure) : []),
    [mc, start, plan.profile.currentAge, plan.profile.startYear, measure],
  );
  // The deterministic bridge applies only while the Monte Carlo belongs to the same retirement age.
  const bridge = currentMonteCarlo(mc, result) ? bridgeRange(result) : null;

  const Content = useMemo(
    () =>
      tooltipContent<FanPoint>((d) => (
        <TooltipBox
          title={
            d.age > plan.profile.lifeExpectancy
              ? t('results.tooltip.end', { age: format.num(plan.profile.lifeExpectancy), year: String(d.year) })
              : t('results.tooltip.ageYear', { age: format.num(d.age), year: String(d.year) })
          }
          rows={[
            { key: 'p90', label: t('results.fan.p90'), value: format.eur(d.p90) },
            { key: 'p75', label: t('results.fan.p75'), value: format.eur(d.p75) },
            { key: 'p50', label: t('results.fan.p50'), value: format.eur(d.p50), color: COLOR, strong: true },
            { key: 'p25', label: t('results.fan.p25'), value: format.eur(d.p25) },
            { key: 'p10', label: t('results.fan.p10'), value: format.eur(d.p10) },
          ]}
        />
      )),
    [t, format, plan.profile.lifeExpectancy, COLOR],
  );

  if (!mc) {
    return <AnalysisPlaceholder analysis={analysis} title={t('results.fan.title')} height={300} />;
  }

  const minAge = points[0]?.age ?? plan.profile.currentAge;
  const maxAge = points[points.length - 1]?.age ?? plan.profile.lifeExpectancy;
  const median = points.find((p) => p.age === mc.retirementAge);
  const last = points[points.length - 1];

  const legend: LegendItem[] = [
    { key: 'outer', label: t('results.fan.outer'), color: COLOR, shape: 'band' },
    { key: 'inner', label: t('results.fan.inner'), color: COLOR, shape: 'rect' },
    { key: 'median', label: t('results.fan.median'), color: COLOR, shape: 'line' },
    ...(bridge ? [{ key: 'bridge', label: t('results.fan.bridge', { from: format.num(bridge.from), to: format.num(bridge.to) }), color: CHART.ink, shape: 'band' as const }] : []),
  ];
  const title = t(measure === 'accessible' ? 'results.fan.titleAccessible' : 'results.fan.title');

  const table = (
    <DataTable
      caption={title}
      columns={[
        { key: 'age', label: t('results.col.age') },
        { key: 'p10', label: t('results.fan.p10'), numeric: true },
        { key: 'p25', label: t('results.fan.p25'), numeric: true },
        { key: 'p50', label: t('results.fan.p50'), numeric: true },
        { key: 'p75', label: t('results.fan.p75'), numeric: true },
        { key: 'p90', label: t('results.fan.p90'), numeric: true },
      ]}
      rows={points.map((p) => ({
        key: p.age,
        cells: {
          age: format.num(p.age),
          p10: format.eur(p.p10),
          p25: format.eur(p.p25),
          p50: format.eur(p.p50),
          p75: format.eur(p.p75),
          p90: format.eur(p.p90),
        },
      }))}
    />
  );

  return (
    <ChartFrame
      title={title}
      description={
        <>
          {t('results.fan.description', { runs: format.num(mc.runs), age: format.num(mc.retirementAge) })}{' '}
          {t(measure === 'accessible' ? 'results.fan.accessibleNote' : 'results.fan.netWorthNote')}
        </>
      }
      unit={t('results.unit.real')}
      actions={
        <SegmentedControl
          size="sm"
          label={t('results.fan.measure')}
          value={measure}
          onChange={setMeasure}
          options={[
            { value: 'accessible', label: t('results.fan.measureAccessible') },
            { value: 'netWorth', label: t('results.fan.measureNetWorth') },
          ]}
        />
      }
      ariaLabel={t(measure === 'accessible' ? 'results.fan.ariaAccessible' : 'results.fan.aria', {
        runs: format.num(mc.runs),
        age: format.num(mc.retirementAge),
        median: format.eur(median?.p50 ?? NaN),
        endAge: format.num(maxAge),
        endP10: format.eur(last?.p10 ?? NaN),
        endP50: format.eur(last?.p50 ?? NaN),
        endP90: format.eur(last?.p90 ?? NaN),
      })}
      legend={legend}
      height={300}
      stale={analysis.stale}
      table={table}
      footer={
        <>
          <p>{t('results.fan.footer')}</p>
          {mode === 'nominal' ? <p className="mt-1">{t('results.fan.alwaysReal')}</p> : null}
        </>
      }
    >
      {(width) => {
        const compact = isCompact(width);
        return (
          <ComposedChart data={points} margin={{ top: 22, right: 8, bottom: 0, left: 0 }} title={title}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            {bridge ? <ReferenceArea x1={bridge.from} x2={Math.min(bridge.to, maxAge)} fill={CHART.ink} fillOpacity={0.07} stroke="none" /> : null}
            <XAxis
              {...AXIS_PROPS}
              dataKey="age"
              type="number"
              domain={[minAge, maxAge]}
              ticks={stepTicks(minAge, maxAge, ageStep(maxAge - minAge, compact))}
              allowDecimals={false}
            />
            <YAxis {...AXIS_PROPS} width={compact ? 52 : 64} tickFormatter={(v: number) => format.eurCompact(v)} tickCount={compact ? 4 : 6} />
            <Tooltip content={Content} cursor={{ stroke: CHART.axis, strokeWidth: 1 }} isAnimationActive={false} />
            <Area type="monotone" dataKey="outer" stroke="none" fill={COLOR} fillOpacity={0.16} isAnimationActive={false} activeDot={false} />
            <Area type="monotone" dataKey="inner" stroke="none" fill={COLOR} fillOpacity={0.32} isAnimationActive={false} activeDot={false} />
            <Line
              type="monotone"
              dataKey="p50"
              stroke={COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }}
            />
            <ReferenceLine
              x={mc.retirementAge}
              stroke={CHART.ink}
              strokeOpacity={0.55}
              label={
                <MarkerLabel
                  value={compact ? format.num(mc.retirementAge) : t('results.marker.short.retirement')}
                  side="right"
                  fill={CHART.tick}
                />
              }
            />
          </ComposedChart>
        );
      }}
    </ChartFrame>
  );
}
