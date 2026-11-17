import { describe, expect, it } from 'vitest';
import { tfrQuota, tfrRevaluationRatePct, tfrSeparateTaxRatePct } from '../tfr';
import { IT_2026 } from '../../rules/it2026';

describe('TFR', () => {
  it('quota = RAL/13.5 − 0.5% RAL (≈ 6.907% of RAL)', () => {
    expect(tfrQuota(30000, IT_2026)).toBeCloseTo(2072.22, 2); // 2,222.2222 − 150
    expect(tfrQuota(100000, IT_2026)).toBeCloseTo(6907.41, 2); // 7,407.4074 − 500
    expect(tfrQuota(-1, IT_2026)).toBe(0);
  });

  it('revaluation rate = 1.5% + 75% of inflation (no negative variable part)', () => {
    expect(tfrRevaluationRatePct(2, IT_2026)).toBeCloseTo(3.0, 10); // 1.5 + 0.75 × 2
    expect(tfrRevaluationRatePct(0, IT_2026)).toBeCloseTo(1.5, 10);
    expect(tfrRevaluationRatePct(-1, IT_2026)).toBeCloseTo(1.5, 10); // index decrease → fixed part only
  });

  it('separate taxation rate = average IRPEF rate on principal/years × 12', () => {
    // reference income 50,000 / 10 × 12 = 60,000 → 6,440 + 7,260 + 10,000 × 43% = 18,000 → 30%
    expect(tfrSeparateTaxRatePct(50000, 10, IT_2026)).toBeCloseTo(30, 10);
    // years = 0 → reference income = principal: 20,000 × 23% → 23%
    expect(tfrSeparateTaxRatePct(20000, 0, IT_2026)).toBeCloseTo(23, 10);
    expect(tfrSeparateTaxRatePct(0, 10, IT_2026)).toBe(0);
    // indexFactor 2: reference 60,000 entirely within the doubled first two brackets: 56,000 × 23% + 4,000 × 33%
    expect(tfrSeparateTaxRatePct(50000, 10, IT_2026, 2)).toBeCloseTo((12880 + 1320) / 600, 10); // 23.6667%
  });
});
