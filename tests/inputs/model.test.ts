/**
 * Pure helpers of the inputs panel: career phases (order, reorder, new phase, net-pay preview through the engine)
 * and portfolio templates / holdings layout. Nothing here sorts, clamps or drops user data.
 */
import { describe, expect, it } from 'vitest';
import { IT_2026, computePayroll, createDefaultPlan, type Plan } from '@/lib/engine';
import {
  NEW_PHASE_YEARS,
  careerTimeline,
  movePhaseDown,
  newPhase,
  phasePayPreview,
  phasePayrollInputs,
  phaseStartAge,
} from '@/app/components/inputs/model/career';
import {
  ASSET_TEMPLATES,
  allocationSum,
  assetFromTemplate,
  layoutHoldings,
  takenIds,
  templateTaxRatePct,
} from '@/app/components/inputs/model/portfolio';

function plan(): Plan {
  return createDefaultPlan({ startYear: 2026, now: '2026-01-01T00:00:00.000Z' });
}

describe('career phases', () => {
  it('starts each phase where the previous one ends', () => {
    const p = plan();
    expect(phaseStartAge(p, 0)).toBe(30);
    expect(phaseStartAge(p, 1)).toBe(35);
    expect(phaseStartAge(p, 2)).toBe(45);
  });

  it('builds the timeline, or null when ages are not increasing', () => {
    const p = plan();
    expect(careerTimeline(p)?.map((s) => [s.fromAge, s.toAge])).toEqual([
      [30, 35],
      [35, 45],
      [45, 67],
    ]);
    p.career[1].untilAge = 33;
    expect(careerTimeline(p)).toBeNull();
  });

  it('moving a phase keeps every duration and the outer boundaries', () => {
    const p = plan();
    const moved = movePhaseDown(p.career, 0, p.profile.currentAge);
    expect(moved.map((c) => c.label)).toEqual(['Senior', 'Junior', 'Manager']);
    expect(moved.map((c) => c.untilAge)).toEqual([40, 45, 67]);
    expect(p.career[0].label).toBe('Junior'); // input untouched
  });

  it('moving phases with invalid ages swaps them as they are (validation reports the order)', () => {
    const p = plan();
    p.career[1].untilAge = 33;
    const moved = movePhaseDown(p.career, 0, p.profile.currentAge);
    expect(moved.map((c) => [c.label, c.untilAge])).toEqual([
      ['Senior', 33],
      ['Junior', 35],
      ['Manager', 67],
    ]);
  });

  it('a new phase copies the last one and follows it', () => {
    const p = plan();
    const phase = newPhase(p, 'phase-x');
    expect(phase).toMatchObject({ id: 'phase-x', label: '', untilAge: 67 + NEW_PHASE_YEARS, ralToday: 55000 });
    const empty = { ...p, career: [] };
    expect(newPhase(empty, 'phase-y').untilAge).toBe(IT_2026.statePension.oldAgeAge);
  });
});

describe('net pay preview', () => {
  it('is the engine payroll at the start of the phase, with inflation applied', () => {
    const p = plan();
    const prepared = phasePayrollInputs(p, 1);
    expect(prepared).not.toBeNull();
    const priceIndex = Math.pow(1 + p.market.inflationPct / 100, 5);
    expect(prepared!.input.priceIndex).toBeCloseTo(priceIndex, 12);
    expect(prepared!.input.ral).toBeCloseTo(45000 * priceIndex, 6);
    expect(prepared!.calendarYear).toBe(2031);
    // employee 1.5% and employer 2% only with the fund enabled
    expect(prepared!.input.employeePensionContribution).toBeCloseTo(0.015 * 45000 * priceIndex, 6);
    expect(prepared!.input.employerPensionContribution).toBeCloseTo(0.02 * 45000 * priceIndex, 6);
    const preview = phasePayPreview(p, 1)!;
    expect(preview.salary).toEqual(computePayroll(prepared!.salaryOnly, p.taxRules));
    expect(preview.withBonus.netIncome).toBeGreaterThan(preview.salary.netIncome);
  });

  it('sends nothing to the fund when it is disabled', () => {
    const p = plan();
    p.pensionFund.enabled = false;
    const prepared = phasePayrollInputs(p, 0)!;
    expect(prepared.input.employeePensionContribution).toBe(0);
    expect(prepared.input.employerPensionContribution).toBe(0);
  });

  it('fills the deductible cap with the employer share counted in', () => {
    const p = plan();
    p.savingsPolicy.voluntaryPension = 'fillCap';
    const prepared = phasePayrollInputs(p, 0)!;
    const total = prepared.input.employeePensionContribution + prepared.input.employerPensionContribution;
    expect(total).toBeCloseTo(p.taxRules.pensionFund.deductionCap, 6);
  });

  it('is unavailable (null) instead of guessing when inputs are invalid', () => {
    const p = plan();
    p.career[0].ralToday = Number.NaN;
    expect(phasePayPreview(p, 0)).toBeNull();
    expect(phasePayPreview(p, 9)).toBeNull();
  });
});

describe('portfolio templates', () => {
  const byId = Object.fromEntries(ASSET_TEMPLATES.map((t) => [t.id, t]));

  it('match the documented assumptions (return / volatility / TER / tax under the 2026 rules)', () => {
    const row = (id: string) => {
      const t = byId[id];
      return [t.expectedReturnPct, t.volatilityPct, t.terPct, templateTaxRatePct(t, IT_2026)];
    };
    expect(row('equityGlobal')).toEqual([6, 15, 0.2, 26]);
    expect(row('bondAggregate')).toEqual([3, 5, 0.1, 20]);
    expect(row('govBonds')).toEqual([3, 6, 0, 12.5]);
    expect(row('gold')).toEqual([4, 15, 0.25, 26]);
    expect(row('moneyMarket')).toEqual([2, 0.5, 0.1, 26]);
  });

  it('creates assets with 0% allocation (the user decides the weights)', () => {
    const a = assetFromTemplate(byId.equityGlobal, IT_2026, 'a1', 'Azionario');
    expect(a).toMatchObject({ id: 'a1', name: 'Azionario', kind: 'equity', allocationPct: 0, taxRatePct: 26 });
  });

  it('sums allocations without float noise and ignores non-numbers', () => {
    expect(allocationSum([{ allocationPct: 33.3 }, { allocationPct: 33.3 }, { allocationPct: 33.4 }])).toBe(100);
    expect(allocationSum([{ allocationPct: Number.NaN }, {}, { allocationPct: 40 }])).toBe(40);
    expect(allocationSum(undefined)).toBe(0);
  });
});

describe('holdings layout', () => {
  it('never drops a holding: unknown or repeated assets go to "other positions"', () => {
    const p = plan();
    p.assets.holdings.push({ assetId: 'ghost', value: 100, costBasis: 100 });
    p.assets.holdings.push({ assetId: p.portfolio.assets[0].id, value: 50, costBasis: 50 });
    const layout = layoutHoldings(p);
    expect(layout.byAsset.get(p.portfolio.assets[0].id)).toBe(0);
    expect(layout.others).toEqual([2, 3]);
    expect(layout.byAsset.size + layout.others.length).toBe(p.assets.holdings.length);
  });

  it('collects ids of phases, events and assets', () => {
    const ids = takenIds(plan());
    expect(ids.has('phase-1')).toBe(true);
    expect(ids.has('equity-global')).toBe(true);
  });
});
