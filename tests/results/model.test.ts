/**
 * Results UI models: they only reshape engine outputs, so the tests check consistency with the engine's own
 * summary figures and the bookkeeping identities of the rows.
 */
import { describe, expect, it } from 'vitest';
import { IT_2026, createDefaultPlan, createExamplePlans, runMonteCarlo, runPlan, type MonteCarloResult, type Plan } from '@/lib/engine';
import { createFormatters } from '@/lib/i18n/format';
import { MESSAGES } from '@/lib/i18n/core';
import {
  ageMarkers,
  buildInsights,
  fanSeries,
  lockedShareAtRetirement,
  medianDepletionAge,
  successSeries,
  wealthSeries,
} from '@/app/components/results/model/overview';
import {
  fundAndTfrIncome,
  netWithdrawals,
  retiredFlows,
  retiredTaxes,
  stackRows,
  workingFlows,
  yearSpending,
} from '@/app/components/results/model/flows';
import { YEAR_COLUMNS, buildCsv, columnGroups, columnValue } from '@/app/components/results/model/yearTable';
import { colorSlots, comparePlanResult, overlayRows } from '@/app/components/results/model/compare';
import { GROUP_SOURCE_KEYS, groupSources, safeHref, ungroupedSources } from '@/app/components/results/model/assumptions';
import { balanceValue, flowValue, rowAtAge } from '@/app/components/results/model/values';
import { ageStep, stepTicks } from '@/app/components/results/charts/theme';

const plan = createDefaultPlan({ startYear: 2026, now: '2026-01-01T00:00:00.000Z' });
const result = runPlan(plan);
let mcCache: MonteCarloResult | null = null;
const mc = () => (mcCache ??= runMonteCarlo(plan, { runs: 200 }));
const it_ = createFormatters('it');

describe('values', () => {
  it('flows use the start-of-year index, balances the end-of-year index', () => {
    const row = result.rows[10];
    expect(flowValue(row, 1000, 'real')).toBeCloseTo(1000 / row.priceIndex, 9);
    expect(balanceValue(row, 1000, 'real')).toBeCloseTo(1000 / (row.priceIndexEnd as number), 9);
    expect(flowValue(row, 1000, 'nominal')).toBe(1000);
    expect(balanceValue(row, 1000, 'nominal')).toBe(1000);
  });

  it('finds rows by age', () => {
    expect(rowAtAge(result.rows, 40)?.age).toBe(40);
    expect(rowAtAge(result.rows, 200)).toBeUndefined();
    expect(rowAtAge([], 40)).toBeUndefined();
  });
});

describe('overview model', () => {
  const points = wealthSeries(result, plan.profile.startYear, 'real');

  it('starts from the starting wealth and plots balances at the start of each age', () => {
    expect(points[0]).toMatchObject({ age: 30, year: 2026, netWorth: result.summary.netWorthTodayStart });
    expect(points[0].accessible).toBeCloseTo(result.summary.accessibleTodayStart, 6);
    expect(points).toHaveLength(result.rows.length + 1);
    expect(points[points.length - 1].age).toBe(plan.profile.lifeExpectancy + 1);
    for (const p of points) expect(p.accessible + p.locked).toBeCloseTo(p.netWorth, 6);
  });

  it('matches the engine summary at retirement and at the end (today’s €)', () => {
    const atRetirement = points.find((p) => p.age === result.summary.retirementAge);
    expect(atRetirement?.netWorth).toBeCloseTo(result.summary.netWorthAtRetirementToday, 4);
    expect(atRetirement?.accessible).toBeCloseTo(result.summary.accessibleAtRetirementToday, 4);
    expect(points[points.length - 1].netWorth).toBeCloseTo(result.summary.finalNetWorthToday, 4);
  });

  it('nominal values grow with inflation', () => {
    const nominal = wealthSeries(result, plan.profile.startYear, 'nominal');
    const last = result.rows[result.rows.length - 1];
    expect(nominal[nominal.length - 1].netWorth).toBeCloseTo(last.netWorth, 6);
    expect(nominal[nominal.length - 1].netWorth).toBeGreaterThan(points[points.length - 1].netWorth);
  });

  it('merges markers on the same age and drops the state pension when there is none', () => {
    const markers = ageMarkers(plan, result);
    expect(markers[0]).toEqual({ age: result.summary.retirementAge, kinds: ['retirement'] });
    expect(markers.find((m) => m.age === 67)?.kinds).toEqual(['pensionFund', 'statePension']);
    const noPension = { ...result, issues: [...result.issues, { level: 'warning' as const, path: 'x', code: 'noStatePension' }] };
    expect(ageMarkers(plan, noPension).flatMap((m) => m.kinds)).not.toContain('statePension');
    const noFund: Plan = { ...plan, pensionFund: { ...plan.pensionFund, enabled: false }, assets: { ...plan.assets, pensionFund: { ...plan.assets.pensionFund, balance: 0 } } };
    expect(ageMarkers(noFund, result).flatMap((m) => m.kinds)).not.toContain('pensionFund');
  });

  it('locked share at retirement comes from the last working year', () => {
    const share = lockedShareAtRetirement(result);
    const row = rowAtAge(result.rows, result.summary.retirementAge - 1);
    expect(share && row).toBeTruthy();
    expect(share?.lockedPct).toBeCloseTo(((row?.lockedNet ?? 0) / (row?.netWorth ?? 1)) * 100, 9);
    expect(share?.netWorth).toBeCloseTo(result.summary.netWorthAtRetirementToday, 4);
  });

  it('fan and success series reshape the Monte Carlo output', () => {
    const m = mc();
    const fan = fanSeries(m, result.summary.netWorthTodayStart, 30, 2026);
    expect(fan[0]).toMatchObject({ age: 30, p10: result.summary.netWorthTodayStart, p90: result.summary.netWorthTodayStart });
    expect(fan.map((f) => f.age)).toEqual([30, ...m.netWorth.map((r) => r.age + 1)]);
    for (const f of fan) {
      expect(f.outer).toEqual([f.p10, f.p90]);
      expect(f.inner).toEqual([f.p25, f.p75]);
      expect(f.p10).toBeLessThanOrEqual(f.p50 + 1e-6);
      expect(f.p50).toBeLessThanOrEqual(f.p90 + 1e-6);
    }
    const success = successSeries(m, 90);
    expect(success.map((s) => s.age)).toEqual(m.successByRetirementAge.map((s) => s.age));
    expect(success.filter((s) => s.displayed).map((s) => s.age)).toEqual([m.retirementAge]);
    if (m.confidentFiAge !== null) expect(success.find((s) => s.meetsTarget)?.age).toBe(m.confidentFiAge);
  });

  it('median depletion age of the histogram', () => {
    const base = { ...mc() };
    expect(medianDepletionAge({ ...base, depletionAges: [] })).toBeNull();
    expect(medianDepletionAge({ ...base, depletionAges: [{ age: 60, count: 1 }, { age: 70, count: 5 }, { age: 80, count: 1 }] })).toBe(70);
    expect(medianDepletionAge({ ...base, depletionAges: [{ age: 60, count: 3 }, { age: 70, count: 3 }] })).toBe(60);
  });

  it('insights use existing messages with every placeholder filled', () => {
    for (const lang of ['it', 'en'] as const) {
      const insights = buildInsights(plan, result, mc(), createFormatters(lang));
      expect(insights.map((i) => i.id)).toEqual(expect.arrayContaining(['lasts', 'bridge', 'locked', 'savingsRate', 'statePension']));
      for (const insight of insights) {
        const template = MESSAGES[lang][insight.key];
        expect(template, insight.key).toBeTruthy();
        for (const [, name] of template.matchAll(/\{(\w+)\}/g)) expect(insight.params, `${insight.key}.${name}`).toHaveProperty(name);
      }
    }
  });

  it('a failing plan reports its depletion age', () => {
    const fixed: Plan = { ...plan, retirement: { mode: 'fixedAge', fixedAge: 35 } };
    const failing = runPlan(fixed);
    expect(failing.summary.depletionAge).not.toBeNull();
    const insights = buildInsights(fixed, failing, null, it_);
    expect(insights[0]).toMatchObject({ id: 'depletion', tone: 'warning' });
  });
});

describe('flows model', () => {
  it('working years: spending + savings = net income + other inflows of the year', () => {
    const flows = workingFlows(result.rows, 'nominal');
    const working = result.rows.filter((r) => r.status === 'working');
    expect(flows).toHaveLength(working.length);
    flows.forEach((f, i) => {
      const r = working[i];
      const inflows = (r.payroll?.netIncome ?? 0) + (r.welfareBenefit ?? 0) + r.cashInterestNet + r.eventsInflow;
      expect(f.expenses + f.savings).toBeCloseTo(inflows, 6);
      expect(f.inps).toBe(r.payroll?.inps);
    });
  });

  it('retired years: net sources cover the spending (plus what is reinvested)', () => {
    for (const r of result.rows.filter((row) => row.status === 'retired')) {
      const sources = r.statePensionNet + fundAndTfrIncome(r) + netWithdrawals(r) + r.cashInterestNet + r.eventsInflow;
      const reinvested = Math.max(0, r.netSavings);
      expect(sources + r.shortfall).toBeCloseTo(yearSpending(r) + reinvested, 4);
      expect(retiredTaxes(r)).toBeGreaterThanOrEqual(0);
    }
    const flows = retiredFlows(result.rows, 'real');
    expect(flows[0].age).toBe(result.summary.retirementAge);
  });

  it('stack rows sign the down series and mark the rounded ends', () => {
    const rows = stackRows(
      [
        { age: 30, year: 2026, a: 10, b: 5, c: 3, d: 2 },
        { age: 31, year: 2027, a: 10, b: -4, c: 3, d: 0 },
        { age: 32, year: 2028, a: 0, b: 0, c: 0, d: 0 },
      ],
      ['a', 'b'],
      ['c', 'd'],
    );
    expect(rows[0]).toMatchObject({ values: { a: 10, b: 5, c: -3, d: -2 }, topKey: 'b', bottomKey: 'd' });
    expect(rows[1]).toMatchObject({ topKey: 'a', bottomKey: 'c' });
    expect(rows[1].values.d).toBeCloseTo(0);
    expect(rows[2]).toMatchObject({ topKey: null, bottomKey: null });
  });
});

describe('year table and CSV', () => {
  it('groups are contiguous and cover every column', () => {
    const groups = columnGroups();
    expect(groups.reduce((s, g) => s + g.span, 0)).toBe(YEAR_COLUMNS.length);
    expect(new Set(groups.map((g) => g.group)).size).toBe(groups.length);
  });

  it('net worth column equals the row', () => {
    const col = YEAR_COLUMNS.find((c) => c.id === 'netWorth');
    const row = result.rows[5];
    expect(col && columnValue(col, row, 'nominal')).toBe(row.netWorth);
  });

  const headers = ['Età', 'Anno', 'Stato', ...YEAR_COLUMNS.map((c) => c.id)];
  it('Italian CSV: semicolons, decimal comma, BOM, one line per year', () => {
    const csv = buildCsv(result.rows, 'real', { separator: ';', decimal: ',', headers, statusLabel: (s) => s });
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines).toHaveLength(result.rows.length + 1);
    expect(lines[0].split(';')).toHaveLength(headers.length);
    const first = lines[1].split(';');
    expect(first.slice(0, 3)).toEqual(['30', '2026', 'working']);
    expect(first[3]).toBe('37500,00');
    expect(lines.every((l) => l.split(';').length === headers.length)).toBe(true);
  });

  it('English CSV uses commas and quotes cells that contain them', () => {
    const csv = buildCsv(result.rows.slice(0, 2), 'nominal', {
      separator: ',',
      decimal: '.',
      headers: ['Age, years', ...headers.slice(1)],
      statusLabel: () => 'a "b"',
    });
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0].startsWith('"Age, years",')).toBe(true);
    expect(lines[1]).toContain('"a ""b"""');
    expect(lines[1]).toContain('37500.00');
  });
});

describe('compare model', () => {
  const plans = createExamplePlans({ startYear: 2026, now: '2026-01-01T00:00:00.000Z' });

  it('a plan keeps its colour when another plan is excluded', () => {
    const all = colorSlots(plans, plans.map((p) => p.id));
    const some = colorSlots(plans, [plans[0].id, plans[2].id]);
    expect(some.get(plans[2].id)).toBe(all.get(plans[2].id));
    expect(some.get(plans[0].id)).toBe(all.get(plans[0].id));
  });

  it('never assigns more than eight slots and never repeats one', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ ...plans[0], id: `p${i}` }));
    const slots = colorSlots(many, many.map((p) => p.id));
    expect(slots.size).toBe(8);
    expect(new Set(slots.values()).size).toBe(8);
  });

  it('caches results per plan object and reports invalid plans', () => {
    expect(comparePlanResult(plans[0])).toBe(comparePlanResult(plans[0]));
    const invalid = { ...plans[1], profile: { ...plans[1].profile, currentAge: -5 } };
    const outcome = comparePlanResult(invalid);
    expect(outcome.kind).toBe('invalid');
    if (outcome.kind === 'invalid') expect(outcome.errorCount).toBeGreaterThan(0);
  });

  it('overlay rows hold each plan’s net worth by age', () => {
    const entries = plans.map((plan) => {
      const outcome = comparePlanResult(plan);
      if (outcome.kind !== 'ok') throw new Error('example plan should run');
      return { plan, result: outcome.result };
    });
    const rows = overlayRows(entries);
    expect(rows[0].age).toBe(30);
    const final = rows[rows.length - 1];
    entries.forEach((e) => expect(final[e.plan.id]).toBeCloseTo(e.result.summary.finalNetWorthToday, 4));
  });
});

describe('assumptions model', () => {
  it('every default source belongs to a group and every group key exists', () => {
    const keys = new Set(IT_2026.sources.map((s) => s.key));
    for (const list of Object.values(GROUP_SOURCE_KEYS)) for (const key of list) expect(keys.has(key), key).toBe(true);
    expect(ungroupedSources(IT_2026)).toEqual([]);
    expect(groupSources(IT_2026, 'pensionFund').map((s) => s.key)).toEqual(['fpCap', 'fpYield', 'fpExit', 'fpAccess']);
  });

  it('keeps user-added sources visible and only links http(s)', () => {
    const rules = { ...IT_2026, sources: [...IT_2026.sources, { key: 'mine', label: 'Mia fonte', url: 'javascript:alert(1)' }] };
    expect(ungroupedSources(rules).map((s) => s.key)).toEqual(['mine']);
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('https://example.org/a')).toBe('https://example.org/a');
    expect(safeHref(42)).toBeNull();
  });
});

describe('axis ticks', () => {
  it('multiples of the step, bounds only when far from them', () => {
    expect(stepTicks(30, 96, 10)).toEqual([30, 40, 50, 60, 70, 80, 90]);
    expect(stepTicks(30, 96, 5)).toEqual([30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]);
    expect(stepTicks(48, 95, 10)).toEqual([50, 60, 70, 80, 90]);
    expect(stepTicks(42, 49, 5)).toEqual([45, 49]);
    expect(stepTicks(41, 49, 5)).toEqual([41, 45, 49]);
    expect(stepTicks(5, 1, 1)).toEqual([]);
    expect(ageStep(66, true)).toBe(10);
    expect(ageStep(18, false)).toBe(2);
  });
});
