import { describe, expect, it } from 'vitest';
import { netPensionIncome } from '../pensionIncome';
import { IT_2026 } from '../../rules/it2026';

describe('netPensionIncome (pensioner deduction + surcharges)', () => {
  it('gross 20,000', () => {
    const p = netPensionIncome(20000, IT_2026);
    // IRPEF 20,000 × 23% = 4,600 − (700 + 1,255 × 8,000/19,500 = 1,214.8718) = 3,385.1282
    expect(p.irpef).toBeCloseTo(3385.1282, 3);
    expect(p.surcharges).toBeCloseTo(406, 6); // 20,000 × (1.23% + 0.8%)
    expect(p.net).toBeCloseTo(16208.8718, 3); // 20,000 − 3,385.1282 − 406
    expect(p.gross).toBe(20000);
  });

  it('gross 30,000', () => {
    const p = netPensionIncome(30000, IT_2026);
    // IRPEF 6,440 + 2,000 × 33% = 7,100 − 700 × 20,000/22,000 (636.3636) = 6,463.6364 (no +50: RC > 29,000)
    expect(p.irpef).toBeCloseTo(6463.6364, 3);
    expect(p.surcharges).toBeCloseTo(609, 6); // 30,000 × 2.03%
    expect(p.net).toBeCloseTo(22927.3636, 3);
  });

  it('gross 27,000 gets the +50 € band', () => {
    const p = netPensionIncome(27000, IT_2026);
    // 27,000 × 23% = 6,210 − (700 + 1,255 × 1,000/19,500 + 50 = 814.359) = 5,395.641
    expect(p.irpef).toBeCloseTo(5395.641, 3);
    expect(p.net).toBeCloseTo(21056.259, 3); // 27,000 − 5,395.641 − 548.1
  });

  it('no-tax area: no IRPEF and therefore no surcharges', () => {
    const p = netPensionIncome(8000, IT_2026); // 1,840 gross IRPEF < 1,955 deduction
    expect(p.irpef).toBe(0);
    expect(p.surcharges).toBe(0);
    expect(p.net).toBe(8000);
  });

  it('indexFactor scales thresholds; negative / NaN input is 0', () => {
    const base = netPensionIncome(20000, IT_2026);
    const doubled = netPensionIncome(40000, IT_2026, 2);
    expect(doubled.irpef).toBeCloseTo(2 * base.irpef, 6);
    expect(doubled.net).toBeCloseTo(2 * base.net, 6);
    expect(netPensionIncome(-100, IT_2026)).toEqual({ gross: 0, irpef: 0, surcharges: 0, net: 0 });
    expect(netPensionIncome(Number.NaN, IT_2026).net).toBe(0);
  });
});
