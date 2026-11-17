import type { TaxRules } from '../types';

// STUB — to be implemented (docs/SPEC.md §5.3).
/** Exit tax %: max − reductionPerYear · max(0, years − reductionAfterYears), floored at min. */
export function exitTaxRatePct(_membershipYears: number, _rules: TaxRules): number {
  throw new Error('not implemented');
}
/** Effective yield tax %: yieldTax − (yieldTax − govBondYieldTax) · govShare/100. */
export function yieldTaxRatePct(_govBondSharePct: number, _rules: TaxRules): number {
  throw new Error('not implemented');
}
