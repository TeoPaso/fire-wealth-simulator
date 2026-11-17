'use client';

/**
 * "Sensibilità": tornado chart of the deterministic FI age when one assumption at a time moves down or up
 * (runSensitivity, computed in the analysis worker), sorted by impact, relative to the base FI age.
 */
import { useCallback, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import type { SensitivityItem } from '@/lib/engine';
import { useI18n, type I18nValue } from '@/lib/i18n';
import { CATEGORICAL_COLORS, Card } from '../../ui';
import { ChartFrame, isCompact, type LegendItem } from '../charts/ChartFrame';
import { TooltipBox, tooltipContent } from '../charts/ChartTooltip';
import { DataTable } from '../charts/DataTable';
import { horizontalBarShape } from '../charts/shapes';
import { AXIS_PROPS, CHART } from '../charts/theme';
import { AnalysisPlaceholder } from '../overview/AnalysisPlaceholder';
import type { TabProps } from '../types';

const LOW = CATEGORICAL_COLORS[0];
const HIGH = CATEGORICAL_COLORS[1];
const LOW_SHAPE = horizontalBarShape(LOW);
const HIGH_SHAPE = horizontalBarShape(HIGH);

interface TornadoRow {
  key: string;
  label: string;
  short: string;
  lowLabel: string;
  highLabel: string;
  fiAgeLow: number | null;
  fiAgeHigh: number | null;
  /** FI age change in years (unreachable = up to the end of the horizon). */
  low: number;
  high: number;
}

function variationLabel(i18n: I18nValue, item: SensitivityItem, which: 'low' | 'high'): string {
  const value = which === 'low' ? item.lowValue : item.highValue;
  if (value === undefined || item.unit === undefined) return which === 'low' ? item.lowDelta : item.highDelta;
  const signed = i18n.format.num(value, { signed: true, decimals: 1 });
  if (item.unit === 'pct') return i18n.format.pct(value, 0, { signed: true });
  return i18n.t(`results.sens.unit.${item.unit}`, { value: signed });
}

function itemText(i18n: I18nValue, key: string, kind: 'item' | 'short'): string {
  const k = `results.sens.${kind}.${key}`;
  return i18n.has(k) ? i18n.t(k) : i18n.t('results.sens.unknownItem', { key });
}

/** Size of the variation for the row label: "±1 p.p.", "±10%", or "−5 / +3 anni" when not symmetric (UX-17). */
export function variationSpan(i18n: I18nValue, item: SensitivityItem): string {
  const { lowValue, highValue, unit } = item;
  if (lowValue === undefined || highValue === undefined || unit === undefined) return `${item.lowDelta} / ${item.highDelta}`;
  if (Math.abs(lowValue + highValue) > 1e-9) return `${variationLabel(i18n, item, 'low')} / ${variationLabel(i18n, item, 'high')}`;
  const size = Math.abs(highValue);
  if (unit === 'pct') return `±${i18n.format.pct(size, 0)}`;
  return `±${i18n.t(`results.sens.unit.${unit}`, { value: i18n.format.num(size, { decimals: 1 }) })}`;
}

/** Row label with the size of the variation, e.g. "Inflazione (±1 p.p.)". */
function rowText(i18n: I18nValue, item: SensitivityItem, kind: 'item' | 'short'): string {
  return i18n.t('results.sens.rowLabel', { name: itemText(i18n, item.key, kind), span: variationSpan(i18n, item) });
}

export function SensitivityTab({ data }: TabProps) {
  const i18n = useI18n();
  const { t, format } = i18n;
  const { plan, result, analysis } = data;
  const items = analysis.available ? (analysis.result?.sensitivity ?? null) : null;
  const base = items?.[0]?.fiAgeBase ?? result.summary.fiAge;
  const never = plan.profile.lifeExpectancy + 1;

  const rows = useMemo<TornadoRow[]>(() => {
    if (!items || base === null) return [];
    const delta = (age: number | null) => (age ?? never) - base;
    return items.map((item) => ({
      key: item.key,
      label: rowText(i18n, item, 'item'),
      short: rowText(i18n, item, 'short'),
      lowLabel: variationLabel(i18n, item, 'low'),
      highLabel: variationLabel(i18n, item, 'high'),
      fiAgeLow: item.fiAgeLow,
      fiAgeHigh: item.fiAgeHigh,
      low: delta(item.fiAgeLow),
      high: delta(item.fiAgeHigh),
    }));
  }, [items, base, never, i18n]);

  const ageWithDelta = useCallback(
    (age: number | null) => {
      if (age === null) return t('results.sens.never');
      if (base === null) return t('results.ageValue', { age: format.num(age) });
      const d = age - base;
      return d === 0
        ? t('results.sens.same', { age: format.num(age) })
        : t('results.sens.ageDelta', { age: format.num(age), delta: format.num(d, { signed: true }) });
    },
    [t, format, base],
  );

  const Content = useMemo(
    () =>
      tooltipContent<TornadoRow>((d) => (
        <TooltipBox
          title={d.label}
          rows={[
            { key: 'low', label: d.lowLabel, value: ageWithDelta(d.fiAgeLow), color: LOW },
            { key: 'high', label: d.highLabel, value: ageWithDelta(d.fiAgeHigh), color: HIGH },
          ]}
        />
      )),
    [ageWithDelta],
  );

  if (!items) {
    return <AnalysisPlaceholder analysis={analysis} title={t('results.sens.title')} height={320} />;
  }

  const table = (
    <DataTable
      caption={t('results.sens.title')}
      columns={[
        { key: 'item', label: t('results.sens.colItem') },
        { key: 'low', label: t('results.sens.colLow') },
        { key: 'lowAge', label: t('results.sens.colFiAge'), numeric: true },
        { key: 'high', label: t('results.sens.colHigh') },
        { key: 'highAge', label: t('results.sens.colFiAge'), numeric: true },
      ]}
      rows={items.map((item) => ({
        key: item.key,
        cells: {
          item: rowText(i18n, item, 'item'),
          low: variationLabel(i18n, item, 'low'),
          lowAge: ageWithDelta(item.fiAgeLow),
          high: variationLabel(i18n, item, 'high'),
          highAge: ageWithDelta(item.fiAgeHigh),
        },
      }))}
    />
  );

  if (base === null) {
    return (
      <Card as="section" aria-labelledby="results-sens">
        <h3 id="results-sens" className="text-base font-semibold text-slate-100">
          {t('results.sens.title')}
        </h3>
        <p className="mb-3 mt-1 text-sm text-slate-400">{t('results.sens.noBase', { age: format.num(plan.profile.lifeExpectancy) })}</p>
        {table}
      </Card>
    );
  }

  const extent = Math.max(1, ...rows.map((r) => Math.max(Math.abs(r.low), Math.abs(r.high))));
  const legend: LegendItem[] = [
    { key: 'low', label: t('results.sens.legendLow'), color: LOW, shape: 'rect' },
    { key: 'high', label: t('results.sens.legendHigh'), color: HIGH, shape: 'rect' },
  ];
  const top = rows[0];

  return (
    <div className="space-y-4">
      <ChartFrame
        title={t('results.sens.title')}
        description={t('results.sens.description', { age: format.num(base) })}
        unit={t('results.unit.years')}
        ariaLabel={t('results.sens.aria', {
          age: format.num(base),
          item: top?.label ?? '',
          low: top ? ageWithDelta(top.fiAgeLow) : '',
          high: top ? ageWithDelta(top.fiAgeHigh) : '',
        })}
        legend={legend}
        height={Math.max(240, rows.length * 44 + 40)}
        stale={analysis.stale}
        table={table}
        footer={
          <>
            <p>{t('results.sens.footer')}</p>
            {items.some((i) => i.key === 'inflation') ? <p className="mt-1">{t('results.sens.inflationNote')}</p> : null}
          </>
        }
      >
        {(width) => {
          const compact = isCompact(width);
          return (
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barGap={2} title={t('results.sens.title')}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis
                {...AXIS_PROPS}
                type="number"
                domain={[-extent, extent]}
                allowDecimals={false}
                tickFormatter={(v: number) => format.num(v, { signed: true })}
              />
              <YAxis
                {...AXIS_PROPS}
                type="category"
                dataKey={compact ? 'short' : 'label'}
                width={compact ? 112 : 200}
                interval={0}
              />
              <Tooltip content={Content} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} isAnimationActive={false} />
              <ReferenceLine x={0} stroke={CHART.ink} strokeOpacity={0.6} />
              <Bar dataKey="low" fill={LOW} barSize={12} shape={LOW_SHAPE} isAnimationActive={false} />
              <Bar
                dataKey="high"
                fill={HIGH}
                barSize={12}
                shape={HIGH_SHAPE}
                isAnimationActive={false}
                label={(props: { x?: number | string; y?: number | string; height?: number | string; index?: number }) => {
                  // Rows where neither variation moves the FI age get a direct label instead of invisible bars.
                  const row = rows[props.index ?? -1];
                  if (!row || row.low !== 0 || row.high !== 0) return <g />;
                  return (
                    <text x={Number(props.x) + 6} y={Number(props.y) + Number(props.height) / 2 - 7} fill={CHART.tick} fontSize={11} dominantBaseline="middle">
                      {t('results.sens.noEffect')}
                    </text>
                  );
                }}
              />
            </BarChart>
          );
        }}
      </ChartFrame>
    </div>
  );
}
