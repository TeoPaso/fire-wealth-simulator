'use client';

/**
 * Net worth by age as a stacked area: accessible (cash + portfolio net of latent tax) and locked (pension fund + TFR
 * net of exit taxes), with vertical lines at retirement, pension-fund access and state-pension claim. Years whose
 * spending is not covered are shaded (UX-07); the annuitised share of the fund is explained (UX-14); the accessible
 * description uses the plotted value in the active unit (UX-16).
 */
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/lib/i18n';
import { SERIES_COLORS } from '../../ui';
import { ChartFrame, ChartLegend, isCompact, type LegendItem } from '../charts/ChartFrame';
import { TooltipBox, tooltipContent } from '../charts/ChartTooltip';
import { DataTable } from '../charts/DataTable';
import { MarkerLabel } from '../charts/shapes';
import { AXIS_PROPS, CHART, ageStep, stepTicks } from '../charts/theme';
import { ageMarkers, annuityAtAccess, shortfallRanges, wealthSeries, type MarkerKind, type WealthPoint } from '../model/overview';
import { unitKey } from '../model/values';
import type { TabProps } from '../types';

const SHORTFALL_COLOR = SERIES_COLORS.shortfall;

export function WealthChart({ data }: TabProps) {
  const { t, format } = useI18n();
  const { plan, result, mode } = data;
  const points = useMemo(() => wealthSeries(result, plan.profile.startYear, mode), [result, plan.profile.startYear, mode]);
  const markers = useMemo(() => ageMarkers(plan, result), [plan, result]);
  const shortfalls = useMemo(() => shortfallRanges(result), [result]);
  const annuity = annuityAtAccess(plan, result);
  const unit = t(unitKey(mode));
  const minAge = points[0]?.age ?? plan.profile.currentAge;
  const maxAge = points[points.length - 1]?.age ?? plan.profile.lifeExpectancy;

  const markerLabel = (kinds: MarkerKind[]) => kinds.map((k) => t(`results.marker.${k}`)).join(' · ');
  const markerShort = (kinds: MarkerKind[]) => kinds.map((k) => t(`results.marker.short.${k}`)).join(' · ');

  const legend: LegendItem[] = [
    { key: 'accessible', label: t('results.series.accessible'), color: SERIES_COLORS.accessible, shape: 'rect' },
    { key: 'locked', label: t('results.series.locked'), color: SERIES_COLORS.locked, shape: 'rect' },
    ...(shortfalls.length > 0
      ? [{ key: 'shortfall', label: t('results.wealth.shortfallLegend'), color: SHORTFALL_COLOR, shape: 'band' as const }]
      : []),
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
  // The value plotted at the retirement age, in the unit shown (today's € or nominal €).
  const atRetirement = points.find((p) => p.age === summary.retirementAge)?.netWorth ?? NaN;
  const ranges = (list: { from: number; to: number }[]) =>
    format.list(list.map((r) => (r.to - r.from > 1 ? `${format.num(r.from)}–${format.num(r.to - 1)}` : format.num(r.from))));
  return (
    <ChartFrame
      title={t('results.wealth.title')}
      description={t('results.wealth.description')}
      unit={unit}
      ariaLabel={`${t('results.wealth.aria', {
        from: format.num(minAge),
        to: format.num(maxAge),
        atRetirement: format.eur(atRetirement),
        age: format.num(summary.retirementAge),
        unit,
      })}${shortfalls.length > 0 ? ` ${t('results.wealth.ariaShortfall', { ages: ranges(shortfalls) })}` : ''}`}
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
          {shortfalls.length > 0 ? (
            <p className="mb-1 text-rose-200">{t('results.wealth.shortfallNote', { ages: ranges(shortfalls) })}</p>
          ) : null}
          {annuity ? (
            <p className="mb-1">{t('results.wealth.annuityNote', { age: format.num(annuity.age), pct: format.pct(annuity.pct, 0) })}</p>
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
            {shortfalls.map((r) => (
              <ReferenceArea key={`sf-${r.from}`} x1={r.from} x2={Math.min(r.to, maxAge)} fill={SHORTFALL_COLOR} fillOpacity={0.16} stroke="none" />
            ))}
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
                label={
                  <MarkerLabel
                    value={compact ? format.num(m.age) : markerShort(m.kinds)}
                    side={i % 2 === 0 ? 'right' : 'left'}
                    fill={CHART.tick}
                  />
                }
              />
            ))}
          </AreaChart>
        );
      }}
    </ChartFrame>
  );
}
