import type { TaxRules } from '../types';

// STUB — to be implemented (docs/SPEC.md §5.2).
/** Annual TFR quota: ral/divisor − contributionPct% · ral. */
export function tfrQuota(_ral: number, _rules: TaxRules): number {
  throw new Error('not implemented');
}
/** Revaluation rate in % for a year with the given inflation (%): fixed + share · inflation. */
export function tfrRevaluationRatePct(_inflationPct: number, _rules: TaxRules): number {
  throw new Error('not implemented');
}
/** Tassazione separata rate (%) = average IRPEF rate (brackets only) on principal/years·12. */
export function tfrSeparateTaxRatePct(_principal: number, _years: number, _rules: TaxRules, _indexFactor = 1): number {
  throw new Error('not implemented');
}
