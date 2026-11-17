/**
 * Personal portfolio mechanics (docs/SPEC.md §5.6–5.7). Pure helpers on Float64Arrays indexed like
 * plan.portfolio.assets; they never allocate in the hot path except where noted.
 *
 * Timing (mid-year convention): flows of year t happen at mid-year, when asset i is worth mid_i = V_i·sqrt(G_i)
 * (V_i = start-of-year value, G_i = (1 + r_i)(1 − ter_i)). Buying b_i and selling s_i gives
 * end_i = (mid_i + b_i − s_i)·sqrt(G_i) = V_i·G_i + (b_i − s_i)·sqrt(G_i), the formula of §5.7.
 * Sales realise the gain at the mid-year price: gainFraction_i = max(0, 1 − basis_i / mid_i) and the cost basis is
 * reduced by the fraction of the position sold (basis_i · s_i / mid_i). ETF losses are not offsettable, so a sale
 * at a loss pays no tax and never creates a credit.
 */

export type FlowMode = 'flows' | 'annual';

/** Σ max(0, value − basis) · taxRate (taxRate as a decimal). */
export function latentTax(values: ArrayLike<number>, basis: ArrayLike<number>, taxRates: ArrayLike<number>): number {
  let tax = 0;
  for (let i = 0; i < values.length; i++) {
    const gain = values[i] - basis[i];
    if (gain > 0) tax += gain * taxRates[i];
  }
  return tax;
}

function sum(values: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return s;
}

/**
 * Splits a purchase of `amount` across assets (writes `out`).
 * - 'annual': at target weights.
 * - 'flows': underweight assets first: deficits against the target weights of the portfolio AFTER the purchase,
 *   amount split in proportion to the deficits (Σ deficits ≥ amount always holds).
 */
export function allocateBuys(mid: ArrayLike<number>, weights: ArrayLike<number>, amount: number, mode: FlowMode, out: Float64Array): void {
  const n = mid.length;
  out.fill(0);
  if (!(amount > 0)) return;
  if (mode === 'annual') {
    for (let i = 0; i < n; i++) out[i] = amount * weights[i];
    return;
  }
  const totalAfter = sum(mid) + amount;
  let deficits = 0;
  for (let i = 0; i < n; i++) deficits += Math.max(0, weights[i] * totalAfter - mid[i]);
  if (!(deficits > 0)) {
    for (let i = 0; i < n; i++) out[i] = amount * weights[i];
    return;
  }
  for (let i = 0; i < n; i++) out[i] = (amount * Math.max(0, weights[i] * totalAfter - mid[i])) / deficits;
}

/** Shares of a gross sale S per asset: pro rata ('annual') or overweight first ('flows'). Writes `out` (sums to S). */
function saleSplit(mid: ArrayLike<number>, weights: ArrayLike<number>, total: number, gross: number, mode: FlowMode, out: Float64Array): void {
  const n = mid.length;
  if (mode === 'annual' || !(gross < total)) {
    const f = total > 0 ? Math.min(1, gross / total) : 0;
    for (let i = 0; i < n; i++) out[i] = mid[i] * f;
    return;
  }
  const after = total - gross;
  let excess = 0;
  for (let i = 0; i < n; i++) excess += Math.max(0, mid[i] - weights[i] * after);
  if (!(excess > 0)) {
    for (let i = 0; i < n; i++) out[i] = (mid[i] * gross) / total;
    return;
  }
  for (let i = 0; i < n; i++) out[i] = (gross * Math.max(0, mid[i] - weights[i] * after)) / excess;
}

export interface SaleResult {
  /** Gross amount sold (Σ out). */
  gross: number;
  /** Capital-gains tax due on the sale. */
  tax: number;
}

/**
 * Sells enough to receive `need` net of capital-gains tax (gross-up, SPEC §5.6): gross = need / (1 − Σ s_i·τ_i / S)
 * with τ_i = gainFraction_i · tax_i, solved by fixed-point iteration (the split depends on S in 'flows' mode).
 * If the portfolio cannot cover `need`, everything is sold. Writes the per-asset sales into `out`.
 * `gainTax` (decimal per asset) = gainFraction_i · taxRate_i at the mid-year price.
 */
export function sellForNet(
  mid: ArrayLike<number>,
  gainTax: ArrayLike<number>,
  weights: ArrayLike<number>,
  need: number,
  mode: FlowMode,
  out: Float64Array,
): SaleResult {
  const n = mid.length;
  out.fill(0);
  if (!(need > 0)) return { gross: 0, tax: 0 };
  const total = sum(mid);
  if (!(total > 0)) return { gross: 0, tax: 0 };

  let maxTax = 0;
  for (let i = 0; i < n; i++) maxTax += mid[i] * gainTax[i];
  if (need >= total - maxTax) {
    for (let i = 0; i < n; i++) out[i] = mid[i];
    return { gross: total, tax: maxTax };
  }

  let gross = need;
  let tax = 0;
  for (let iter = 0; iter < 30; iter++) {
    saleSplit(mid, weights, total, gross, mode, out);
    tax = 0;
    for (let i = 0; i < n; i++) tax += out[i] * gainTax[i];
    const rate = gross > 0 ? tax / gross : 0;
    const next = Math.min(total, need / (1 - rate));
    if (Math.abs(next - gross) <= 1e-9 * Math.max(1, need)) {
      gross = next;
      break;
    }
    gross = next;
  }
  saleSplit(mid, weights, total, gross, mode, out);
  tax = 0;
  for (let i = 0; i < n; i++) tax += out[i] * gainTax[i];
  return { gross, tax };
}

/**
 * Annual rebalancing at year end ('annual' mode, SPEC §5.7): sells overweight assets, pays the gains tax from the
 * proceeds and buys underweight assets with the rest, so that the portfolio ends at the target weights of
 * (total − tax). Mutates `values` and `basis`; returns the tax paid. `taxRates` are decimals.
 */
export function rebalanceAnnual(values: Float64Array, basis: Float64Array, taxRates: ArrayLike<number>, weights: ArrayLike<number>): number {
  const n = values.length;
  const total = sum(values);
  if (!(total > 0)) return 0;
  const gainTax = new Float64Array(n);
  for (let i = 0; i < n; i++) gainTax[i] = values[i] > 0 ? Math.max(0, 1 - basis[i] / values[i]) * taxRates[i] : 0;

  let tax = 0;
  for (let iter = 0; iter < 20; iter++) {
    const target = total - tax;
    let next = 0;
    for (let i = 0; i < n; i++) next += Math.max(0, values[i] - weights[i] * target) * gainTax[i];
    if (Math.abs(next - tax) <= 1e-10 * Math.max(1, total)) {
      tax = next;
      break;
    }
    tax = next;
  }
  const target = total - tax;
  const sells = new Float64Array(n);
  let sold = 0;
  let paid = 0;
  let deficits = 0;
  for (let i = 0; i < n; i++) {
    sells[i] = Math.max(0, values[i] - weights[i] * target);
    sold += sells[i];
    paid += sells[i] * gainTax[i];
    deficits += Math.max(0, weights[i] * target - values[i]);
  }
  if (!(sold > 0)) return 0;
  const proceeds = sold - paid;
  for (let i = 0; i < n; i++) {
    const buy = deficits > 0 ? (proceeds * Math.max(0, weights[i] * target - values[i])) / deficits : proceeds * weights[i];
    if (sells[i] > 0 && values[i] > 0) basis[i] -= (basis[i] * sells[i]) / values[i];
    basis[i] += buy;
    values[i] += buy - sells[i];
  }
  return paid;
}
