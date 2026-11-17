/**
 * Headline / insights model (UX-01, UX-06, UX-07, UX-22): the risk signal of the Monte Carlo is never hidden
 * behind good news, and a Monte Carlo result for another retirement age is never shown with the new age.
 */
import { describe, expect, it } from 'vitest';
import { createDefaultPlan, runMonteCarlo, runPlan, type MonteCarloResult, type Plan } from '@/lib/engine';
import { createFormatters } from '@/lib/i18n/format';
import { MESSAGES } from '@/lib/i18n/core';
import { buildInsights, currentMonteCarlo, successTone } from '@/app/components/results/model/overview';

const plan = createDefaultPlan({ startYear: 2026, now: '2026-01-01T00:00:00.000Z' });
const result = runPlan(plan);
const mc = runMonteCarlo(plan, { runs: 200 });
const it_ = createFormatters('it');

describe('success tone', () => {
  it('is good at or above the target, near within 10 points, bad below that', () => {
    expect(successTone(90, 90)).toBe('good');
    expect(successTone(97, 90)).toBe('good');
    expect(successTone(85, 90)).toBe('near');
    expect(successTone(80, 90)).toBe('near');
    expect(successTone(61, 90)).toBe('bad');
  });
});

describe('Monte Carlo shown in the headline', () => {
  it('belongs to the displayed retirement age, otherwise it is hidden (not relabelled)', () => {
    expect(currentMonteCarlo(mc, result)).toBe(mc);
    expect(currentMonteCarlo({ ...mc, retirementAge: result.summary.retirementAge + 19 }, result)).toBeNull();
    expect(currentMonteCarlo(null, result)).toBeNull();
  });
});

describe('insights order and tone', () => {
  const belowTarget: MonteCarloResult = {
    ...mc,
    successProbabilityPct: 61,
    depletionAges: [
      { age: 62, count: 30 },
      { age: 63, count: 50 },
      { age: 66, count: 20 },
    ],
  };

  it('below the target, the failure warning comes first and nothing is labelled positive', () => {
    const insights = buildInsights(plan, result, belowTarget, it_);
    expect(insights[0]).toMatchObject({ id: 'mcFailures', tone: 'warning', params: { pct: it_.pct(39, 0) } });
    expect(insights.some((i) => i.tone === 'positive')).toBe(false);
    expect(insights.map((i) => i.id)).toContain('lasts');
  });

  it('at or above the target, the order and tones are unchanged', () => {
    const safe: MonteCarloResult = { ...belowTarget, successProbabilityPct: 95 };
    const insights = buildInsights(plan, result, safe, it_);
    expect(insights[0]).toMatchObject({ id: 'lasts', tone: 'positive' });
    expect(insights.at(-1)).toMatchObject({ id: 'mcFailures', tone: 'neutral' });
  });

  it('a plan that runs out of money shows no positive note (not even "no bridge")', () => {
    const failing: Plan = {
      ...plan,
      retirement: { mode: 'fixedAge', fixedAge: 67 },
      spending: { ...plan.spending, monthlyToday: 4500 },
    };
    const r = runPlan(failing);
    expect(r.summary.depletionAge).not.toBeNull();
    const insights = buildInsights(failing, r, null, it_);
    expect(insights[0].id).toBe('depletion');
    expect(insights.some((i) => i.tone === 'positive')).toBe(false);
    expect(insights.map((i) => i.id)).not.toContain('noBridge');
  });

  it('negative savings are phrased as spending more than you earn, with a positive percentage', () => {
    const spender: Plan = { ...plan, spending: { ...plan.spending, monthlyToday: 3500 } };
    const r = runPlan(spender);
    expect(r.summary.avgSavingsRatePct).toBeLessThan(0);
    const insight = buildInsights(spender, r, null, it_).find((i) => i.id === 'savingsRate');
    expect(insight).toMatchObject({ key: 'results.insight.savingsNegative', tone: 'warning' });
    expect(String(insight?.params.pct)).not.toContain('-');
    expect(MESSAGES.it[insight!.key]).toContain('in più');
  });
});

describe('fan chart data (UX-04)', () => {
  it('plots accessible wealth when asked (what success is measured on), net worth by default', async () => {
    const { fanSeries, bridgeRange } = await import('@/app/components/results/model/overview');
    const acc = fanSeries(mc, result.summary.accessibleTodayStart, 30, 2026, 'accessible');
    expect(acc[0].p50).toBe(result.summary.accessibleTodayStart);
    expect(acc.slice(1).map((p) => p.p10)).toEqual(mc.accessible.map((r) => r.p10));
    const nw = fanSeries(mc, result.summary.netWorthTodayStart, 30, 2026);
    expect(nw.slice(1).map((p) => p.p10)).toEqual(mc.netWorth.map((r) => r.p10));
    // Locked money keeps net worth above accessible wealth until it unlocks.
    const at = (points: typeof acc, age: number) => points.find((p) => p.age === age)?.p10 ?? NaN;
    expect(at(acc, 60)).toBeLessThan(at(nw, 60));

    const bridge = bridgeRange(result);
    expect(bridge).toEqual({ from: result.summary.retirementAge, to: result.summary.retirementAge + result.summary.bridgeYears });
    expect(bridgeRange({ ...result, summary: { ...result.summary, bridgeYears: 0 } })).toBeNull();
  });
});

describe('shortfall and annuity on the charts (UX-07, UX-14)', () => {
  const failing: Plan = { ...plan, retirement: { mode: 'fixedAge', fixedAge: 45 } };
  const r = runPlan(failing);

  it('retired flows carry the uncovered spending, and the wealth chart gets merged shortfall ranges', async () => {
    const { retiredFlows } = await import('@/app/components/results/model/flows');
    const { shortfallRanges } = await import('@/app/components/results/model/overview');
    const flows = retiredFlows(r.rows, 'nominal');
    const withGap = r.rows.filter((row) => row.status === 'retired' && row.shortfall > 0);
    expect(withGap.length).toBeGreaterThan(0);
    expect(flows.filter((f) => f.shortfall > 0).map((f) => f.age)).toEqual(withGap.map((row) => row.age));
    for (const f of flows) expect(f.shortfall).toBeGreaterThanOrEqual(0);

    const ranges = shortfallRanges(r);
    const covered = ranges.flatMap((x) => Array.from({ length: x.to - x.from }, (_, i) => x.from + i));
    expect(covered).toEqual(r.rows.filter((row) => row.shortfall > 0).map((row) => row.age));
    for (let i = 1; i < ranges.length; i++) expect(ranges[i].from).toBeGreaterThan(ranges[i - 1].to);
    expect(shortfallRanges(result)).toEqual([]);
  });

  it('explains the annuitised share of the fund at access (ordinary benefit only)', async () => {
    const { annuityAtAccess } = await import('@/app/components/results/model/overview');
    expect(annuityAtAccess(plan, result)).toEqual({ age: result.summary.pensionFundAccessAge, pct: 50 });
    const allCapital: Plan = { ...plan, pensionFund: { ...plan.pensionFund, capitalSharePct: 100 } };
    expect(annuityAtAccess(allCapital, runPlan(allCapital))).toBeNull();
    const rita: Plan = { ...plan, pensionFund: { ...plan.pensionFund, accessMode: 'rita', accessAge: 62 } };
    expect(annuityAtAccess(rita, runPlan(rita))).toBeNull();
  });
});

describe('sensitivity row labels (UX-17)', () => {
  it('say how big each variation is, with "p.p." for percentage points', async () => {
    const { variationSpan } = await import('@/app/components/results/sensitivity/SensitivityTab');
    const { translate, translatePlural, hasMessage } = await import('@/lib/i18n/core');
    const i18n = (lang: 'it' | 'en') => ({
      lang,
      locale: lang,
      t: (k: string, p?: Record<string, string | number>) => translate(lang, k, p),
      tp: (k: string, n: number, p?: Record<string, string | number>) => translatePlural(lang, k, n, p),
      has: (k: string) => hasMessage(lang, k),
      format: createFormatters(lang),
    });
    const pp = { key: 'inflation', lowDelta: '-1 pp', highDelta: '+1 pp', unit: 'pp' as const, lowValue: -1, highValue: 1, fiAgeLow: 46, fiAgeHigh: 50, fiAgeBase: 48 };
    expect(variationSpan(i18n('it'), pp)).toBe('±1 p.p.');
    expect(variationSpan(i18n('en'), pp)).toBe('±1 pp');
    const pct = { ...pp, key: 'spending', unit: 'pct' as const, lowValue: -10, highValue: 10 };
    expect(variationSpan(i18n('it'), pct).replace(/\s/g, '')).toBe('±10%');
    const years = { ...pp, key: 'lifeExpectancy', unit: 'years' as const, lowValue: -5, highValue: 3 };
    expect(variationSpan(i18n('it'), years)).toBe('-5 anni / +3 anni');
    expect(MESSAGES.it['results.sens.unit.pp']).not.toContain('punti');
  });
});
