import { describe, expect, it } from 'vitest';
import {
  cuneoExemptSum,
  cuneoExtraDeduction,
  employeeDeduction,
  irpefGross,
  irpefIndexFactor,
  pensionerDeduction,
  supplementaryTreatment,
  surcharges,
} from '../irpef';
import { cloneRules, IT_2026 } from '../../rules/it2026';

describe('irpefGross (23% ≤ 28,000 / 33% ≤ 50,000 / 43%)', () => {
  it('bracket boundaries', () => {
    expect(irpefGross(0, IT_2026)).toBe(0);
    expect(irpefGross(28000, IT_2026)).toBeCloseTo(6440, 6); // 28,000 × 23%
    expect(irpefGross(50000, IT_2026)).toBeCloseTo(13700, 6); // 6,440 + 22,000 × 33% = 7,260
    expect(irpefGross(100000, IT_2026)).toBeCloseTo(35200, 6); // 13,700 + 50,000 × 43% = 21,500
  });

  it('indexFactor scales the bracket limits', () => {
    expect(irpefGross(56000, IT_2026, 2)).toBeCloseTo(12880, 6); // first bracket up to 56,000 → 56,000 × 23%
    expect(irpefIndexFactor(IT_2026, 1.5)).toBe(1); // brackets not indexed by default
    const indexed = cloneRules();
    indexed.irpef.indexToInflation = true;
    expect(irpefIndexFactor(indexed, 1.5)).toBe(1.5);
  });

  it('negative / NaN income is 0', () => {
    expect(irpefGross(-5000, IT_2026)).toBe(0);
    expect(irpefGross(Number.NaN, IT_2026)).toBe(0);
  });
});

describe('employeeDeduction (art. 13 c.1, c.1.1 TUIR)', () => {
  it('bands and the +65 € bonus for 25,000 < RC ≤ 35,000', () => {
    expect(employeeDeduction(10000, IT_2026)).toBe(1955);
    expect(employeeDeduction(15000, IT_2026)).toBe(1955);
    expect(employeeDeduction(28000, IT_2026)).toBe(1975); // 1,910 + 1,190 × 0 + 65 (25k < RC ≤ 35k)
    expect(employeeDeduction(25000, IT_2026)).toBeCloseTo(2184.6154, 3); // 1,910 + 1,190 × 3,000/13,000, no bonus
    expect(employeeDeduction(25001, IT_2026)).toBeCloseTo(2249.5238, 3); // 1,910 + 1,190 × 2,999/13,000 + 65
    expect(employeeDeduction(35000, IT_2026)).toBeCloseTo(1367.2727, 3); // 1,910 × 15,000/22,000 + 65
    expect(employeeDeduction(35001, IT_2026)).toBeCloseTo(1302.1859, 3); // 1,910 × 14,999/22,000
    expect(employeeDeduction(50000, IT_2026)).toBe(0);
    expect(employeeDeduction(80000, IT_2026)).toBe(0);
  });
});

describe('pensionerDeduction (art. 13 c.3, c.4 TUIR)', () => {
  it('bands and the +50 € bonus for 25,000 < RC ≤ 29,000', () => {
    expect(pensionerDeduction(8500, IT_2026)).toBe(1955);
    expect(pensionerDeduction(20000, IT_2026)).toBeCloseTo(1214.8718, 3); // 700 + 1,255 × 8,000/19,500
    expect(pensionerDeduction(27000, IT_2026)).toBeCloseTo(814.359, 3); // 700 + 1,255 × 1,000/19,500 + 50
    expect(pensionerDeduction(29000, IT_2026)).toBeCloseTo(718.1818, 3); // 700 × 21,000/22,000 + 50
    expect(pensionerDeduction(30000, IT_2026)).toBeCloseTo(636.3636, 3); // 700 × 20,000/22,000
    expect(pensionerDeduction(50000, IT_2026)).toBe(0);
  });
});

describe('cuneo fiscale (L. 207/2024 c.4-6)', () => {
  it('extra deduction: 1,000 € in (20k, 32k], tapering to 0 at 40k', () => {
    expect(cuneoExtraDeduction(20000, IT_2026)).toBe(0);
    expect(cuneoExtraDeduction(20001, IT_2026)).toBe(1000);
    expect(cuneoExtraDeduction(32000, IT_2026)).toBe(1000);
    expect(cuneoExtraDeduction(36000, IT_2026)).toBeCloseTo(500, 6); // 1,000 × 4,000/8,000
    expect(cuneoExtraDeduction(40000, IT_2026)).toBe(0);
  });

  it('tax-free sum: 7.1% / 5.3% / 4.8% of the whole employment income, 0 above 20,000', () => {
    expect(cuneoExemptSum(8500, IT_2026)).toBeCloseTo(603.5, 6); // 8,500 × 7.1%
    expect(cuneoExemptSum(8501, IT_2026)).toBeCloseTo(450.553, 6); // 8,501 × 5.3%
    expect(cuneoExemptSum(20000, IT_2026)).toBeCloseTo(960, 6); // 20,000 × 4.8%
    expect(cuneoExemptSum(20001, IT_2026)).toBe(0);
    expect(cuneoExemptSum(0, IT_2026)).toBe(0);
  });
});

describe('surcharges', () => {
  it('default: 1.23% regional + 0.8% municipal', () => {
    const s = surcharges(30000, IT_2026);
    expect(s.regional).toBeCloseTo(369, 6); // 30,000 × 1.23%
    expect(s.municipal).toBeCloseTo(240, 6); // 30,000 × 0.8%
  });

  it('progressive regional bands and municipal exemption threshold', () => {
    const rules = cloneRules();
    rules.irpef.regionalSurchargeBands = [
      { upTo: 15000, ratePct: 1.23 },
      { upTo: 28000, ratePct: 1.58 },
      { upTo: 50000, ratePct: 1.72 },
      { upTo: null, ratePct: 1.73 },
    ];
    rules.irpef.municipalExemptionThreshold = 10000;
    // 15,000 × 1.23% = 184.5 + 13,000 × 1.58% = 205.4 + 22,000 × 1.72% = 378.4 + 10,000 × 1.73% = 173
    expect(surcharges(60000, rules).regional).toBeCloseTo(941.3, 6);
    expect(surcharges(10000, rules).municipal).toBe(0); // ≤ threshold: exempt
    expect(surcharges(10001, rules).municipal).toBeCloseTo(80.008, 6); // above: on the whole income
  });
});

describe('supplementaryTreatment (trattamento integrativo)', () => {
  it('1,200 € only when RC ≤ 15,000 and gross IRPEF > 1,955 − 75', () => {
    expect(supplementaryTreatment(10000, 2300, IT_2026)).toBe(1200);
    expect(supplementaryTreatment(8000, 1840, IT_2026)).toBe(0); // 1,840 ≤ 1,880
    expect(supplementaryTreatment(15001, 3450.23, IT_2026)).toBe(0);
    const rules = cloneRules();
    delete rules.irpef.supplementaryTreatment;
    expect(supplementaryTreatment(10000, 2300, rules)).toBe(0); // rule absent → not modelled
  });
});
