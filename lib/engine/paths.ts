import type { AssetKind, MarketPath, Plan } from './types';
import { choleskyWithFallback, createNormal, deriveSeed, mulberry32 } from './random';

/**
 * Market paths (docs/SPEC.md §5.9). A path holds, for each simulated year t, the nominal returns of every portfolio
 * asset (gross of TER), of the pension-fund line (gross of costs) and the inflation of the year, all as decimals.
 */

/** Model constants of the Monte Carlo market model (SPEC §5.9; modelling choices, not legal parameters). */
export const MARKET_MODEL = {
  equityEquityCorrelation: 0.85,
  bondBondCorrelation: 0.7,
  /** Correlation of an 'other' asset with anything, and of the fund with bonds/other assets. */
  otherCorrelation: 0.5,
  fundBondCorrelation: 0.5,
  /** Simulated yearly inflation is clipped to this range (decimals). */
  inflationMin: -0.03,
  inflationMax: 0.15,
} as const;

/** Deterministic path: every year uses the expected (median) returns and the expected inflation. */
export function deterministicPath(plan: Plan, years: number): MarketPath {
  const returns = plan.portfolio.assets.map((a) => a.expectedReturnPct / 100);
  const fund = plan.pensionFund.expectedReturnPct / 100;
  const inflation = plan.market.inflationPct / 100;
  const n = Math.max(0, Math.floor(years));
  return {
    assetReturns: Array.from({ length: n }, () => returns.slice()),
    pensionFundReturns: new Array<number>(n).fill(fund),
    inflation: new Array<number>(n).fill(inflation),
  };
}

type FactorKind = AssetKind | 'fund';

function pairCorrelation(a: FactorKind, b: FactorKind, plan: Plan): number {
  if (a === 'fund' || b === 'fund') {
    const other = a === 'fund' ? b : a;
    if (other === 'equity') return plan.pensionFund.equityCorrelation;
    if (other === 'bond') return MARKET_MODEL.fundBondCorrelation;
    return MARKET_MODEL.otherCorrelation;
  }
  if (a === 'equity' && b === 'equity') return MARKET_MODEL.equityEquityCorrelation;
  if (a === 'bond' && b === 'bond') return MARKET_MODEL.bondBondCorrelation;
  if ((a === 'equity' && b === 'bond') || (a === 'bond' && b === 'equity')) return plan.portfolio.equityBondCorrelation;
  return MARKET_MODEL.otherCorrelation;
}

/** Lognormal parameters whose median is 1 + E and whose arithmetic standard deviation is ≈ σ (SPEC §5.9). */
function lognormalParams(expectedPct: number, volatilityPct: number): { mu: number; sigma: number } {
  const e = expectedPct / 100;
  const s = volatilityPct / 100;
  const mu = Math.log(1 + e);
  const sigma = s > 0 ? Math.sqrt(Math.log(1 + (s * s) / ((1 + e) * (1 + e)))) : 0;
  return { mu, sigma };
}

/** Correlation structure used by the generator (exported for tests). */
export interface PathModel {
  /** Index in plan.portfolio.assets of each random asset factor; -1 = the pension fund. */
  factors: number[];
  correlation: number[][];
  factor: number[][];
  shrinkage: number;
}

/** Random factors: assets with volatility > 0 that are not cash, plus the pension fund if its volatility > 0. */
export function buildPathModel(plan: Plan): PathModel {
  const factors: number[] = [];
  const kinds: FactorKind[] = [];
  plan.portfolio.assets.forEach((a, i) => {
    if (a.kind !== 'cash' && a.volatilityPct > 0) {
      factors.push(i);
      kinds.push(a.kind);
    }
  });
  if (plan.pensionFund.volatilityPct > 0) {
    factors.push(-1);
    kinds.push('fund');
  }
  const correlation = kinds.map((a, i) => kinds.map((b, j) => (i === j ? 1 : pairCorrelation(a, b, plan))));
  const { factor, shrinkage } = choleskyWithFallback(correlation);
  return { factors, correlation, factor, shrinkage };
}

/**
 * Seeded generator of correlated lognormal market paths. Path `runIndex` depends only on (seed, runIndex), so the
 * same run is identical across candidate retirement ages (common random numbers) and across calls.
 */
export function createPathGenerator(plan: Plan, years: number, seed: number): (runIndex: number) => MarketPath {
  const n = Math.max(0, Math.floor(years));
  const assets = plan.portfolio.assets;
  const model = buildPathModel(plan);
  const k = model.factors.length;
  const assetParams = assets.map((a) => lognormalParams(a.expectedReturnPct, a.kind === 'cash' ? 0 : a.volatilityPct));
  const fundParams = lognormalParams(plan.pensionFund.expectedReturnPct, plan.pensionFund.volatilityPct);
  const fixedReturns = assets.map((a) => a.expectedReturnPct / 100);
  const fundFixed = plan.pensionFund.expectedReturnPct / 100;
  const inflationMean = plan.market.inflationPct / 100;
  const inflationVol = plan.market.inflationVolatilityPct / 100;
  const L = model.factor;

  return (runIndex: number): MarketPath => {
    const normal = createNormal(mulberry32(deriveSeed(seed, runIndex)));
    const z = new Float64Array(k);
    const assetReturns: number[][] = new Array(n);
    const pensionFundReturns: number[] = new Array(n);
    const inflation: number[] = new Array(n);
    for (let t = 0; t < n; t++) {
      for (let i = 0; i < k; i++) z[i] = normal();
      const row = fixedReturns.slice();
      let fund = fundFixed;
      for (let i = 0; i < k; i++) {
        let x = 0;
        const li = L[i];
        for (let j = 0; j <= i; j++) x += li[j] * z[j];
        const idx = model.factors[i];
        if (idx === -1) fund = Math.exp(fundParams.mu + fundParams.sigma * x) - 1;
        else row[idx] = Math.exp(assetParams[idx].mu + assetParams[idx].sigma * x) - 1;
      }
      assetReturns[t] = row;
      pensionFundReturns[t] = fund;
      const pi = inflationMean + inflationVol * normal();
      inflation[t] = Math.min(MARKET_MODEL.inflationMax, Math.max(MARKET_MODEL.inflationMin, pi));
    }
    return { assetReturns, pensionFundReturns, inflation };
  };
}
