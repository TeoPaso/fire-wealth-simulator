import { SCHEMA_VERSION, type Plan } from './types';
import { cloneRules } from './rules/it2026';

export interface DefaultPlanOptions {
  id?: string;
  name?: string;
  startYear?: number;
  /** ISO timestamp used for createdAt/updatedAt (inject in tests for determinism). */
  now?: string;
}

/**
 * Example plan: Italian employee, 30 years old, RAL 35k today growing in three phases, 1,500 €/month of expenses,
 * 70/30 ETF portfolio, negotiated pension fund with TFR, INPS contributivo.
 * Every money amount is in TODAY'S euros. Returns are nominal, compound, before costs.
 */
export function createDefaultPlan(opts: DefaultPlanOptions = {}): Plan {
  const startYear = opts.startYear ?? new Date().getFullYear();
  const now = opts.now ?? new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: opts.id ?? 'example-base',
    name: opts.name ?? 'Il mio piano',
    notes: '',
    createdAt: now,
    updatedAt: now,
    profile: { currentAge: 30, lifeExpectancy: 95, startYear },
    career: [
      {
        id: 'phase-1',
        label: 'Junior',
        untilAge: 35,
        ralToday: 35000,
        realRaisePct: 1,
        mensilita: 14,
        bonusGrossToday: 2500,
        bonusRegime: 'productivity',
        employeePensionPct: 1.5,
        employerPensionPct: 2,
        tfrToFundPct: 100,
      },
      {
        id: 'phase-2',
        label: 'Senior',
        untilAge: 45,
        ralToday: 45000,
        realRaisePct: 1,
        mensilita: 14,
        bonusGrossToday: 4000,
        bonusRegime: 'productivity',
        employeePensionPct: 1.5,
        employerPensionPct: 2,
        tfrToFundPct: 100,
      },
      {
        id: 'phase-3',
        label: 'Manager',
        untilAge: 67,
        ralToday: 55000,
        realRaisePct: 0.5,
        mensilita: 14,
        bonusGrossToday: 5000,
        bonusRegime: 'productivity',
        employeePensionPct: 1.5,
        employerPensionPct: 2,
        tfrToFundPct: 100,
      },
    ],
    retirement: { mode: 'auto', fixedAge: 55 },
    spending: { monthlyToday: 1500, retirementPct: 100, events: [] },
    savingsPolicy: { emergencyFundMonths: 6, voluntaryPension: 'none', voluntaryPensionFixedToday: 0 },
    assets: {
      cash: 5000,
      holdings: [
        { assetId: 'equity-global', value: 10500, costBasis: 10500 },
        { assetId: 'bond-aggregate', value: 4500, costBasis: 4500 },
      ],
      pensionFund: { balance: 3000, taxableBasis: 3000, membershipStartYear: startYear - 3 },
      companyTfr: 4000,
      companyTfrYears: 3,
      inps: { contributionYears: 5, montante: 0 },
    },
    portfolio: {
      assets: [
        {
          id: 'equity-global',
          name: 'Azionario globale (ETF)',
          kind: 'equity',
          allocationPct: 70,
          expectedReturnPct: 6,
          volatilityPct: 15,
          terPct: 0.2,
          taxRatePct: 26,
        },
        {
          id: 'bond-aggregate',
          name: 'Obbligazionario globale EUR hedged (ETF)',
          kind: 'bond',
          allocationPct: 30,
          expectedReturnPct: 3,
          volatilityPct: 5,
          terPct: 0.1,
          taxRatePct: 20, // blended: ~50% white-list government bonds at 12.5%, rest at 26%
        },
      ],
      equityBondCorrelation: 0.2,
      rebalancing: 'flows',
    },
    pensionFund: {
      enabled: true,
      name: 'Fondo negoziale — comparto bilanciato',
      expectedReturnPct: 3.5, // COVIP: balanced lines returned ~2-3% net over 10 years
      volatilityPct: 8,
      costPct: 0.3,
      govBondSharePct: 40,
      equityCorrelation: 0.8,
      accessAge: 67,
      accessMode: 'retirement',
      capitalSharePct: 50,
      annuityRatePct: 4.8,
    },
    statePension: {
      mode: 'contributivo',
      monthlyNetToday: 1200,
      claimAge: 67,
      realGdpGrowthPct: 1,
      indexationPct: 90,
    },
    withdrawal: { swrPct: 3.5, strategy: 'constantReal', guardrailCutPct: 10 },
    market: { inflationPct: 2, inflationVolatilityPct: 1, cashRatePct: 2 },
    simulation: { monteCarloRuns: 1000, seed: 20261116, successTargetPct: 90 },
    taxRules: cloneRules(),
  };
}

/**
 * Example plans are VARIANTS OF THE SAME LIFE (same person, same career) with different market assumptions,
 * so comparing them isolates the effect of the assumptions (v1 presets compared three different lives).
 */
export function createExamplePlans(opts: { startYear?: number; now?: string } = {}): Plan[] {
  const base = createDefaultPlan({ ...opts, id: 'example-base', name: 'Base' });

  const prudent = createDefaultPlan({ ...opts, id: 'example-prudent', name: 'Prudente' });
  prudent.portfolio.assets[0].expectedReturnPct = 5;
  prudent.portfolio.assets[1].expectedReturnPct = 2.5;
  prudent.pensionFund.expectedReturnPct = 2.5;
  prudent.market.inflationPct = 2.5;
  prudent.spending.monthlyToday = 1650;
  prudent.statePension.realGdpGrowthPct = 0.5;

  const optimistic = createDefaultPlan({ ...opts, id: 'example-optimistic', name: 'Ottimista' });
  optimistic.portfolio.assets[0].expectedReturnPct = 7;
  optimistic.portfolio.assets[1].expectedReturnPct = 3.5;
  optimistic.pensionFund.expectedReturnPct = 4;
  optimistic.market.inflationPct = 1.8;

  return [base, prudent, optimistic];
}
