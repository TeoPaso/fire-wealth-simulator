import type { TaxRules } from '../types';
import { bandUpper, finite, nonNegative, positiveFactor, progressiveTax, taper } from './util';

/**
 * IRPEF building blocks (docs/SPEC.md §5.1 steps 5-7, §5.4).
 *
 * Every function takes `indexFactor`: it multiplies every nominal threshold and amount (brackets, deduction limits
 * and amounts, cuneo thresholds and amounts, surcharge bands, municipal exemption threshold). 1 = not indexed (the
 * legal reality in Italy: fiscal drag). Callers pass the price index only when `rules.irpef.indexToInflation` is set
 * (see `irpefIndexFactor`). Rates (%) are never indexed.
 *
 * Inputs that are negative or not finite are treated as 0; the functions never return NaN.
 */

type TaperedDeductionRules = TaxRules['irpef']['employeeDeduction'];

/** Index factor to pass to the IRPEF functions for a year with the given price index. */
export function irpefIndexFactor(rules: TaxRules, priceIndex: number): number {
  return rules.irpef.indexToInflation ? positiveFactor(priceIndex) : 1;
}

/** Gross IRPEF (imposta lorda) by brackets, art. 11 TUIR. */
export function irpefGross(taxable: number, rules: TaxRules, indexFactor = 1): number {
  return progressiveTax(taxable, rules.irpef.brackets, positiveFactor(indexFactor));
}

/**
 * Shared shape of the art. 13 TUIR deductions (employees c.1 and pensioners c.3):
 *   RC <= band1Limit:               band1Amount
 *   band1Limit < RC <= band2Limit:  band2Base + band2Extra · (band2Limit − RC) / (band2Limit − band1Limit)
 *   band2Limit < RC <= band3Limit:  band2Base · (band3Limit − RC) / (band3Limit − band2Limit)
 *   RC > band3Limit:                0
 * plus bonusAmount when bonusFrom < RC <= bonusTo (c.1.1 for employees: +65 €; c.4 for pensioners: +50 €).
 */
function taperedDeduction(rc: number, d: TaperedDeductionRules, indexFactor: number): number {
  const f = positiveFactor(indexFactor);
  const income = nonNegative(rc);
  const band1Limit = finite(d.band1Limit) * f;
  const band2Limit = finite(d.band2Limit) * f;
  const band3Limit = finite(d.band3Limit) * f;
  const band2Base = finite(d.band2Base) * f;

  let deduction: number;
  if (income <= band1Limit) deduction = finite(d.band1Amount) * f;
  else if (income <= band2Limit) deduction = band2Base + taper(finite(d.band2Extra) * f, income, band1Limit, band2Limit);
  else if (income <= band3Limit) deduction = taper(band2Base, income, band2Limit, band3Limit);
  else deduction = 0;

  if (income > finite(d.bonusFrom) * f && income <= finite(d.bonusTo) * f) deduction += finite(d.bonusAmount) * f;
  return Math.max(0, deduction);
}

/** Detrazione per redditi di lavoro dipendente, art. 13 c.1 and c.1.1 TUIR (theoretical amount, before capacity). */
export function employeeDeduction(rc: number, rules: TaxRules, indexFactor = 1): number {
  return taperedDeduction(rc, rules.irpef.employeeDeduction, indexFactor);
}

/** Detrazione per redditi di pensione, art. 13 c.3 and c.4 TUIR (theoretical amount, before capacity). */
export function pensionerDeduction(rc: number, rules: TaxRules, indexFactor = 1): number {
  return taperedDeduction(rc, rules.irpef.pensionerDeduction, indexFactor);
}

/**
 * Ulteriore detrazione "cuneo fiscale", L. 207/2024 art. 1 c.6 (employees only):
 *   from < RC <= fullUpTo: amount;  fullUpTo < RC < zeroAt: amount · (zeroAt − RC) / (zeroAt − fullUpTo);  else 0.
 */
export function cuneoExtraDeduction(rc: number, rules: TaxRules, indexFactor = 1): number {
  const f = positiveFactor(indexFactor);
  const income = nonNegative(rc);
  const c = rules.irpef.cuneo;
  const from = finite(c.extraDeductionFrom) * f;
  const fullUpTo = finite(c.extraDeductionFullUpTo) * f;
  const zeroAt = finite(c.extraDeductionZeroAt) * f;
  const amount = nonNegative(c.extraDeductionAmount) * f;
  if (income <= from) return 0;
  if (income <= fullUpTo) return amount;
  if (income < zeroAt) return Math.max(0, taper(amount, income, fullUpTo, zeroAt));
  return 0;
}

/**
 * Tax-free sum for employment income <= 20k (added to net pay, not taxable), L. 207/2024 art. 1 c.4:
 * the rate of the first band whose upper bound is >= the employment income, applied to the whole employment
 * income; 0 above the last band.
 */
export function cuneoExemptSum(employmentIncome: number, rules: TaxRules, indexFactor = 1): number {
  const f = positiveFactor(indexFactor);
  const income = nonNegative(employmentIncome);
  if (income === 0) return 0;
  for (const band of rules.irpef.cuneo.exemptSumBands) {
    if (income <= bandUpper(band, f)) return (income * nonNegative(band.ratePct)) / 100;
  }
  return 0;
}

/**
 * Addizionali IRPEF on the taxable income: regional by progressive bands; municipal flat on the whole income unless
 * the income is <= the exemption threshold. NOTE: by law (D.Lgs. 446/1997 art. 50 c.3; D.Lgs. 360/1998 art. 1 c.4)
 * surcharges are due only if net IRPEF is due: callers apply that condition (see `irpefDue`).
 */
export function surcharges(taxable: number, rules: TaxRules, indexFactor = 1): { regional: number; municipal: number } {
  const f = positiveFactor(indexFactor);
  const income = nonNegative(taxable);
  const regional = progressiveTax(income, rules.irpef.regionalSurchargeBands, f);
  const threshold = finite(rules.irpef.municipalExemptionThreshold) * f;
  const municipal = income <= threshold ? 0 : (income * nonNegative(rules.irpef.municipalSurchargePct)) / 100;
  return { regional, municipal };
}

/** True when net IRPEF is at least one cent (the surcharges are due only in that case). */
export function irpefDue(irpefNet: number): boolean {
  return Math.round(nonNegative(irpefNet) * 100) > 0;
}

/**
 * Trattamento integrativo (optional rule `irpef.supplementaryTreatment`): `amount` if RC <= incomeLimit and the gross
 * IRPEF exceeds the art. 13 c.1 deduction minus `capacityMargin`; 0 otherwise or when the rule is absent.
 */
export function supplementaryTreatment(rc: number, grossIrpef: number, rules: TaxRules, indexFactor = 1): number {
  return supplementaryTreatmentWith(rc, grossIrpef, employeeDeduction(rc, rules, indexFactor), rules, indexFactor);
}

function supplementaryTreatmentWith(
  rc: number,
  grossIrpef: number,
  employeeDeductionAmount: number,
  rules: TaxRules,
  indexFactor: number,
): number {
  const st = rules.irpef.supplementaryTreatment;
  if (!st) return 0;
  const f = positiveFactor(indexFactor);
  if (nonNegative(rc) > finite(st.incomeLimit) * f) return 0;
  const capacityThreshold = employeeDeductionAmount - finite(st.capacityMargin) * f;
  return nonNegative(grossIrpef) > capacityThreshold ? nonNegative(st.amount) * f : 0;
}

/** Ordinary taxation of an employee's yearly employment income (= reddito complessivo, no other income). */
export interface EmploymentIncomeTax {
  taxableIncome: number;
  irpefGross: number;
  /** Deductions actually used (capped at the gross tax: art. 13 first, then the cuneo extra deduction). */
  employeeDeduction: number;
  cuneoExtraDeduction: number;
  irpefNet: number;
  regionalSurcharge: number;
  municipalSurcharge: number;
  cuneoExemptSum: number;
  supplementaryTreatment: number;
  /** irpefNet + surcharges − cuneoExemptSum − supplementaryTreatment: the net fiscal burden on that income. */
  netBurden: number;
}

/** IRPEF, deductions, surcharges and tax-free cuneo/integrativo sums for an employment income (SPEC §5.1 5-7). */
export function employmentIncomeTax(employmentIncome: number, rules: TaxRules, indexFactor = 1): EmploymentIncomeTax {
  const f = positiveFactor(indexFactor);
  const taxableIncome = nonNegative(employmentIncome);
  const gross = irpefGross(taxableIncome, rules, f);
  const employeeTheoretical = employeeDeduction(taxableIncome, rules, f);
  const employeeUsed = Math.min(employeeTheoretical, gross);
  const cuneoUsed = Math.min(cuneoExtraDeduction(taxableIncome, rules, f), gross - employeeUsed);
  const irpefNet = Math.max(0, gross - employeeUsed - cuneoUsed);
  const s = irpefDue(irpefNet) ? surcharges(taxableIncome, rules, f) : { regional: 0, municipal: 0 };
  const exempt = cuneoExemptSum(taxableIncome, rules, f);
  const integrativo = supplementaryTreatmentWith(taxableIncome, gross, employeeTheoretical, rules, f);
  return {
    taxableIncome,
    irpefGross: gross,
    employeeDeduction: employeeUsed,
    cuneoExtraDeduction: cuneoUsed,
    irpefNet,
    regionalSurcharge: s.regional,
    municipalSurcharge: s.municipal,
    cuneoExemptSum: exempt,
    supplementaryTreatment: integrativo,
    netBurden: irpefNet + s.regional + s.municipal - exempt - integrativo,
  };
}
