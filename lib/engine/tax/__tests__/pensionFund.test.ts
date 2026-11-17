import { describe, expect, it } from 'vitest';
import { exitTaxRatePct, yieldTaxRatePct } from '../pensionFund';
import { IT_2026 } from '../../rules/it2026';

describe('pension fund taxation', () => {
  it('exit tax: 15% up to 15 years, −0.3 pp per extra year, floor 9%', () => {
    expect(exitTaxRatePct(0, IT_2026)).toBe(15);
    expect(exitTaxRatePct(15, IT_2026)).toBe(15);
    expect(exitTaxRatePct(16, IT_2026)).toBeCloseTo(14.7, 10);
    expect(exitTaxRatePct(20, IT_2026)).toBeCloseTo(13.5, 10); // 15 − 0.3 × 5
    expect(exitTaxRatePct(35, IT_2026)).toBeCloseTo(9, 10); // 15 − 0.3 × 20
    expect(exitTaxRatePct(40, IT_2026)).toBe(9);
    expect(exitTaxRatePct(20.9, IT_2026)).toBeCloseTo(13.5, 10); // only full years count
    expect(exitTaxRatePct(-3, IT_2026)).toBe(15);
  });

  it('yield tax: 20% blended with 12.5% on the government-bond share', () => {
    expect(yieldTaxRatePct(0, IT_2026)).toBe(20);
    expect(yieldTaxRatePct(40, IT_2026)).toBeCloseTo(17, 10); // 20 − 7.5 × 0.4
    expect(yieldTaxRatePct(100, IT_2026)).toBeCloseTo(12.5, 10);
    expect(yieldTaxRatePct(150, IT_2026)).toBeCloseTo(12.5, 10); // share clamped to 100
    expect(yieldTaxRatePct(-10, IT_2026)).toBe(20);
  });
});
