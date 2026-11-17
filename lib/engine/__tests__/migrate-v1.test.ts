import { describe, expect, it } from 'vitest';
import { migrateV1State } from '../migrate-v1';
import { hasErrors, validatePlan } from '../validate';
import { runPlan } from '../fire';
import { SCHEMA_VERSION } from '../types';

/** The three v1 presets, verbatim from 51eee8d:lib/store/presets.ts (DEFAULT_PRESETS). */
const V1_PRESETS = [
  {
    id: 'preset-base',
    name: 'Base Case',
    description: 'Standard scenario: €37.5k salary (14 mensilità), 70/30 ETF split, 100% TFR to Pension Fund, 2.0% inflation, ~6.0% market return.',
    timeHorizonYears: 30,
    inflationRatePercent: 2,
    tfrDivisor: 13.5,
    initialWealth: { investedCapital: 15000, cashLiquidity: 5000, pensionBalance: 3000, accumulatedTfr: 4000 },
    salaryPhases: [
      { id: 'sp-base-1', startYear: 1, endYear: 5, annualGrossRAL: 35000, mensilita: 14, monthlyNetSavings: 600, extraSavings13th: 500, extraSavings14th: 500, annualBonusGross: 2500, bonusTaxType: 'DETASSAZIONE_5', bonusInvestPercent: 100, tfrPensionAllocationPercent: 100 },
      { id: 'sp-base-2', startYear: 6, endYear: 15, annualGrossRAL: 48000, mensilita: 14, monthlyNetSavings: 900, extraSavings13th: 750, extraSavings14th: 750, annualBonusGross: 4000, bonusTaxType: 'DETASSAZIONE_5', bonusInvestPercent: 100, tfrPensionAllocationPercent: 100 },
      { id: 'sp-base-3', startYear: 16, endYear: 30, annualGrossRAL: 60000, mensilita: 14, monthlyNetSavings: 1300, extraSavings13th: 1000, extraSavings14th: 1000, annualBonusGross: 6000, bonusTaxType: 'ORDINARIA_IRPEF', bonusInvestPercent: 100, tfrPensionAllocationPercent: 100 },
    ],
    pensionFund: { enabled: true, routeTfr: true, tfrPensionAllocationPercent: 100, employeeContributionPercent: 2, employerContributionPercent: 2, expectedReturnPercent: 4, terPercent: 0.3, taxRatePercent: 12, annualYieldTaxRatePercent: 20 },
    investmentBuckets: [
      { id: 'ib-base-1', name: 'Global Equities (VWCE)', allocationPercent: 70, expectedReturnPercent: 7, terPercent: 0.22, taxRatePercent: 26 },
      { id: 'ib-base-2', name: 'Government & Aggregate Bonds (AGGH)', allocationPercent: 30, expectedReturnPercent: 3.5, terPercent: 0.1, taxRatePercent: 12.5 },
    ],
    taxes: { wealthTaxPercent: 0.2, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 35, tfrSubtractedPercentage: 0.5, tfrCompanyTaxRatePercent: 23, tfrCompanyFixedRevalRate: 1.5, tfrCompanyInflationWeight: 75, bonusSubstituteTaxRate: 5, pensionAnnualYieldTaxRate: 20 },
  },
  {
    id: 'preset-pessimistic',
    name: 'Pessimistic Case',
    description: 'Conservative scenario: lower growth (4.0%), higher inflation (3.5%), TFR retained in company, cautious allocation.',
    timeHorizonYears: 30,
    inflationRatePercent: 3.5,
    tfrDivisor: 13.5,
    initialWealth: { investedCapital: 10000, cashLiquidity: 5000, pensionBalance: 2000, accumulatedTfr: 3000 },
    salaryPhases: [
      { id: 'sp-pess-1', startYear: 1, endYear: 10, annualGrossRAL: 32000, mensilita: 13, monthlyNetSavings: 400, extraSavings13th: 200, extraSavings14th: 0, annualBonusGross: 0, bonusTaxType: 'DETASSAZIONE_5', bonusInvestPercent: 100, tfrPensionAllocationPercent: 0 },
      { id: 'sp-pess-2', startYear: 11, endYear: 30, annualGrossRAL: 38000, mensilita: 13, monthlyNetSavings: 500, extraSavings13th: 250, extraSavings14th: 0, annualBonusGross: 0, bonusTaxType: 'DETASSAZIONE_5', bonusInvestPercent: 100, tfrPensionAllocationPercent: 0 },
    ],
    pensionFund: { enabled: true, routeTfr: false, tfrPensionAllocationPercent: 0, employeeContributionPercent: 1, employerContributionPercent: 1, expectedReturnPercent: 2.5, terPercent: 0.8, taxRatePercent: 15, annualYieldTaxRatePercent: 20 },
    investmentBuckets: [
      { id: 'ib-pess-1', name: 'Active Equity Fund', allocationPercent: 50, expectedReturnPercent: 4.5, terPercent: 0.6, taxRatePercent: 26 },
      { id: 'ib-pess-2', name: 'Corporate Bonds Fund', allocationPercent: 40, expectedReturnPercent: 3, terPercent: 0.4, taxRatePercent: 26 },
      { id: 'ib-pess-3', name: 'Cash / Liquidity Reserves', allocationPercent: 10, expectedReturnPercent: 1, terPercent: 0, taxRatePercent: 26 },
    ],
    taxes: { wealthTaxPercent: 0.2, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 28, tfrSubtractedPercentage: 0.5, tfrCompanyTaxRatePercent: 23, tfrCompanyFixedRevalRate: 1.5, tfrCompanyInflationWeight: 75, bonusSubstituteTaxRate: 5, pensionAnnualYieldTaxRate: 20 },
  },
  {
    id: 'preset-optimistic',
    name: 'Optimistic Case',
    description: 'High-growth scenario: strong returns (8.5%), 14 mensilità, 10% annual bonus, low fee ETFs, fast career progression.',
    timeHorizonYears: 30,
    inflationRatePercent: 1.8,
    tfrDivisor: 13.5,
    initialWealth: { investedCapital: 25000, cashLiquidity: 10000, pensionBalance: 5000, accumulatedTfr: 6000 },
    salaryPhases: [
      { id: 'sp-opt-1', startYear: 1, endYear: 5, annualGrossRAL: 42000, mensilita: 14, monthlyNetSavings: 1000, extraSavings13th: 800, extraSavings14th: 800, annualBonusGross: 4200, bonusTaxType: 'DETASSAZIONE_5', bonusInvestPercent: 100, tfrPensionAllocationPercent: 100 },
      { id: 'sp-opt-2', startYear: 6, endYear: 12, annualGrossRAL: 65000, mensilita: 14, monthlyNetSavings: 1800, extraSavings13th: 1200, extraSavings14th: 1200, annualBonusGross: 6500, bonusTaxType: 'ORDINARIA_IRPEF', bonusInvestPercent: 100, tfrPensionAllocationPercent: 100 },
      { id: 'sp-opt-3', startYear: 13, endYear: 30, annualGrossRAL: 90000, mensilita: 14, monthlyNetSavings: 2800, extraSavings13th: 2000, extraSavings14th: 2000, annualBonusGross: 9000, bonusTaxType: 'ORDINARIA_IRPEF', bonusInvestPercent: 100, tfrPensionAllocationPercent: 100 },
    ],
    pensionFund: { enabled: true, routeTfr: true, tfrPensionAllocationPercent: 100, employeeContributionPercent: 3, employerContributionPercent: 3, expectedReturnPercent: 5.5, terPercent: 0.15, taxRatePercent: 9, annualYieldTaxRatePercent: 20 },
    investmentBuckets: [
      { id: 'ib-opt-1', name: 'S&P 500 / Tech Index (VUAA / QDVE)', allocationPercent: 80, expectedReturnPercent: 9.5, terPercent: 0.07, taxRatePercent: 26 },
      { id: 'ib-opt-2', name: 'Global Government Bonds (VAGF)', allocationPercent: 20, expectedReturnPercent: 4.5, terPercent: 0.1, taxRatePercent: 12.5 },
    ],
    taxes: { wealthTaxPercent: 0.2, pensionDeductionCap: 5164.57, marginalIRPEFTaxRate: 43, tfrSubtractedPercentage: 0.5, tfrCompanyTaxRatePercent: 23, tfrCompanyFixedRevalRate: 1.5, tfrCompanyInflationWeight: 75, bonusSubstituteTaxRate: 5, pensionAnnualYieldTaxRate: 20 },
  },
];
const V1_STATE = {
  version: 1,
  activeScenarioId: 'preset-base',
  comparisonScenarioIds: ['preset-base', 'preset-pessimistic', 'preset-optimistic'],
  scenarios: V1_PRESETS,
  lastUpdated: '2026-05-01T10:00:00.000Z',
};

const NOW = '2026-03-01T00:00:00.000Z';

describe('migrateV1State — v1 presets', () => {
  const plans = migrateV1State(V1_STATE, { now: NOW });

  it('yields one valid plan per scenario, with fresh ids and the v1 names', () => {
    expect(plans.map((p) => p.name)).toEqual(['Base Case', 'Pessimistic Case', 'Optimistic Case']);
    expect(new Set(plans.map((p) => p.id)).size).toBe(3);
    for (const plan of plans) {
      expect(plan.id.startsWith('preset-')).toBe(false);
      expect(plan.schemaVersion).toBe(SCHEMA_VERSION);
      expect(plan.createdAt).toBe(NOW);
      expect(plan.profile.startYear).toBe(2026);
      const issues = validatePlan(plan);
      expect(issues.filter((i) => i.level === 'error')).toEqual([]);
      expect(() => runPlan(plan)).not.toThrow();
    }
  });

  it('maps phases to ages from 30, RAL as today’s euros, bonus regime and TFR destination', () => {
    const [base, pessimistic, optimistic] = plans;
    expect(base.profile.currentAge).toBe(30);
    expect(base.career.map((c) => c.untilAge)).toEqual([35, 45, 60]);
    expect(base.career.map((c) => c.ralToday)).toEqual([35000, 48000, 60000]);
    expect(base.career.map((c) => c.bonusRegime)).toEqual(['productivity', 'productivity', 'ordinary']);
    expect(base.career.map((c) => c.mensilita)).toEqual([14, 14, 14]);
    expect(base.career[0]).toMatchObject({ employeePensionPct: 2, employerPensionPct: 2, tfrToFundPct: 100, bonusGrossToday: 2500 });
    expect(pessimistic.career.map((c) => c.tfrToFundPct)).toEqual([0, 0]);
    expect(optimistic.career.map((c) => c.untilAge)).toEqual([35, 42, 60]);
  });

  it('infers monthly expenses as (first-phase net pay − what v1 saved) / 12', () => {
    const [base] = plans;
    const r0 = runPlan(base).rows[0];
    // v1 saved 600 × 12 + 500 + 500 + the net bonus + the pension tax rebate. In v2 year 0 those savings come back
    // as net savings (the cash fill to the emergency fund included).
    expect(base.spending.monthlyToday).toBeGreaterThan(1000);
    expect(base.spending.monthlyToday).toBeLessThan(2000);
    const expected = (r0.payroll?.netIncome ?? 0) + r0.cashInterestNet - base.spending.monthlyToday * 12 - r0.stampDuty;
    expect(r0.netSavings).toBeCloseTo(expected, 6);
    expect(r0.netSavings).toBeGreaterThan(600 * 12 + 1000);
  });

  it('maps buckets to assets and splits the invested capital by allocation, cost basis = value', () => {
    const [base, pessimistic] = plans;
    expect(base.portfolio.assets.map((a) => [a.kind, a.allocationPct, a.volatilityPct])).toEqual([
      ['equity', 70, 15],
      ['bond', 30, 5],
    ]);
    expect(base.assets.holdings).toEqual([
      { assetId: 'ib-base-1', value: 10500, costBasis: 10500 },
      { assetId: 'ib-base-2', value: 4500, costBasis: 4500 },
    ]);
    expect(base.assets.cash).toBe(5000);
    expect(base.assets.pensionFund.balance).toBe(3000);
    expect(base.assets.companyTfr).toBe(4000);
    expect(base.market.inflationPct).toBe(2);
    expect(base.pensionFund).toMatchObject({ enabled: true, expectedReturnPct: 4, costPct: 0.3, govBondSharePct: 0 });
    expect(pessimistic.portfolio.assets.map((a) => a.kind)).toEqual(['equity', 'bond', 'cash']);
    expect(pessimistic.market.inflationPct).toBe(3.5);
  });

  it('writes an Italian note asking to check age and amounts', () => {
    for (const plan of plans) {
      expect(plan.notes).toContain('30 anni');
      expect(plan.notes).toMatch(/Controlla/);
      expect(plan.notes).toMatch(/spese mensili/);
    }
  });
});

describe('migrateV1State — best effort, never throws', () => {
  it('accepts JSON text, an array of scenarios or a single scenario', () => {
    expect(migrateV1State(JSON.stringify(V1_STATE), { now: NOW })).toHaveLength(3);
    expect(migrateV1State(V1_PRESETS, { now: NOW })).toHaveLength(3);
    expect(migrateV1State(V1_PRESETS[0], { now: NOW })).toHaveLength(1);
  });

  it('returns [] for unusable input and skips broken scenarios', () => {
    for (const raw of [null, undefined, 42, '{broken', 'null', {}, { scenarios: 'x' }, []]) {
      expect(() => migrateV1State(raw)).not.toThrow();
      expect(migrateV1State(raw)).toEqual([]);
    }
    const partial = migrateV1State({ scenarios: [null, 3, { name: 'Solo nome' }, { salaryPhases: [{ annualGrossRAL: 'x' }] }] }, { now: NOW });
    expect(partial).toHaveLength(2);
    expect(partial[0].name).toBe('Solo nome');
    // Missing data is reported by validation, not invented.
    expect(validatePlan(partial[0]).some((i) => i.code === 'careerEmpty')).toBe(true);
    const issues = validatePlan(partial[1]);
    expect(issues.find((i) => i.code === 'allocationSum')).toMatchObject({ path: 'portfolio.assets', params: { sum: 0 } });
    expect(partial[1].career[0]).toMatchObject({ ralToday: 0, untilAge: 31 });
    expect(hasErrors(issues)).toBe(true);
  });
});
