'use client';

/**
 * "Confronto": the plans chosen for comparison (store compareIds), each run deterministically (runPlan, cached per
 * plan object), in a table and an overlay of net worth in today's € by age. Monte Carlo is only available for the
 * active plan (it is the expensive part), and the table says so.
 */
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { Plan } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import type { PlannerState } from '@/lib/store/state';
import { usePlanActions, usePlannerState } from '@/lib/store/hooks';
import { CATEGORICAL_COLORS, Card, Switch, cn } from '../../ui';
import { ChartFrame, LegendSwatch, isCompact, type LegendItem } from '../charts/ChartFrame';
import { TooltipBox, tooltipContent } from '../charts/ChartTooltip';
import { DataTable } from '../charts/DataTable';
import { AXIS_PROPS, CHART, ageStep, stepTicks } from '../charts/theme';
import { COMPARE_COLUMNS, colorSlots, comparePlanResult, overlayRows, type CompareOutcome, type OverlayRow } from '../model/compare';
import type { TabProps } from '../types';

const selectPlans = (s: PlannerState) => s.plans;
const selectCompareIds = (s: PlannerState) => s.compareIds;

interface Entry {
  plan: Plan;
  outcome: CompareOutcome;
  slot: number | undefined;
}

export function CompareTab({ data }: TabProps) {
  const { t, format } = useI18n();
  const plans = usePlannerState(selectPlans);
  const compareIds = usePlannerState(selectCompareIds);
  const actions = usePlanActions();
  const { plan: active, analysis, mode } = data;
  const activeMc = analysis.available && !analysis.stale ? (analysis.result?.monteCarlo ?? null) : null;

  const entries = useMemo<Entry[]>(() => {
    const slots = colorSlots(plans, compareIds);
    return compareIds
      .map((id) => plans.find((p) => p.id === id))
      .filter((p): p is Plan => p !== undefined)
      .map((plan) => ({ plan, outcome: comparePlanResult(plan), slot: slots.get(plan.id) }));
  }, [plans, compareIds]);

  const charted = useMemo(() => entries.filter((e) => e.outcome.kind === 'ok' && e.slot !== undefined), [entries]);
  const overlay = useMemo(
    () =>
      overlayRows(
        charted.map((e) => ({ plan: e.plan, result: (e.outcome as Extract<CompareOutcome, { kind: 'ok' }>).result })),
      ),
    [charted],
  );

  const Content = useMemo(
    () =>
      tooltipContent<OverlayRow>((d) => (
        <TooltipBox
          title={t('results.tooltip.age', { age: format.num(d.age) })}
          rows={charted
            .filter((e) => typeof d[e.plan.id] === 'number')
            .map((e) => ({
              key: e.plan.id,
              label: e.plan.name,
              value: format.eur(d[e.plan.id]),
              color: CATEGORICAL_COLORS[e.slot as number],
            }))}
        />
      )),
    [charted, t, format],
  );

  const toggles = (
    <Card as="section" aria-labelledby="results-compare-pick">
      <h3 id="results-compare-pick" className="text-base font-semibold text-slate-100">
        {t('results.compare.pickTitle')}
      </h3>
      <p className="mt-0.5 text-sm text-slate-400">{t('results.compare.pickHelp')}</p>
      <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2">
            <Switch
              label={plan.name}
              description={plan.id === active.id ? t('results.compare.activePlan') : undefined}
              checked={compareIds.includes(plan.id)}
              onChange={() => actions.toggleCompare(plan.id)}
            />
          </li>
        ))}
      </ul>
    </Card>
  );

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        {toggles}
        <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-center text-sm text-slate-400">
          {t('results.compare.empty')}
        </p>
      </div>
    );
  }

  const outcomeCell = (e: Entry, ok: (r: Extract<CompareOutcome, { kind: 'ok' }>['result']) => string) =>
    e.outcome.kind === 'ok' ? ok(e.outcome.result) : '—';
  const minAge = overlay[0]?.age ?? 0;
  const maxAge = overlay[overlay.length - 1]?.age ?? 0;
  const legend: LegendItem[] = charted.map((e) => ({
    key: e.plan.id,
    label: e.plan.name,
    color: CATEGORICAL_COLORS[e.slot as number],
    shape: 'line',
  }));

  return (
    <div className="space-y-4">
      {toggles}
      <Card as="section" aria-labelledby="results-compare-table" padding="sm" className="sm:p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <h3 id="results-compare-table" className="text-base font-semibold text-slate-100">
            {t('results.compare.tableTitle')}
          </h3>
          <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-xs text-slate-300">{t('results.unit.real')}</span>
        </div>
        <div className="scroll-thin overflow-x-auto rounded-xl border border-slate-800" tabIndex={0} role="region" aria-label={t('results.compare.tableTitle')}>
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead className="bg-slate-900">
              <tr>
                {COMPARE_COLUMNS.map((c, i) => (
                  <th key={c} scope="col" className={cn('px-3 py-2 font-medium text-slate-300', i === 0 ? 'text-left' : 'text-right')}>
                    {t(`results.compare.col.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.plan.id} className="border-t border-slate-800/80">
                  <th scope="row" className="px-3 py-2 text-left font-normal text-slate-100">
                    <span className="inline-flex items-center gap-2">
                      {e.slot !== undefined && e.outcome.kind === 'ok' ? (
                        <LegendSwatch item={{ color: CATEGORICAL_COLORS[e.slot], shape: 'line' }} />
                      ) : null}
                      <span className="break-words">{e.plan.name}</span>
                    </span>
                    {e.outcome.kind === 'invalid' ? (
                      <span className="block text-xs text-rose-200">{t('results.compare.invalid', { count: String(e.outcome.errorCount) })}</span>
                    ) : e.outcome.kind === 'failed' ? (
                      <span className="block text-xs text-rose-200">{t('results.compare.failed')}</span>
                    ) : null}
                  </th>
                  <td className="tabular px-3 py-2 text-right text-slate-200">
                    {outcomeCell(e, (r) => (r.summary.fiAge !== null ? format.num(r.summary.fiAge) : t('results.compare.never')))}
                  </td>
                  <td className="tabular px-3 py-2 text-right text-slate-200">{outcomeCell(e, (r) => format.num(r.summary.retirementAge))}</td>
                  <td className="tabular px-3 py-2 text-right text-slate-200">
                    {e.plan.id === active.id && e.outcome.kind === 'ok'
                      ? activeMc
                        ? format.pct(activeMc.successProbabilityPct, 0)
                        : t('results.compare.computing')
                      : t('results.compare.activeOnly')}
                  </td>
                  <td className="tabular px-3 py-2 text-right text-slate-200">{outcomeCell(e, (r) => format.eur(r.summary.netWorthAtRetirementToday))}</td>
                  <td className="tabular px-3 py-2 text-right text-slate-200">{outcomeCell(e, (r) => format.eur(r.summary.finalNetWorthToday))}</td>
                  <td className="tabular px-3 py-2 text-right text-slate-200">
                    {outcomeCell(e, (r) => (r.summary.avgSavingsRatePct !== null ? format.pct(r.summary.avgSavingsRatePct, 0) : '—'))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">{t('results.compare.mcNote')}</p>
        {entries.length > charted.length && entries.some((e) => e.outcome.kind === 'ok' && e.slot === undefined) ? (
          <p className="mt-1 text-xs text-slate-400">{t('results.compare.tooMany', { max: String(CATEGORICAL_COLORS.length) })}</p>
        ) : null}
      </Card>

      {charted.length > 0 ? (
        <ChartFrame
          title={t('results.compare.chartTitle')}
          description={t('results.compare.chartDescription')}
          unit={t('results.unit.real')}
          ariaLabel={t('results.compare.aria', {
            plans: charted.map((e) => e.plan.name).join(', '),
          })}
          legend={legend}
          height={300}
          footer={mode === 'nominal' ? <p>{t('results.compare.alwaysReal')}</p> : undefined}
          table={
            <DataTable
              caption={t('results.compare.chartTitle')}
              columns={[{ key: 'age', label: t('results.col.age') }, ...charted.map((e) => ({ key: e.plan.id, label: e.plan.name, numeric: true }))]}
              rows={overlay.map((r) => ({
                key: r.age,
                cells: Object.fromEntries([
                  ['age', format.num(r.age)],
                  ...charted.map((e) => [e.plan.id, typeof r[e.plan.id] === 'number' ? format.eur(r[e.plan.id]) : '—']),
                ]),
              }))}
            />
          }
        >
          {(width) => {
            const compact = isCompact(width);
            return (
              <LineChart data={overlay} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} title={t('results.compare.chartTitle')}>
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
                {charted.map((e) => (
                  <Line
                    key={e.plan.id}
                    dataKey={e.plan.id}
                    name={e.plan.name}
                    type="monotone"
                    stroke={CATEGORICAL_COLORS[e.slot as number]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                    activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            );
          }}
        </ChartFrame>
      ) : null}
    </div>
  );
}
