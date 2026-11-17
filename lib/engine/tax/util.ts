import type { RateBand } from '../types';

/**
 * Internal numeric guards for the tax modules (not part of the public engine API).
 *
 * The tax functions never return NaN: negative or non-finite money inputs are treated as 0, non-finite or
 * non-positive index factors as 1. Plan validation (validatePlan) is responsible for telling the user about bad
 * inputs; these guards only keep the arithmetic well defined.
 */

/** Money amount: finite and > 0, else 0. */
export function nonNegative(x: number): number {
  return Number.isFinite(x) && x > 0 ? x : 0;
}

/** Any finite number (rule values, rates), else 0. */
export function finite(x: number): number {
  return Number.isFinite(x) ? x : 0;
}

/** Index factor / price index: finite and > 0, else 1 (= not indexed). */
export function positiveFactor(x: number): number {
  return Number.isFinite(x) && x > 0 ? x : 1;
}

/** Upper bound of a band in nominal € after indexing; null or non-finite = unbounded. */
export function bandUpper(band: RateBand, indexFactor: number): number {
  return band.upTo === null || !Number.isFinite(band.upTo) ? Infinity : band.upTo * indexFactor;
}

/**
 * Progressive tax over bands (IRPEF brackets, regional surcharge bands): each band's rate applies to the part of
 * `amount` between the previous band's upper bound and its own. Bands must be in ascending order; a band whose
 * upper bound is not above the previous one taxes nothing.
 */
export function progressiveTax(amount: number, bands: RateBand[], indexFactor: number): number {
  const income = nonNegative(amount);
  let lower = 0;
  let tax = 0;
  for (const band of bands) {
    const upper = bandUpper(band, indexFactor);
    if (upper > lower) {
      const slice = Math.min(income, upper) - lower;
      if (slice > 0) tax += (slice * finite(band.ratePct)) / 100;
      lower = upper;
    }
    if (income <= lower) break;
  }
  return tax;
}

/** Linear interpolation helper: amount × (to − x) / (to − from), guarded against a zero-width interval. */
export function taper(amount: number, x: number, from: number, to: number): number {
  const width = to - from;
  if (!(width > 0)) return 0;
  return (amount * (to - x)) / width;
}
