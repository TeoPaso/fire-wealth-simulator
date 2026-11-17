import type { TaxRules } from '../types';
import { irpefDue, irpefGross, pensionerDeduction, surcharges as surchargesOn } from './irpef';
import { nonNegative, positiveFactor } from './util';

export interface PensionIncomeTax {
  gross: number;
  irpef: number;
  surcharges: number;
  net: number;
}

/**
 * Net state pension (docs/SPEC.md §5.4): IRPEF by brackets minus the pensioner deduction (art. 13 c.3-4 TUIR,
 * including the +50 € band), plus regional/municipal surcharges (only when net IRPEF is due). The pension is assumed
 * to be the only income (reddito complessivo = gross pension). `indexFactor` as in irpef.ts.
 */
export function netPensionIncome(grossAnnual: number, rules: TaxRules, indexFactor = 1): PensionIncomeTax {
  const f = positiveFactor(indexFactor);
  const gross = nonNegative(grossAnnual);
  const irpef = Math.max(0, irpefGross(gross, rules, f) - pensionerDeduction(gross, rules, f));
  const s = irpefDue(irpef) ? surchargesOn(gross, rules, f) : { regional: 0, municipal: 0 };
  const surcharges = s.regional + s.municipal;
  return { gross, irpef, surcharges, net: gross - irpef - surcharges };
}
