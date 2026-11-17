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

/** What the fan chart plots: accessible wealth (what success is measured on, the default) or total net worth. */
export type FanMeasure = 'accessible' | 'netWorth';

/**
 * Monte Carlo percentiles (always today's €) of accessible wealth or net worth at the start of each age. The
 * engine's rows are end-of-year values; the start point is the (certain) starting value (`startValue`: the
 * accessible wealth or the net worth at t = 0, matching `measure`).
 */
export function fanSeries(
  mc: MonteCarloResult,
  startValue: number,
  currentAge: number,
  startYear: number,
  measure: FanMeasure = 'netWorth',
): FanPoint[] {
  const out: FanPoint[] = [
    fanPoint(currentAge, startYear, { p10: startValue, p25: startValue, p50: startValue, p75: startValue, p90: startValue }),
  ];
  const rows = measure === 'accessible' ? mc.accessible : mc.netWorth;
  for (const r of rows) out.push(fanPoint(r.age + 1, startYear + (r.age + 1 - currentAge), r));
  return out;
}

/**
 * The "bridge" of the plan: from the retirement age to the first unlock of locked income (pension fund or state
 * pension), when accessible wealth alone pays the bills; null when there is none.
 */
export function bridgeRange(result: PlanResult): { from: number; to: number } | null {
  const { retirementAge, bridgeYears } = result.summary;
  return bridgeYears > 0 ? { from: retirementAge, to: retirementAge + bridgeYears } : null;
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

/**
 * Age ranges in which spending is not covered (row.shortfall > 0), merged when consecutive. A year lived at age a is
 * drawn from a to a + 1 on the start-of-age axis of the wealth chart.
 */
export function shortfallRanges(result: PlanResult): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const row of result.rows) {
    if (!(row.shortfall > 0)) continue;
    const last = out[out.length - 1];
    if (last && last.to === row.age) last.to = row.age + 1;
    else out.push({ from: row.age, to: row.age + 1 });
  }
  return out;
}

/**
 * The share of the pension fund converted to a lifetime annuity at access (ordinary benefit): from that age locked
 * wealth holds the present value of the remaining payments (row.pensionAnnuityValue), which runs down as they are
 * paid. Null when no annuity is bought.
 */
export function annuityAtAccess(plan: Plan, result: PlanResult): { age: number; pct: number } | null {
  if (!pensionFundMatters(plan) || plan.pensionFund.accessMode !== 'retirement') return null;
  const pct = 100 - plan.pensionFund.capitalSharePct;
  if (!(pct > 0)) return null;
  const age = result.summary.pensionFundAccessAge;
  return age >= plan.profile.currentAge && age <= plan.profile.lifeExpectancy ? { age, pct } : null;
}

export interface CashGap {
  /** First age with spending not covered while still working. */
  age: number;
  /** Missing amount that year, today's €. */
  amountToday: number;
  /** Label of the largest expense event of that year, when the engine names one. */
  event: string | null;
}

/**
 * The plan runs out of accessible money while still working (the engine's `shortfallWhileWorking`, or a first
 * shortfall before the displayed retirement age): every later retirement age fails in that same year, so this gap, not
 * the FI target, is what makes the plan fail. Null otherwise.
 */
export function cashGapWhileWorking(result: PlanResult): CashGap | null {
  const { summary, issues, rows } = result;
  const issue = issues.find((i) => i.code === 'shortfallWhileWorking');
  const params = issue?.params ?? {};
  const age = typeof params.age === 'number' ? params.age : summary.depletionAge;
  if (age === null || !(age < summary.retirementAge)) return null;
  const row = rowAtAge(rows, age);
  const amountToday =
    typeof params.amount === 'number' ? params.amount : row && row.priceIndex > 0 ? row.shortfall / row.priceIndex : 0;
  const event = typeof params.event === 'string' && params.event.trim() !== '' ? params.event : null;
  return { age, amountToday, event };
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

/** How the Monte Carlo success at the displayed retirement age compares with the user's target. */
export type SuccessTone = 'good' | 'near' | 'bad';

/** 'good' at or above the target, 'near' within 10 points below it, 'bad' further below. */
export function successTone(successPct: number, targetPct: number): SuccessTone {
  if (successPct >= targetPct) return 'good';
  return successPct >= targetPct - 10 ? 'near' : 'bad';
}

/**
 * The Monte Carlo result to show for the current deterministic result, or null while it belongs to another
 * retirement age (a new analysis is on its way): a stale success rate must never get the new age as its label.
 */
export function currentMonteCarlo(mc: MonteCarloResult | null, result: PlanResult): MonteCarloResult | null {
  return mc && mc.retirementAge === result.summary.retirementAge ? mc : null;
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
  const gap = cashGapWhileWorking(result);

  if (gap) {
    // Not a depletion in retirement: the money runs out while still working.
    out.push({
      id: 'cashGap',
      tone: 'warning',
      key: 'results.insight.cashGap',
      params: { age: format.num(gap.age), amount: format.eur(gap.amountToday) },
    });
  } else if (summary.depletionAge !== null) {
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
    const negative = summary.avgSavingsRatePct < 0;
    out.push({
      id: 'savingsRate',
      tone: negative ? 'warning' : 'neutral',
      key: negative ? 'results.insight.savingsNegative' : 'results.insight.savingsRate',
      params: { pct: format.pct(Math.abs(summary.avgSavingsRatePct), 0) },
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

  let belowTarget = false;
  if (mc) {
    const failPct = 100 - mc.successProbabilityPct;
    const median = medianDepletionAge(mc);
    belowTarget = mc.successProbabilityPct < plan.simulation.successTargetPct;
    if (failPct > 0 && median !== null) {
      const failures: Insight = {
        id: 'mcFailures',
        tone: belowTarget ? 'warning' : 'neutral',
        key: 'results.insight.mcFailures',
        params: { pct: format.pct(failPct, 0), age: format.num(median), retirementAge: format.num(mc.retirementAge) },
      };
      // Below the user's own target, the risk is the first thing to read (after a cash gap while working, which is
      // its cause when there is one).
      if (belowTarget) out.splice(gap ? 1 : 0, 0, failures);
      else out.push(failures);
    }
  }

  // A plan that runs out of money (or fails the target) never opens with good news: positive notes become plain
  // notes, and the reassuring "no bridge" note is dropped when the money runs out anyway.
  if (summary.depletionAge !== null || belowTarget) {
    return out
      .filter((i) => !(summary.depletionAge !== null && i.id === 'noBridge'))
      .map((i) => (i.tone === 'positive' ? { ...i, tone: 'neutral' as const } : i));
  }
  return out;
}
