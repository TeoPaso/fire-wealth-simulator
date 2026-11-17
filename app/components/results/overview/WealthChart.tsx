'use client';

/**
 * Net worth by age as a stacked area: accessible (cash + portfolio net of latent tax) and locked (pension fund + TFR
 * net of exit taxes), with vertical lines at retirement, pension-fund access and state-pension claim.
 */
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/lib/i18n';
import { SERIES_COLORS } from '../../ui';
import { ChartFrame, ChartLegend, isCompact, type LegendItem } from '../charts/ChartFrame';
import { TooltipBox, tooltipContent } from '../charts/ChartTooltip';
import { DataTable } from '../charts/DataTable';
import { AXIS_PROPS, CHART, ageStep, stepTicks } from '../charts/theme';
import { ageMarkers, wealthSeries, type MarkerKind, type WealthPoint } from '../model/overview';
import { unitKey } from '../model/values';
import type { TabProps } from '../types';

export function WealthChart({ data }: TabProps) {
  const { t, format } = useI18n();
  const { plan, result, mode } = data;
  const points = useMemo(() => wealthSeries(result, plan.profile.startYear, mode), [result, plan.profile.startYear, mode]);
  const markers = useMemo(() => ageMarkers(plan, result), [plan, result]);
  const unit = t(unitKey(mode));
  const minAge = points[0]?.age ?? plan.profile.currentAge;
  const maxAge = points[points.length - 1]?.age ?? plan.profile.lifeExpectancy;

  const markerLabel = (kinds: MarkerKind[]) => kinds.map((k) => t(`results.marker.${k}`)).join(' · ');
  const markerShort = (kinds: MarkerKind[]) => kinds.map((k) => t(`results.marker.short.${k}`)).join(' · ');

  const legend: LegendItem[] = [
    { key: 'accessible', label: t('results.series.accessible'), color: SERIES_COLORS.accessible, shape: 'rect' },
    { key: 'locked', label: t('results.series.locked'), color: SERIES_COLORS.locked, shape: 'rect' },
  ];

  const Content = useMemo(
    () =>
      tooltipContent<WealthPoint>((d) => (
        <TooltipBox
          title={
            d.age > plan.profile.lifeExpectancy
              ? t('results.tooltip.end', { age: format.num(plan.profile.lifeExpectancy), year: String(d.year) })
              : t('results.tooltip.ageYear', { age: format.num(d.age), year: String(d.year) })
          }
          rows={[
            { key: 'netWorth', label: t('results.series.netWorth'), value: format.eur(d.netWorth), strong: true },
            { key: 'accessible', label: t('results.series.accessible'), value: format.eur(d.accessible), color: SERIES_COLORS.accessible },
            { key: 'locked', label: t('results.series.locked'), value: format.eur(d.locked), color: SERIES_COLORS.locked },
          ]}
        />
      )),
    [t, format, plan.profile.lifeExpectancy],
  );

  const table = (
    <DataTable
      caption={t('results.wealth.title')}
      columns={[
        { key: 'age', label: t('results.col.age') },
        { key: 'year', label: t('results.col.year'), numeric: true },
        { key: 'accessible', label: t('results.series.accessible'), numeric: true },
        { key: 'locked', label: t('results.series.locked'), numeric: true },
        { key: 'netWorth', label: t('results.series.netWorth'), numeric: true },
      ]}
      rows={points.map((p) => ({
        key: p.age,
        cells: {
          age: format.num(p.age),
          year: String(p.year),
          accessible: format.eur(p.accessible),
          locked: format.eur(p.locked),
          netWorth: format.eur(p.netWorth),
        },
      }))}
    />
  );

  const summary = result.summary;
  return (
    <ChartFrame
      title={t('results.wealth.title')}
      description={t('results.wealth.description')}
      unit={unit}
      ariaLabel={t('results.wealth.aria', {
        from: format.num(minAge),
        to: format.num(maxAge),
        atRetirement: format.eur(summary.netWorthAtRetirementToday),
        age: format.num(summary.retirementAge),
      })}
      legend={legend}
      height={300}
      table={table}
      footer={
        <>
          {markers.length > 0 ? (
            <ChartLegend
              className="mb-1.5"
              items={markers.map((m) => ({
                key: String(m.age),
                label: t('results.marker.legend', { age: format.num(m.age), what: markerLabel(m.kinds) }),
                color: CHART.ink,
                shape: 'rule' as const,
              }))}
            />
          ) : null}
          <p>{t('results.wealth.footer')}</p>
        </>
      }
    >
      {(width) => {
        const compact = isCompact(width);
        return (
          <AreaChart data={points} margin={{ top: 22, right: 8, bottom: 0, left: 0 }} title={t('results.wealth.title')}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
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
            <Area
              type="monotone"
              dataKey="accessible"
              stackId="wealth"
              stroke={SERIES_COLORS.accessible}
              strokeWidth={2}
              fill={SERIES_COLORS.accessible}
              fillOpacity={0.22}
              isAnimationActive={false}
              activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="locked"
              stackId="wealth"
              stroke={SERIES_COLORS.locked}
              strokeWidth={2}
              fill={SERIES_COLORS.locked}
              fillOpacity={0.22}
              isAnimationActive={false}
              activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }}
            />
            {markers.map((m, i) => (
              <ReferenceLine
                key={m.age}
                x={m.age}
                stroke={CHART.ink}
                strokeOpacity={0.55}
                strokeWidth={1}
                label={{
                  value: compact ? format.num(m.age) : markerShort(m.kinds),
                  position: i % 2 === 0 ? 'insideTopLeft' : 'insideTopRight',
                  fill: CHART.tick,
                  fontSize: 11,
                  offset: 4,
                }}
              />
            ))}
          </AreaChart>
        );
      }}
    </ChartFrame>
  );
}
