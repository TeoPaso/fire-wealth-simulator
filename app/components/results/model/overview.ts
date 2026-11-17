/**
 * Data for the "Panoramica" tab, derived ONLY from engine outputs (runPlan, runMonteCarlo): no finance here, just
 * selection, unit conversion and re-shaping for the charts.
 *
 * Wealth is plotted at the START of each age: the end-of-year balance of the year lived at age a is the wealth at
 * age a + 1, and the first point (currentAge) is the starting wealth. So the value at the retirement age is the
 * wealth you stop working with (= summary.netWorthAtRetirementToday in today's €).
 */
import type { Issue, MonteCarloResult, Plan, PlanResult, PercentileRow } from '@/lib/engine';
import type { Formatters } from '@/lib/i18n/format';
import type { MessageParams } from '@/lib/i18n/core';
import { balanceValue, rowAtAge, type ValueMode } from './values';

export interface WealthPoint {
  age: number;
  /** Calendar year at the start of that age. */
  year: number;
  accessible: number;
  locked: number;
  netWorth: number;
}

/** Accessible / locked / total net worth at the start of each age, in the chosen unit. */
export function wealthSeries(result: PlanResult, startYear: number, mode: ValueMode): WealthPoint[] {
  const { rows, summary } = result;
  const first = rows[0];
  if (!first) return [];
  const points: WealthPoint[] = [
    {
      age: first.age,
      year: startYear,
      accessible: summary.accessibleTodayStart,
      locked: summary.netWorthTodayStart - summary.accessibleTodayStart,
      netWorth: summary.netWorthTodayStart,
    },
  ];
  for (const row of rows) {
    points.push({
      age: row.age + 1,
      year: row.calendarYear + 1,
      accessible: balanceValue(row, row.accessibleNet, mode),
      locked: balanceValue(row, row.lockedNet, mode),
      netWorth: balanceValue(row, row.netWorth, mode),
    });
  }
  return points;
}

export interface FanPoint {
  age: number;
  year: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  /** [p10, p90] and [p25, p75] ranges for Recharts range areas. */
  outer: [number, number];
  inner: [number, number];
}

function fanPoint(age: number, year: number, p: Omit<PercentileRow, 'age'>): FanPoint {
  const { p10, p25, p50, p75, p90 } = p;
  return { age, year, p10, p25, p50, p75, p90, outer: [p10, p90], inner: [p25, p75] };
}

/**
 * Monte Carlo net-worth percentiles (always today's €) at the start of each age. The engine's rows are end-of-year
 * values; the start point is the (certain) starting net worth.
 */
export function fanSeries(mc: MonteCarloResult, startNetWorth: number, currentAge: number, startYear: number): FanPoint[] {
  const out: FanPoint[] = [
    fanPoint(currentAge, startYear, { p10: startNetWorth, p25: startNetWorth, p50: startNetWorth, p75: startNetWorth, p90: startNetWorth }),
  ];
  for (const r of mc.netWorth) out.push(fanPoint(r.age + 1, startYear + (r.age + 1 - currentAge), r));
  return out;
}

export interface SuccessPoint {
  age: number;
  successPct: number;
  meetsTarget: boolean;
  /** The retirement age of the displayed plan. */
  displayed: boolean;
}

export function successSeries(mc: MonteCarloResult, targetPct: number): SuccessPoint[] {
  return mc.successByRetirementAge.map((s) => ({
    age: s.age,
    successPct: s.successPct,
    meetsTarget: s.successPct >= targetPct,
    displayed: s.age === mc.retirementAge,
  }));
}

export type MarkerKind = 'retirement' | 'pensionFund' | 'statePension';

export interface AgeMarker {
  age: number;
  kinds: MarkerKind[];
}

/** Whether the pension fund holds or will receive money (mirrors the engine's own test). */
export function pensionFundMatters(plan: Plan): boolean {
  return plan.pensionFund.enabled || plan.assets.pensionFund.balance > 0;
}

function hasIssue(issues: readonly Issue[], code: string): boolean {
  return issues.some((i) => i.code === code);
}

/**
 * Vertical reference lines of the wealth chart: retirement, pension-fund access and state-pension claim, merged
 * when they fall on the same age and dropped when they are outside the horizon or do not exist.
 */
export function ageMarkers(plan: Plan, result: PlanResult): AgeMarker[] {
  const { summary, issues } = result;
  const lastAge = plan.profile.lifeExpectancy + 1;
  const firstAge = plan.profile.currentAge;
  const list: { age: number; kind: MarkerKind }[] = [{ age: summary.retirementAge, kind: 'retirement' }];
  if (pensionFundMatters(plan)) list.push({ age: summary.pensionFundAccessAge, kind: 'pensionFund' });
  if (!hasIssue(issues, 'noStatePension')) list.push({ age: summary.statePensionClaimAge, kind: 'statePension' });
  const byAge = new Map<number, MarkerKind[]>();
  for (const m of list) {
    if (m.age < firstAge || m.age > lastAge) continue;
    byAge.set(m.age, [...(byAge.get(m.age) ?? []), m.kind]);
  }
  return [...byAge.entries()].sort((a, b) => a[0] - b[0]).map(([age, kinds]) => ({ age, kinds }));
}

/** Share of the net worth that is locked when work stops (end of the last working year), %; null if not defined. */
export function lockedShareAtRetirement(result: PlanResult): { lockedPct: number; locked: number; netWorth: number } | null {
  const row = rowAtAge(result.rows, result.summary.retirementAge - 1);
  if (!row || !(row.netWorth > 0)) return null;
  const locked = balanceValue(row, row.lockedNet, 'real');
  const netWorth = balanceValue(row, row.netWorth, 'real');
  return { lockedPct: (row.lockedNet / row.netWorth) * 100, locked, netWorth };
}

/** Median age of depletion among failed Monte Carlo runs (from the engine's histogram), or null. */
export function medianDepletionAge(mc: MonteCarloResult): number | null {
  const total = mc.depletionAges.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  let seen = 0;
  for (const d of mc.depletionAges) {
    seen += d.count;
    if (seen >= total / 2) return d.age;
  }
  return mc.depletionAges[mc.depletionAges.length - 1].age;
}

export type InsightTone = 'positive' | 'neutral' | 'warning';

export interface Insight {
  id: string;
  tone: InsightTone;
  /** i18n key (results.insight.*). */
  key: string;
  params: MessageParams;
}

/**
 * Plain-language observations built from the summary (and Monte Carlo when available). Money in today's €.
 * Engine issues (warnings / infos) are listed separately by the UI.
 */
export function buildInsights(plan: Plan, result: PlanResult, mc: MonteCarloResult | null, format: Formatters): Insight[] {
  const { summary, issues } = result;
  const out: Insight[] = [];
  const R = summary.retirementAge;

  if (summary.depletionAge !== null) {
    out.push({ id: 'depletion', tone: 'warning', key: 'results.insight.depletion', params: { age: format.num(summary.depletionAge) } });
  } else {
    out.push({
      id: 'lasts',
      tone: 'positive',
      key: 'results.insight.lasts',
      params: { age: format.num(plan.profile.lifeExpectancy), amount: format.eur(summary.finalNetWorthToday) },
    });
  }

  if (R > plan.profile.currentAge || summary.bridgeYears > 0) {
    if (summary.bridgeYears > 0) {
      out.push({
        id: 'bridge',
        tone: summary.bridgeYears >= 15 ? 'warning' : 'neutral',
        key: 'results.insight.bridge',
        params: { from: format.num(R), to: format.num(R + summary.bridgeYears), years: format.years(summary.bridgeYears) },
      });
    } else {
      out.push({ id: 'noBridge', tone: 'positive', key: 'results.insight.noBridge', params: {} });
    }
  }

  const locked = lockedShareAtRetirement(result);
  if (locked && R > plan.profile.currentAge) {
    out.push({
      id: 'locked',
      tone: locked.lockedPct >= 50 ? 'warning' : 'neutral',
      key: 'results.insight.locked',
      params: { pct: format.pct(locked.lockedPct, 0), locked: format.eur(locked.locked), total: format.eur(locked.netWorth) },
    });
  }

  if (summary.avgSavingsRatePct !== null) {
    out.push({
      id: 'savingsRate',
      tone: 'neutral',
      key: 'results.insight.savingsRate',
      params: { pct: format.pct(summary.avgSavingsRatePct, 0) },
    });
  }

  if (!hasIssue(issues, 'noStatePension') && summary.statePensionAnnualNetToday > 0) {
    out.push({
      id: 'statePension',
      tone: 'neutral',
      key: 'results.insight.statePension',
      params: { amount: format.eur(summary.statePensionAnnualNetToday), age: format.num(summary.statePensionClaimAge) },
    });
  }

  if (mc) {
    const failPct = 100 - mc.successProbabilityPct;
    const median = medianDepletionAge(mc);
    if (failPct > 0 && median !== null) {
      out.push({
        id: 'mcFailures',
        tone: failPct > 100 - plan.simulation.successTargetPct ? 'warning' : 'neutral',
        key: 'results.insight.mcFailures',
        params: { pct: format.pct(failPct, 0), age: format.num(median), retirementAge: format.num(mc.retirementAge) },
      });
    }
  }
  return out;
}
