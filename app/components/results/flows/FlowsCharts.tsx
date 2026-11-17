'use client';

/**
 * Per-year stacked columns (diverging around zero):
 * - working years: expenses and savings above zero, IRPEF + surcharges and INPS withheld below zero;
 * - retired years: net state pension, pension fund / TFR and withdrawals above zero, taxes below, spending as a line;
 *   the spending no source covers (the money has run out) is stacked on top in red, so the gap is visible (UX-07).
 */
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/lib/i18n';
import { SERIES_COLORS } from '../../ui';
import { ChartFrame, isCompact, type LegendItem } from '../charts/ChartFrame';
import { TooltipBox, tooltipContent, type TooltipRow } from '../charts/ChartTooltip';
import { DataTable } from '../charts/DataTable';
import { stackedColumnShape } from '../charts/shapes';
import { AXIS_PROPS, CHART, ageStep, stepTicks } from '../charts/theme';
import { retiredFlows, stackRows, workingFlows, type RetiredFlow, type StackRow, type WorkingFlow } from '../model/flows';
import { unitKey } from '../model/values';
import type { TabProps } from '../types';

interface SeriesDef {
  key: string;
  labelKey: string;
  color: string;
}

const WORKING_UP: SeriesDef[] = [
  { key: 'expenses', labelKey: 'results.flows.series.expenses', color: SERIES_COLORS.expenses },
  { key: 'savings', labelKey: 'results.flows.series.savings', color: SERIES_COLORS.savings },
];
const WORKING_DOWN: SeriesDef[] = [
  { key: 'incomeTax', labelKey: 'results.flows.series.incomeTax', color: SERIES_COLORS.taxes },
  { key: 'inps', labelKey: 'results.flows.series.inps', color: SERIES_COLORS.inps },
];
const RETIRED_UP: SeriesDef[] = [
  { key: 'statePension', labelKey: 'results.flows.series.statePension', color: SERIES_COLORS.statePension },
  { key: 'pensionFund', labelKey: 'results.flows.series.pensionFund', color: SERIES_COLORS.pensionFund },
  { key: 'withdrawals', labelKey: 'results.flows.series.withdrawals', color: SERIES_COLORS.withdrawals },
];
const RETIRED_DOWN: SeriesDef[] = [{ key: 'taxes', labelKey: 'results.flows.series.taxes', color: SERIES_COLORS.taxes }];
const SHORTFALL: SeriesDef = { key: 'shortfall', labelKey: 'results.flows.series.shortfall', color: SERIES_COLORS.shortfall };

function ageDomain(rows: readonly { age: number }[]): [number, number] {
  return [rows[0]?.age ?? 0, rows[rows.length - 1]?.age ?? 0];
}

const WORKING_SERIES = [...WORKING_UP, ...WORKING_DOWN];
const RETIRED_SERIES = [...RETIRED_UP, ...RETIRED_DOWN];
const SHAPES = Object.fromEntries(
  [...WORKING_SERIES, ...RETIRED_SERIES, SHORTFALL].map((s) => [s.key, stackedColumnShape(s.key, s.color)]),
);

export function WorkingFlowsChart({ data }: TabProps) {
  const { t, format } = useI18n();
  const { result, mode } = data;
  const flows = useMemo(() => workingFlows(result.rows, mode), [result.rows, mode]);
  const rows = useMemo(
    () => stackRows<WorkingFlow>(flows, ['expenses', 'savings'], ['incomeTax', 'inps']),
    [flows],
  );
  const byAge = useMemo(() => new Map(flows.map((f) => [f.age, f])), [flows]);
  const series = WORKING_SERIES;

  const Content = useMemo(
    () =>
      tooltipContent<StackRow>((d) => {
        const f = byAge.get(d.age);
        if (!f) return null;
        const rows: TooltipRow[] = [
          { key: 'expenses', label: t('results.flows.series.expenses'), value: format.eur(f.expenses), color: SERIES_COLORS.expenses },
          { key: 'savings', label: t('results.flows.series.savings'), value: format.eur(f.savings, { signed: f.savings < 0 }), color: SERIES_COLORS.savings },
          { key: 'incomeTax', label: t('results.flows.series.incomeTax'), value: format.eur(f.incomeTax), color: SERIES_COLORS.taxes },
          { key: 'inps', label: t('results.flows.series.inps'), value: format.eur(f.inps), color: SERIES_COLORS.inps },
        ];
        return <TooltipBox title={t('results.tooltip.ageYear', { age: format.num(d.age), year: String(d.year) })} rows={rows} />;
      }),
    [t, format, byAge],
  );

  if (flows.length === 0) return null;
  const [minAge, maxAge] = ageDomain(flows);
  const legend: LegendItem[] = series.map((s) => ({ key: s.key, label: t(s.labelKey), color: s.color, shape: 'rect' }));
  const table = (
    <DataTable
      caption={t('results.flows.working.title')}
      columns={[
        { key: 'age', label: t('results.col.age') },
        { key: 'year', label: t('results.col.year'), numeric: true },
        ...series.map((s) => ({ key: s.key, label: t(s.labelKey), numeric: true })),
      ]}
      rows={flows.map((f) => ({
        key: f.age,
        cells: {
          age: format.num(f.age),
          year: String(f.year),
          expenses: format.eur(f.expenses),
          savings: format.eur(f.savings),
          incomeTax: format.eur(f.incomeTax),
          inps: format.eur(f.inps),
        },
      }))}
    />
  );
  const first = flows[0];

  return (
    <ChartFrame
      title={t('results.flows.working.title')}
      description={t('results.flows.working.description')}
      unit={t(unitKey(mode))}
      ariaLabel={t('results.flows.working.aria', {
        from: format.num(minAge),
        to: format.num(maxAge),
        expenses: format.eur(first.expenses),
        savings: format.eur(first.savings),
        tax: format.eur(first.incomeTax),
        inps: format.eur(first.inps),
      })}
      legend={legend}
      height={280}
      table={table}
      footer={<p>{t('results.flows.working.footer')}</p>}
    >
      {(width) => {
        const compact = isCompact(width);
        return (
          <BarChart data={rows} stackOffset="sign" margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="15%" title={t('results.flows.working.title')}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              {...AXIS_PROPS}
              dataKey="age"
              type="number"
              domain={[minAge - 0.5, maxAge + 0.5]}
              ticks={stepTicks(minAge, maxAge, ageStep(maxAge - minAge, compact))}
              allowDecimals={false}
            />
            <YAxis {...AXIS_PROPS} width={compact ? 52 : 64} tickFormatter={(v: number) => format.eurCompact(v)} tickCount={compact ? 5 : 7} />
            <Tooltip content={Content} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} isAnimationActive={false} />
            <ReferenceLine y={0} stroke={CHART.axis} />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={`values.${s.key}`}
                name={t(s.labelKey)}
                stackId="flows"
                fill={s.color}
                maxBarSize={CHART.maxBarSize}
                shape={SHAPES[s.key]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        );
      }}
    </ChartFrame>
  );
}

export function RetiredFlowsChart({ data }: TabProps) {
  const { t, format } = useI18n();
  const { result, mode } = data;
  const flows = useMemo(() => retiredFlows(result.rows, mode), [result.rows, mode]);
  const hasShortfall = flows.some((f) => f.shortfall > 0);
  const up = useMemo(
    () => [...RETIRED_UP, ...(hasShortfall ? [SHORTFALL] : [])],
    [hasShortfall],
  );
  const rows = useMemo(
    () =>
      stackRows<RetiredFlow>(flows, up.map((s) => s.key as keyof RetiredFlow & string), ['taxes']).map((r, i) => ({
        ...r,
        spending: flows[i].spending,
      })),
    [flows, up],
  );
  const byAge = useMemo(() => new Map(flows.map((f) => [f.age, f])), [flows]);
  const series = [...up, ...RETIRED_DOWN];

  const Content = useMemo(
    () =>
      tooltipContent<StackRow>((d) => {
        const f = byAge.get(d.age);
        if (!f) return null;
        const rows: TooltipRow[] = [
          { key: 'spending', label: t('results.flows.series.spending'), value: format.eur(f.spending), color: CHART.ink, strong: true },
          ...RETIRED_UP.map((s) => ({ key: s.key, label: t(s.labelKey), value: format.eur(f[s.key as keyof RetiredFlow] as number), color: s.color })),
          { key: 'taxes', label: t('results.flows.series.taxes'), value: format.eur(f.taxes), color: SERIES_COLORS.taxes },
          ...(f.shortfall > 0
            ? [{ key: 'shortfall', label: t(SHORTFALL.labelKey), value: format.eur(f.shortfall), color: SHORTFALL.color, strong: true }]
            : []),
        ];
        return <TooltipBox title={t('results.tooltip.ageYear', { age: format.num(d.age), year: String(d.year) })} rows={rows} />;
      }),
    [t, format, byAge],
  );

  if (flows.length === 0) return null;
  const [minAge, maxAge] = ageDomain(flows);
  const legend: LegendItem[] = [
    ...series.map((s) => ({ key: s.key, label: t(s.labelKey), color: s.color, shape: 'rect' as const })),
    { key: 'spending', label: t('results.flows.series.spending'), color: CHART.ink, shape: 'line' },
  ];
  const table = (
    <DataTable
      caption={t('results.flows.retired.title')}
      columns={[
        { key: 'age', label: t('results.col.age') },
        { key: 'year', label: t('results.col.year'), numeric: true },
        { key: 'spending', label: t('results.flows.series.spending'), numeric: true },
        ...series.map((s) => ({ key: s.key, label: t(s.labelKey), numeric: true })),
      ]}
      rows={flows.map((f) => ({
        key: f.age,
        cells: {
          age: format.num(f.age),
          year: String(f.year),
          spending: format.eur(f.spending),
          statePension: format.eur(f.statePension),
          pensionFund: format.eur(f.pensionFund),
          withdrawals: format.eur(f.withdrawals),
          taxes: format.eur(f.taxes),
          shortfall: format.eur(f.shortfall),
        },
      }))}
    />
  );

  return (
    <ChartFrame
      title={t('results.flows.retired.title')}
      description={t('results.flows.retired.description')}
      unit={t(unitKey(mode))}
      ariaLabel={t('results.flows.retired.aria', { from: format.num(minAge), to: format.num(maxAge) })}
      legend={legend}
      height={280}
      table={table}
      footer={
        <>
          {hasShortfall ? <p className="mb-1 text-rose-200">{t('results.flows.retired.shortfallNote')}</p> : null}
          <p>{t('results.flows.retired.footer')}</p>
        </>
      }
    >
      {(width) => {
        const compact = isCompact(width);
        return (
          <ComposedChart data={rows} stackOffset="sign" margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="15%" title={t('results.flows.retired.title')}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              {...AXIS_PROPS}
              dataKey="age"
              type="number"
              domain={[minAge - 0.5, maxAge + 0.5]}
              ticks={stepTicks(minAge, maxAge, ageStep(maxAge - minAge, compact))}
              allowDecimals={false}
            />
            <YAxis {...AXIS_PROPS} width={compact ? 52 : 64} tickFormatter={(v: number) => format.eurCompact(v)} tickCount={compact ? 5 : 7} />
            <Tooltip content={Content} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} isAnimationActive={false} />
            <ReferenceLine y={0} stroke={CHART.axis} />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={`values.${s.key}`}
                name={t(s.labelKey)}
                stackId="flows"
                fill={s.color}
                maxBarSize={CHART.maxBarSize}
                shape={SHAPES[s.key]}
                isAnimationActive={false}
              />
            ))}
            <Line
              type="linear"
              dataKey="spending"
              stroke={CHART.ink}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2, fill: CHART.ink }}
            />
          </ComposedChart>
        );
      }}
    </ChartFrame>
  );
}
