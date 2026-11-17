'use client';

/**
 * Monte Carlo success probability by retirement age (emphasis form): ages meeting the target in the accent hue, the
 * others de-emphasised, the target as a labelled horizontal line, the confident FI age and the displayed age labelled.
 */
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/lib/i18n';
import { SERIES_COLORS } from '../../ui';
import { ChartFrame, isCompact, type LegendItem } from '../charts/ChartFrame';
import { TooltipBox, tooltipContent } from '../charts/ChartTooltip';
import { DataTable } from '../charts/DataTable';
import { columnShape } from '../charts/shapes';
import { AXIS_PROPS, CHART } from '../charts/theme';
import { successSeries, type SuccessPoint } from '../model/overview';
import type { TabProps } from '../types';
import { AnalysisPlaceholder } from './AnalysisPlaceholder';

const ACCENT = SERIES_COLORS.netWorth;

export function SuccessChart({ data }: TabProps) {
  const { t, format } = useI18n();
  const { plan, analysis } = data;
  const mc = analysis.available ? (analysis.result?.monteCarlo ?? null) : null;
  const target = plan.simulation.successTargetPct;
  const points = useMemo(() => (mc ? successSeries(mc, target) : []), [mc, target]);
  const shape = useMemo(() => columnShape((d) => ((d as SuccessPoint).meetsTarget ? ACCENT : CHART.deemphasis)), []);

  const Content = useMemo(
    () =>
      tooltipContent<SuccessPoint>((d) => (
        <TooltipBox
          title={t('results.success.tooltipTitle', { age: format.num(d.age) })}
          rows={[
            {
              key: 'success',
              label: t('results.success.series'),
              value: format.pct(d.successPct, 1),
              color: d.meetsTarget ? ACCENT : CHART.deemphasis,
              strong: true,
            },
          ]}
          note={d.meetsTarget ? t('results.success.meets') : t('results.success.below')}
        />
      )),
    [t, format],
  );

  if (!mc) return <AnalysisPlaceholder analysis={analysis} title={t('results.success.title')} height={240} />;

  const confident = mc.confidentFiAge;
  const legend: LegendItem[] = [
    { key: 'meets', label: t('results.success.legendMeets', { target: format.pct(target, 0) }), color: ACCENT, shape: 'rect' },
    { key: 'below', label: t('results.success.legendBelow'), color: CHART.deemphasis, shape: 'rect' },
    { key: 'target', label: t('results.success.legendTarget', { target: format.pct(target, 0) }), color: CHART.ink, shape: 'line' },
  ];

  const table = (
    <DataTable
      caption={t('results.success.title')}
      columns={[
        { key: 'age', label: t('results.success.colAge') },
        { key: 'pct', label: t('results.success.series'), numeric: true },
        { key: 'meets', label: t('results.success.colMeets') },
      ]}
      rows={points.map((p) => ({
        key: p.age,
        cells: {
          age: format.num(p.age),
          pct: format.pct(p.successPct, 1),
          meets: p.meetsTarget ? t('results.yes') : t('results.no'),
        },
      }))}
    />
  );

  const labelled = new Set<number>([mc.retirementAge, ...(confident !== null ? [confident] : [])]);

  return (
    <ChartFrame
      title={t('results.success.title')}
      description={t('results.success.description', { target: format.pct(target, 0) })}
      unit={t('results.unit.probability')}
      ariaLabel={
        confident !== null
          ? t('results.success.aria', {
              target: format.pct(target, 0),
              age: format.num(confident),
              from: format.num(points[0]?.age ?? 0),
              to: format.num(points[points.length - 1]?.age ?? 0),
            })
          : t('results.success.ariaNone', {
              target: format.pct(target, 0),
              from: format.num(points[0]?.age ?? 0),
              to: format.num(points[points.length - 1]?.age ?? 0),
            })
      }
      legend={legend}
      height={240}
      stale={analysis.stale}
      table={table}
    >
      {(width) => {
        const compact = isCompact(width);
        const step = points.length > 14 && compact ? 2 : 1;
        return (
          <BarChart data={points} margin={{ top: 22, right: 8, bottom: 0, left: 0 }} title={t('results.success.title')}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis {...AXIS_PROPS} dataKey="age" interval={step - 1} />
            <YAxis
              {...AXIS_PROPS}
              width={44}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => format.pct(v, 0)}
            />
            <Tooltip content={Content} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} isAnimationActive={false} />
            <ReferenceLine
              y={target}
              stroke={CHART.ink}
              strokeWidth={1.5}
              label={{
                value: t('results.success.targetLabel', { target: format.pct(target, 0) }),
                position: 'insideTopLeft',
                fill: CHART.ink,
                fontSize: 11,
                offset: 6,
              }}
            />
            <Bar
              dataKey="successPct"
              maxBarSize={CHART.maxBarSize}
              shape={shape}
              isAnimationActive={false}
              label={(props: { x?: number | string; y?: number | string; width?: number | string; index?: number }) => {
                const p = points[props.index ?? -1];
                if (!p || !labelled.has(p.age)) return <g />;
                const x = Number(props.x) + Number(props.width) / 2;
                const y = Number(props.y) - 6;
                return (
                  <text x={x} y={y} textAnchor="middle" fill={CHART.ink} fontSize={11} className="tabular">
                    {format.pct(p.successPct, 0)}
                  </text>
                );
              }}
            />
          </BarChart>
        );
      }}
    </ChartFrame>
  );
}
