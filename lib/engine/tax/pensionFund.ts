import type { TaxRules } from '../types';
import { finite, nonNegative } from './util';

/**
 * Exit tax % on pension-fund benefits (art. 11 c.6 D.Lgs. 252/2005): max − reductionPerYear · (full years of
 * membership beyond reductionAfterYears), floored at min. 15% → 9% after 35 years with the default rules.
 */
export function exitTaxRatePct(membershipYears: number, rules: TaxRules): number {
  const pf = rules.pensionFund;
  const yearsBeyond = Math.floor(Math.max(0, nonNegative(membershipYears) - finite(pf.exitTaxReductionAfterYears)));
  const rate = finite(pf.exitTaxMaxPct) - finite(pf.exitTaxReductionPerYearPct) * yearsBeyond;
  return Math.max(finite(pf.exitTaxMinPct), rate);
}

/**
 * Effective yield tax % on the fund's yearly result: yieldTax − (yieldTax − govBondYieldTax) · govShare/100
 * (white-list government bonds are taxed at 12.5% instead of 20%). The share is clamped to [0, 100].
 */
export function yieldTaxRatePct(govBondSharePct: number, rules: TaxRules): number {
  const share = Math.min(100, nonNegative(govBondSharePct));
  const full = finite(rules.pensionFund.yieldTaxPct);
  return full - ((full - finite(rules.pensionFund.govBondYieldTaxPct)) * share) / 100;
}
