import type { PayrollBreakdown, PayrollInput, TaxRules } from '../types';
import { employmentIncomeTax, irpefIndexFactor } from './irpef';
import { finite, nonNegative, positiveFactor } from './util';

/** Step of ordinary taxable income used for the finite-difference marginal rate, €. */
const MARGINAL_STEP_EUR = 100;

/** Index factor for the INPS thresholds (additional-rate threshold, ceiling) in a year with the given price index. */
export function inpsIndexFactor(rules: TaxRules, priceIndex: number): number {
  return rules.inps.indexThresholdsToInflation ? positiveFactor(priceIndex) : 1;
}

/** INPS ceiling (massimale) in nominal € for the year; a missing/invalid ceiling means "no ceiling". */
export function inpsCeiling(rules: TaxRules, priceIndex: number): number {
  const ceiling = rules.inps.ceiling;
  return Number.isFinite(ceiling) && ceiling > 0 ? ceiling * inpsIndexFactor(rules, priceIndex) : Infinity;
}

/**
 * Employee INPS contributions on a yearly gross base (SPEC §5.1 step 1):
 * employeeRate · min(base, ceiling) + additionalRate · max(0, min(base, ceiling) − additionalThreshold).
 */
export function employeeInps(base: number, rules: TaxRules, priceIndex = 1): number {
  const capped = Math.min(nonNegative(base), inpsCeiling(rules, priceIndex));
  const threshold = nonNegative(rules.inps.additionalThreshold) * inpsIndexFactor(rules, priceIndex);
  const aboveThreshold = Math.max(0, capped - threshold);
  return (capped * nonNegative(rules.inps.employeeRatePct)) / 100 + (aboveThreshold * nonNegative(rules.inps.additionalRatePct)) / 100;
}

/** Productivity-bonus substitute regime in force in a calendar year: rate (%) and cap (nominal €, not indexed). */
export function productivityBonusRegime(rules: TaxRules, calendarYear: number): { ratePct: number; cap: number } {
  const pb = rules.productivityBonus;
  const reduced = pb.validUntilYear === null || !(calendarYear > pb.validUntilYear);
  return reduced
    ? { ratePct: nonNegative(pb.ratePct), cap: nonNegative(pb.cap) }
    : { ratePct: nonNegative(pb.afterRatePct), cap: nonNegative(pb.afterCap) };
}

/** Whether a productivity bonus qualifies for the substitute regime given the prior-year employment income. */
export function productivityBonusEligible(priorYearIncome: number, rules: TaxRules): boolean {
  return nonNegative(priorYearIncome) <= finite(rules.productivityBonus.priorYearIncomeLimit);
}

export interface PayrollOptions {
  /**
   * false = skip the two extra tax recomputations behind `pensionTaxSaving` and `marginalRatePct` (both returned as
   * 0). Meant for Monte Carlo inner loops that never display them; default true.
   */
  derived?: boolean;
}

/**
 * Yearly payroll of an employee, docs/SPEC.md §5.1 steps 1-9 (all amounts nominal €).
 *
 * Notes beyond the spec text (all legal, see comments in irpef.ts):
 * - INPS on the productivity bonus is attributed pro rata (bonus share of the INPS base × total INPS).
 * - The deductible employee contribution is also limited by the income it is deducted from (taxable income >= 0);
 *   the rest is reported as non-deductible (exempt at exit, like any non-deducted contribution).
 * - `employeeDeduction` / `cuneoExtraDeduction` are the amounts actually used (capped at the gross tax), so
 *   irpefGross − employeeDeduction − cuneoExtraDeduction = irpefNet always holds.
 * - Surcharges are 0 when no net IRPEF is due; the trattamento integrativo (optional rule) is added to net.
 * - `pensionTaxSaving` and `marginalRatePct` use the net fiscal burden (IRPEF + surcharges − tax-free cuneo sum −
 *   trattamento integrativo), so they include the loss/gain of those tax-free sums; `averageRatePct` follows the
 *   contract: (irpefNet + surcharges) / gross.
 */
export function computePayroll(input: PayrollInput, rules: TaxRules, options: PayrollOptions = {}): PayrollBreakdown {
  const ral = nonNegative(input.ral);
  const ordinaryBonus = nonNegative(input.ordinaryBonus);
  const productivityBonus = nonNegative(input.productivityBonus);
  const employeeContribution = nonNegative(input.employeePensionContribution);
  const employerContribution = nonNegative(input.employerPensionContribution);
  const priceIndex = positiveFactor(input.priceIndex);
  const calendarYear = Number.isFinite(input.calendarYear) ? input.calendarYear : rules.referenceYear;
  const irpefFactor = irpefIndexFactor(rules, priceIndex);

  // 1. INPS on the whole gross (RAL + bonuses), with the additional 1% and the ceiling.
  const gross = ral + ordinaryBonus + productivityBonus;
  const inps = employeeInps(gross, rules, priceIndex);

  // 3. Productivity bonus: the cap is measured on the bonus NET of its employee INPS (circ. AdE 28/E/2016), so the
  //    gross part within the cap (if eligible) is min(bonus, cap / (1 − INPS share)); it pays the substitute tax on
  //    (that part − its INPS) ≤ cap. The excess (or the whole bonus if ineligible) joins ordinary income.
  const regime = productivityBonusRegime(rules, calendarYear);
  const inpsShare = gross > 0 ? inps / gross : 0;
  const capGross = inpsShare < 1 ? regime.cap / (1 - inpsShare) : Infinity;
  const bonusWithinCap = productivityBonusEligible(input.priorYearIncome, rules) ? Math.min(productivityBonus, capGross) : 0;
  const bonusExcess = productivityBonus - bonusWithinCap;
  const inpsOnBonusWithinCap = bonusWithinCap * inpsShare;
  const productivityBonusTax = (Math.max(0, bonusWithinCap - inpsOnBonusWithinCap) * regime.ratePct) / 100;

  // 2. Pension contributions: one cap for employee + employer; employer excess is taxable income.
  const cap = nonNegative(rules.pensionFund.deductionCap);
  const employerExcessTaxable = Math.max(0, employerContribution - cap);
  const ordinaryIncomeAfterInps = ral + ordinaryBonus + bonusExcess - (inps - inpsOnBonusWithinCap);
  const deductiblePension = Math.min(
    employeeContribution,
    Math.max(0, cap - employerContribution),
    Math.max(0, ordinaryIncomeAfterInps + employerExcessTaxable),
  );
  const nonDeductiblePension = employeeContribution - deductiblePension;

  // 4. Reddito di lavoro dipendente = reddito complessivo (no other income).
  const taxableIncome = Math.max(0, ordinaryIncomeAfterInps - deductiblePension + employerExcessTaxable);

  // 5-7. IRPEF, deductions, surcharges, tax-free sums.
  const tax = employmentIncomeTax(taxableIncome, rules, irpefFactor);
  const surchargesTotal = tax.regionalSurcharge + tax.municipalSurcharge;

  // 8. Cash take-home (employee pension contributions are withheld; employer contributions never pass through).
  const netIncome =
    gross -
    inps -
    tax.irpefNet -
    surchargesTotal -
    productivityBonusTax -
    employeeContribution +
    tax.cuneoExemptSum +
    tax.supplementaryTreatment;

  // 9. Tax saving of the deductible contributions (recomputed with deductibleEmployee = 0, employer excess unchanged)
  //    and marginal rate by finite difference on ordinary taxable income.
  let pensionTaxSaving = 0;
  let marginalRatePct = 0;
  if (options.derived !== false) {
    if (deductiblePension > 0) {
      const withoutDeduction = employmentIncomeTax(taxableIncome + deductiblePension, rules, irpefFactor);
      pensionTaxSaving = withoutDeduction.netBurden - tax.netBurden;
    }
    const plusStep = employmentIncomeTax(taxableIncome + MARGINAL_STEP_EUR, rules, irpefFactor);
    marginalRatePct = ((plusStep.netBurden - tax.netBurden) / MARGINAL_STEP_EUR) * 100;
  }
  const averageRatePct = gross > 0 ? ((tax.irpefNet + surchargesTotal) / gross) * 100 : 0;

  return {
    gross,
    inps,
    deductiblePension,
    nonDeductiblePension,
    employerExcessTaxable,
    taxableIncome,
    irpefGross: tax.irpefGross,
    employeeDeduction: tax.employeeDeduction,
    cuneoExtraDeduction: tax.cuneoExtraDeduction,
    irpefNet: tax.irpefNet,
    regionalSurcharge: tax.regionalSurcharge,
    municipalSurcharge: tax.municipalSurcharge,
    cuneoExemptSum: tax.cuneoExemptSum,
    supplementaryTreatment: tax.supplementaryTreatment,
    productivityBonusTax,
    netIncome,
    pensionTaxSaving,
    marginalRatePct,
    averageRatePct,
  };
}
