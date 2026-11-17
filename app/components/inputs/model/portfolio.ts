/**
 * Portfolio helpers for the inputs panel (pure, no React): "add asset" templates and holdings lookup.
 * Template tax rates are derived from the plan's TaxRules (no legal number is hard-coded here).
 */
import type { AssetClass, AssetKind, Holding, Plan, TaxRules } from '@/lib/engine';

export type AssetTemplateId = 'equityGlobal' | 'bondAggregate' | 'govBonds' | 'gold' | 'moneyMarket' | 'custom';

type TaxSpec =
  | { type: 'capitalGains' }
  | { type: 'govBond' }
  /** Blend of white-list government bonds (taxed at govBondPct) and other bonds (capitalGainsPct). */
  | { type: 'blend'; govBondSharePct: number };

export interface AssetTemplate {
  id: AssetTemplateId;
  kind: AssetKind;
  /** i18n key of the default asset name (stored in the plan in the current UI language). */
  nameKey: string;
  expectedReturnPct: number;
  volatilityPct: number;
  terPct: number;
  tax: TaxSpec;
}

/**
 * Market assumptions for the templates (nominal compound returns before costs, volatility, TER). These are
 * starting points the user is expected to review, not forecasts.
 */
export const ASSET_TEMPLATES: readonly AssetTemplate[] = [
  {
    id: 'equityGlobal',
    kind: 'equity',
    nameKey: 'inputs.portfolio.template.equityGlobal',
    expectedReturnPct: 6,
    volatilityPct: 15,
    terPct: 0.2,
    tax: { type: 'capitalGains' },
  },
  {
    id: 'bondAggregate',
    kind: 'bond',
    nameKey: 'inputs.portfolio.template.bondAggregate',
    expectedReturnPct: 3,
    volatilityPct: 5,
    terPct: 0.1,
    // A EUR aggregate index holds roughly 45% white-list government bonds.
    tax: { type: 'blend', govBondSharePct: 45 },
  },
  {
    id: 'govBonds',
    kind: 'bond',
    nameKey: 'inputs.portfolio.template.govBonds',
    expectedReturnPct: 3,
    volatilityPct: 6,
    terPct: 0,
    tax: { type: 'govBond' },
  },
  {
    id: 'gold',
    kind: 'other',
    nameKey: 'inputs.portfolio.template.gold',
    expectedReturnPct: 4,
    volatilityPct: 15,
    terPct: 0.25,
    tax: { type: 'capitalGains' },
  },
  {
    id: 'moneyMarket',
    kind: 'cash',
    nameKey: 'inputs.portfolio.template.moneyMarket',
    expectedReturnPct: 2,
    volatilityPct: 0.5,
    terPct: 0.1,
    tax: { type: 'capitalGains' },
  },
  {
    id: 'custom',
    kind: 'other',
    nameKey: 'inputs.portfolio.template.custom',
    expectedReturnPct: 0,
    volatilityPct: 0,
    terPct: 0,
    tax: { type: 'capitalGains' },
  },
];

/** Tax rate (%) of a template under the given rules. A blend is rounded to a whole percent (it is an estimate). */
export function templateTaxRatePct(template: AssetTemplate, rules: TaxRules): number {
  const cg = rules.investments.capitalGainsPct;
  const gov = rules.investments.govBondPct;
  switch (template.tax.type) {
    case 'capitalGains':
      return cg;
    case 'govBond':
      return gov;
    case 'blend':
      return Math.round(cg - ((cg - gov) * template.tax.govBondSharePct) / 100);
  }
}

/** A new asset from a template, with 0% allocation (the user decides the weights; the meter shows what is left). */
export function assetFromTemplate(template: AssetTemplate, rules: TaxRules, id: string, name: string): AssetClass {
  return {
    id,
    name,
    kind: template.kind,
    allocationPct: 0,
    expectedReturnPct: template.expectedReturnPct,
    volatilityPct: template.volatilityPct,
    terPct: template.terPct,
    taxRatePct: templateTaxRatePct(template, rules),
  };
}

/** Sum of the target allocations (non-numeric entries count as 0). */
export function allocationSum(assets: readonly Partial<AssetClass>[] | undefined): number {
  if (!Array.isArray(assets)) return 0;
  const sum = assets.reduce((s, a) => s + (typeof a?.allocationPct === 'number' && Number.isFinite(a.allocationPct) ? a.allocationPct : 0), 0);
  // Avoid 99.99999999 from float addition of decimals like 33.3 + 33.3 + 33.4.
  return Math.round(sum * 1e6) / 1e6;
}

export interface HoldingsLayout {
  /** assetId → index in plan.assets.holdings of the holding shown under that asset (the first one). */
  byAsset: Map<string, number>;
  /** Holdings shown in the "other positions" list: unknown asset ids and further holdings of the same asset. */
  others: number[];
}

/** Which holding is displayed where. Never drops a holding. */
export function layoutHoldings(plan: Plan): HoldingsLayout {
  const assetIds = new Set(
    (Array.isArray(plan.portfolio?.assets) ? plan.portfolio.assets : [])
      .map((a) => a?.id)
      .filter((id): id is string => typeof id === 'string'),
  );
  const holdings: Partial<Holding>[] = Array.isArray(plan.assets?.holdings) ? plan.assets.holdings : [];
  const byAsset = new Map<string, number>();
  const others: number[] = [];
  holdings.forEach((h, i) => {
    const id = h?.assetId;
    if (typeof id === 'string' && assetIds.has(id) && !byAsset.has(id)) byAsset.set(id, i);
    else others.push(i);
  });
  return { byAsset, others };
}

/** Ids already used by assets, phases and events of the plan (to generate unique new ids). */
export function takenIds(plan: Plan): Set<string> {
  const ids = new Set<string>();
  const add = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const id = (item as { id?: unknown } | null)?.id;
      if (typeof id === 'string') ids.add(id);
    }
  };
  add(plan.portfolio?.assets);
  add(plan.career);
  add(plan.spending?.events);
  return ids;
}
