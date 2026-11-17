import type { TaxRules } from '../types';

// STUB — to be implemented (see docs/SPEC.md §5.1). `indexFactor` multiplies all nominal thresholds (1 = not indexed).
export function irpefGross(_taxable: number, _rules: TaxRules, _indexFactor = 1): number {
  throw new Error('not implemented');
}
export function employeeDeduction(_rc: number, _rules: TaxRules, _indexFactor = 1): number {
  throw new Error('not implemented');
}
export function pensionerDeduction(_rc: number, _rules: TaxRules, _indexFactor = 1): number {
  throw new Error('not implemented');
}
export function cuneoExtraDeduction(_rc: number, _rules: TaxRules, _indexFactor = 1): number {
  throw new Error('not implemented');
}
/** Tax-free sum for employment income <= 20k (added to net pay, not taxable). */
export function cuneoExemptSum(_employmentIncome: number, _rules: TaxRules, _indexFactor = 1): number {
  throw new Error('not implemented');
}
export function surcharges(_taxable: number, _rules: TaxRules, _indexFactor = 1): { regional: number; municipal: number } {
  throw new Error('not implemented');
}
