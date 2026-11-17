import type { TaxRules } from '../types';
import { irpefGross } from './irpef';
import { finite, nonNegative, positiveFactor } from './util';

/**
 * Annual TFR quota (docs/SPEC.md §5.2): ral/divisor − contributionPct% · ral (art. 2120 c.c.; art. 3 c.15
 * L. 297/1982). Bonuses are excluded by the caller. Never negative.
 */
export function tfrQuota(ral: number, rules: TaxRules): number {
  const base = nonNegative(ral);
  const divisor = finite(rules.tfr.divisor);
  if (!(divisor > 0)) return 0;
  return Math.max(0, base / divisor - (base * finite(rules.tfr.contributionPct)) / 100);
}

/**
 * Revaluation rate in % for a year with the given inflation (%): fixed + share% · inflation (art. 2120 c.4 c.c.).
 * The variable part applies to the INCREASE of the price index only, so negative inflation counts as 0.
 */
export function tfrRevaluationRatePct(inflationPct: number, rules: TaxRules): number {
  return finite(rules.tfr.revalFixedPct) + (finite(rules.tfr.revalInflationSharePct) * nonNegative(inflationPct)) / 100;
}

/**
 * Tassazione separata rate (%) on the TFR (art. 19 c.1 TUIR) = average IRPEF rate (brackets only, no deductions)
 * on the reference income principal/years·12 (if years <= 0 the principal itself). 0 when there is nothing to tax.
 */
export function tfrSeparateTaxRatePct(principal: number, years: number, rules: TaxRules, indexFactor = 1): number {
  const amount = nonNegative(principal);
  if (amount === 0) return 0;
  const serviceYears = nonNegative(years);
  const referenceIncome = serviceYears > 0 ? (amount / serviceYears) * 12 : amount;
  return (irpefGross(referenceIncome, rules, positiveFactor(indexFactor)) / referenceIncome) * 100;
}
