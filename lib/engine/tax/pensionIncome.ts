import type { TaxRules } from '../types';

export interface PensionIncomeTax {
  gross: number;
  irpef: number;
  surcharges: number;
  net: number;
}

// STUB — to be implemented (docs/SPEC.md §5.4): IRPEF with pensioner deductions + surcharges.
export function netPensionIncome(_grossAnnual: number, _rules: TaxRules, _indexFactor = 1): PensionIncomeTax {
  throw new Error('not implemented');
}
