import { describe, expect, it } from 'vitest';
import { computePayroll, deductiblePensionRoom, employeeInps } from '../payroll';
import { cloneRules, IT_2026 } from '../../rules/it2026';
import type { PayrollBreakdown, PayrollInput } from '../../types';

/*
 * Golden values computed by hand with the 2026 defaults (IT_2026):
 *   INPS 9.19% (+1% above 56,224, ceiling 122,295); IRPEF 23% ≤ 28,000, 33% ≤ 50,000, 43% above;
 *   employee deduction art. 13 c.1 TUIR (+65 € for 25,000 < RC ≤ 35,000); cuneo L. 207/2024;
 *   regional surcharge 1.23% flat, municipal 0.8% flat; productivity bonus 1% up to 5,000 € in 2026-27.
 * Every expected number below shows its arithmetic; the tests never re-implement the formula.
 */

function payroll(overrides: Partial<PayrollInput> = {}, rules = IT_2026): PayrollBreakdown {
  return computePayroll(
    {
      ral: 0,
      ordinaryBonus: 0,
      productivityBonus: 0,
      priorYearIncome: 0,
      employeePensionContribution: 0,
      employerPensionContribution: 0,
      calendarYear: 2026,
      priceIndex: 1,
      ...overrides,
    },
    rules,
  );
}

const MONEY_FIELDS = [
  'gross',
  'inps',
  'deductiblePension',
  'nonDeductiblePension',
  'employerExcessTaxable',
  'taxableIncome',
  'irpefGross',
  'employeeDeduction',
  'cuneoExtraDeduction',
  'irpefNet',
  'regionalSurcharge',
  'municipalSurcharge',
  'cuneoExemptSum',
  'productivityBonusTax',
  'netIncome',
  'pensionTaxSaving',
] as const;

describe('computePayroll — RAL golden cases (2026, no pension fund)', () => {
  it('RAL 35,000', () => {
    const p = payroll({ ral: 35000, priorYearIncome: 35000 });
    expect(p.gross).toBe(35000);
    expect(p.inps).toBeCloseTo(3216.5, 2); // 35,000 × 9.19%
    expect(p.taxableIncome).toBeCloseTo(31783.5, 2); // 35,000 − 3,216.50
    expect(p.irpefGross).toBeCloseTo(7688.555, 3); // 28,000 × 23% = 6,440 + 3,783.50 × 33% = 1,248.555 → 7,688.555
    // 1,910 × (50,000 − 31,783.50) / 22,000 = 1,581.5234 (the brief rounded it to 1,581.50) + 65 = 1,646.5234
    expect(p.employeeDeduction).toBeCloseTo(1646.52, 2);
    expect(p.cuneoExtraDeduction).toBe(1000); // 20,000 < RC ≤ 32,000
    expect(p.irpefNet).toBeCloseTo(5042.03, 2); // 7,688.555 − 1,646.5234 − 1,000 = 5,042.0316
    expect(p.regionalSurcharge).toBeCloseTo(390.94, 2); // 31,783.50 × 1.23% = 390.93705
    expect(p.municipalSurcharge).toBeCloseTo(254.27, 2); // 31,783.50 × 0.8% = 254.268
    expect(p.cuneoExemptSum).toBe(0);
    expect(p.supplementaryTreatment).toBe(0);
    // Net without surcharges: 35,000 − 3,216.50 − 5,042.0316 = 26,741.4684 (brief: 26,741.44 from its rounded deduction)
    expect(p.netIncome + p.regionalSurcharge + p.municipalSurcharge).toBeCloseTo(26741.47, 2);
    expect(p.netIncome).toBeCloseTo(26096.26, 2); // 26,741.4684 − 390.93705 − 254.268 = 26,096.26335
    // (5,042.0316 + 645.20505) / 35,000 = 16.2492%
    expect(p.averageRatePct).toBeCloseTo(16.2492, 3);
    // +100 € of RC stays in (28k, 32k]: 33 IRPEF + 1,910/22,000·100 = 8.6818 lost deduction + 2.03 surcharges
    expect(p.marginalRatePct).toBeCloseTo(43.7118, 3);
    expect(p.pensionTaxSaving).toBe(0);
  });

  it('RAL 48,000', () => {
    const p = payroll({ ral: 48000 });
    expect(p.inps).toBeCloseTo(4411.2, 2); // 48,000 × 9.19%
    expect(p.taxableIncome).toBeCloseTo(43588.8, 2); // 48,000 − 4,411.20
    expect(p.irpefGross).toBeCloseTo(11584.304, 3); // 6,440 + (43,588.80 − 28,000) × 33% = 6,440 + 5,144.304
    expect(p.employeeDeduction).toBeCloseTo(556.6087, 3); // 1,910 × 6,411.20 / 22,000; no +65 (RC > 35,000)
    expect(p.cuneoExtraDeduction).toBe(0); // RC > 40,000
    expect(p.irpefNet).toBeCloseTo(11027.6953, 3); // 11,584.304 − 556.6087
    expect(p.regionalSurcharge).toBeCloseTo(536.1422, 3); // 43,588.80 × 1.23%
    expect(p.municipalSurcharge).toBeCloseTo(348.7104, 3); // 43,588.80 × 0.8%
    // 48,000 − 4,411.20 − 11,027.6953 − 536.1422 − 348.7104 = 31,676.2521
    expect(p.netIncome).toBeCloseTo(31676.25, 2);
  });

  it('RAL 60,000 (INPS 1% above 56,224)', () => {
    const p = payroll({ ral: 60000 });
    expect(p.inps).toBeCloseTo(5551.76, 2); // 60,000 × 9.19% = 5,514 + (60,000 − 56,224) × 1% = 37.76
    expect(p.taxableIncome).toBeCloseTo(54448.24, 2);
    expect(p.irpefGross).toBeCloseTo(15612.7432, 3); // 6,440 + 7,260 + 4,448.24 × 43% = 1,912.7432
    expect(p.employeeDeduction).toBe(0); // RC > 50,000
    expect(p.cuneoExtraDeduction).toBe(0);
    expect(p.irpefNet).toBeCloseTo(15612.7432, 3);
    expect(p.regionalSurcharge).toBeCloseTo(669.7134, 3); // 54,448.24 × 1.23%
    expect(p.municipalSurcharge).toBeCloseTo(435.5859, 3); // 54,448.24 × 0.8%
    // 54,448.24 − 15,612.7432 − 669.7134 − 435.5859 = 37,730.1975
    expect(p.netIncome).toBeCloseTo(37730.2, 2);
    expect(p.marginalRatePct).toBeCloseTo(45.03, 6); // 43 + 1.23 + 0.8 (no deductions left to lose)
  });

  it('RAL 70,000 (INPS 1% above 56,224)', () => {
    const p = payroll({ ral: 70000 });
    expect(p.inps).toBeCloseTo(6570.76, 2); // 70,000 × 9.19% = 6,433 + (70,000 − 56,224) × 1% = 137.76
    expect(p.taxableIncome).toBeCloseTo(63429.24, 2);
    expect(p.irpefGross).toBeCloseTo(19474.5732, 3); // 6,440 + 7,260 + 13,429.24 × 43% = 5,774.5732
    expect(p.irpefNet).toBeCloseTo(19474.5732, 3);
    expect(p.regionalSurcharge).toBeCloseTo(780.1797, 3); // 63,429.24 × 1.23%
    expect(p.municipalSurcharge).toBeCloseTo(507.4339, 3); // 63,429.24 × 0.8%
    // 63,429.24 − 19,474.5732 − 780.1797 − 507.4339 = 42,667.0532
    expect(p.netIncome).toBeCloseTo(42667.05, 2);
  });

  it('RAL 130,000: INPS stops at the 122,295 ceiling', () => {
    const p = payroll({ ral: 130000 });
    // 122,295 × 9.19% = 11,238.9105 + (122,295 − 56,224) × 1% = 660.71 → 11,899.6205
    expect(p.inps).toBeCloseTo(11899.6205, 3);
    expect(p.taxableIncome).toBeCloseTo(118100.3795, 3); // 130,000 − 11,899.6205
  });

  it('RAL 18,000: cuneo tax-free sum 4.8% of employment income added to net', () => {
    const p = payroll({ ral: 18000 });
    expect(p.inps).toBeCloseTo(1654.2, 2); // 18,000 × 9.19%
    expect(p.taxableIncome).toBeCloseTo(16345.8, 2);
    expect(p.irpefGross).toBeCloseTo(3759.534, 3); // 16,345.80 × 23%
    // 1,910 + 1,190 × (28,000 − 16,345.80) / 13,000 = 1,910 + 1,066.8075 = 2,976.8075
    expect(p.employeeDeduction).toBeCloseTo(2976.8075, 3);
    expect(p.cuneoExtraDeduction).toBe(0); // RC ≤ 20,000
    expect(p.irpefNet).toBeCloseTo(782.7265, 3); // 3,759.534 − 2,976.8075
    expect(p.regionalSurcharge).toBeCloseTo(201.0533, 3); // 16,345.80 × 1.23%
    expect(p.municipalSurcharge).toBeCloseTo(130.7664, 3); // 16,345.80 × 0.8%
    expect(p.cuneoExemptSum).toBeCloseTo(784.5984, 3); // 16,345.80 × 4.8% (15,000 < RLD ≤ 20,000)
    expect(p.supplementaryTreatment).toBe(0); // RC > 15,000
    // 18,000 − 1,654.20 − 782.7265 − 201.0533 − 130.7664 + 784.5984 = 16,015.8522
    expect(p.netIncome).toBeCloseTo(16015.85, 2);
    // +100 € RC: 23 IRPEF + 1,190/13,000·100 = 9.1538 lost deduction + 2.03 surcharges − 4.8 more tax-free sum
    expect(p.marginalRatePct).toBeCloseTo(29.3838, 3);
  });

  it('RAL 12,000: trattamento integrativo 1,200 € (RC ≤ 15,000, gross IRPEF > 1,955 − 75)', () => {
    const p = payroll({ ral: 12000 });
    expect(p.taxableIncome).toBeCloseTo(10897.2, 2); // 12,000 − 1,102.80
    expect(p.irpefGross).toBeCloseTo(2506.356, 3); // 10,897.20 × 23% > 1,880
    expect(p.employeeDeduction).toBe(1955);
    expect(p.irpefNet).toBeCloseTo(551.356, 3);
    expect(p.supplementaryTreatment).toBe(1200);
    expect(p.cuneoExemptSum).toBeCloseTo(577.5516, 3); // 10,897.20 × 5.3%
    // 12,000 − 1,102.80 − 551.356 − 10,897.20 × 2.03% (221.21316) + 577.5516 + 1,200 = 11,902.18244
    expect(p.netIncome).toBeCloseTo(11902.18, 2);
  });

  it('RAL 9,000: no-tax area → no surcharges, no integrativo (gross 1,879.77 ≤ 1,880), 7.1% tax-free sum', () => {
    const p = payroll({ ral: 9000 });
    expect(p.taxableIncome).toBeCloseTo(8172.9, 2); // 9,000 − 827.10
    expect(p.irpefGross).toBeCloseTo(1879.767, 3);
    expect(p.employeeDeduction).toBeCloseTo(1879.767, 3); // used deduction capped at the gross tax
    expect(p.irpefNet).toBe(0);
    expect(p.regionalSurcharge).toBe(0); // surcharges are due only if net IRPEF is due
    expect(p.municipalSurcharge).toBe(0);
    expect(p.supplementaryTreatment).toBe(0);
    expect(p.cuneoExemptSum).toBeCloseTo(580.2759, 3); // 8,172.90 × 7.1%
    expect(p.netIncome).toBeCloseTo(8753.1759, 3); // 9,000 − 827.10 + 580.2759
  });
});

describe('computePayroll — pension fund contributions', () => {
  it('employee 2% + employer 2% of 40,000: fully deductible (800 + 800 ≤ 5,300)', () => {
    const p = payroll({ ral: 40000, employeePensionContribution: 800, employerPensionContribution: 800 });
    expect(p.inps).toBeCloseTo(3676, 2); // 40,000 × 9.19%
    expect(p.deductiblePension).toBe(800);
    expect(p.nonDeductiblePension).toBe(0);
    expect(p.employerExcessTaxable).toBe(0);
    expect(p.taxableIncome).toBeCloseTo(35524, 2); // 40,000 − 3,676 − 800
    expect(p.irpefGross).toBeCloseTo(8922.92, 2); // 6,440 + 7,524 × 33% = 2,482.92
    expect(p.employeeDeduction).toBeCloseTo(1256.78, 2); // 1,910 × 14,476 / 22,000; no +65 (RC > 35,000)
    expect(p.cuneoExtraDeduction).toBeCloseTo(559.5, 6); // 1,000 × (40,000 − 35,524) / 8,000
    expect(p.irpefNet).toBeCloseTo(7106.64, 2); // 8,922.92 − 1,256.78 − 559.5
    // 40,000 − 3,676 − 7,106.64 − 35,524 × 2.03% (721.1372) − 800 = 27,696.2228
    expect(p.netIncome).toBeCloseTo(27696.22, 2);
    // Without the deduction RC = 36,324: IRPEF 9,186.92 − 1,187.3255 − 459.5 = 7,540.0945, surcharges 737.3772
    // → 8,277.4717; with it 7,106.64 + 721.1372 = 7,827.7772; saving = 449.6945
    expect(p.pensionTaxSaving).toBeCloseTo(449.6945, 3);
  });

  it('employee 6,000 + employer 1,000: deductible 4,300, non-deductible 1,700', () => {
    const p = payroll({ ral: 40000, employeePensionContribution: 6000, employerPensionContribution: 1000 });
    expect(p.deductiblePension).toBe(4300); // min(6,000, 5,300 − 1,000)
    expect(p.nonDeductiblePension).toBe(1700); // 6,000 − 4,300
    expect(p.employerExcessTaxable).toBe(0);
    expect(p.taxableIncome).toBeCloseTo(32024, 2); // 40,000 − 3,676 − 4,300
    expect(p.employeeDeduction).toBeCloseTo(1625.6436, 3); // 1,910 × 17,976 / 22,000 = 1,560.6436 + 65
    expect(p.cuneoExtraDeduction).toBeCloseTo(997, 6); // 1,000 × (40,000 − 32,024) / 8,000
    expect(p.irpefNet).toBeCloseTo(5145.2764, 3); // 6,440 + 4,024 × 33% = 7,767.92 − 1,625.6436 − 997
    // 40,000 − 3,676 − 5,145.2764 − 32,024 × 2.03% (650.0872) − 6,000 (whole employee contribution) = 24,528.6364
    expect(p.netIncome).toBeCloseTo(24528.64, 2);
  });

  it('employer contribution above the cap: excess taxable, employee contribution not deductible', () => {
    const p = payroll({ ral: 40000, employeePensionContribution: 400, employerPensionContribution: 6000 });
    expect(p.deductiblePension).toBe(0); // min(400, max(0, 5,300 − 6,000))
    expect(p.nonDeductiblePension).toBe(400);
    expect(p.employerExcessTaxable).toBe(700); // 6,000 − 5,300
    expect(p.taxableIncome).toBeCloseTo(37024, 2); // 40,000 − 3,676 + 700
    // IRPEF: 6,440 + 9,024 × 33% = 9,417.92 − 1,910 × 12,976/22,000 (1,126.5527) − 1,000 × 2,976/8,000 (372)
    expect(p.irpefNet).toBeCloseTo(7919.3673, 3);
    // 40,000 − 3,676 − 7,919.3673 − 37,024 × 2.03% (751.5872) − 400 = 27,253.0455 (employer money never in cash)
    expect(p.netIncome).toBeCloseTo(27253.05, 2);
    expect(p.pensionTaxSaving).toBe(0);
  });

  it('pensionTaxSaving ≈ marginal rate × deduction in the middle of the 33% bracket', () => {
    const p = payroll({ ral: 52000, employeePensionContribution: 1000 });
    expect(p.taxableIncome).toBeCloseTo(46221.2, 2); // 52,000 − 4,778.80 − 1,000 (RC and RC + 1,000 in (40k, 50k))
    // 33% + 1,910/22,000 (8.6818%) lost employee deduction + 2.03% surcharges = 43.7118%
    expect(p.marginalRatePct).toBeCloseTo(43.7118, 3);
    expect(p.pensionTaxSaving).toBeCloseTo(437.118, 2); // 1,000 × 43.7118%
    expect(p.pensionTaxSaving).toBeCloseTo((p.marginalRatePct / 100) * p.deductiblePension, 6);
  });

  it('deduction is limited by the income it is deducted from (never a negative taxable income)', () => {
    const p = payroll({ ral: 5000, employeePensionContribution: 5000 });
    // INPS 459.50 → only 4,540.50 of income to deduct from
    expect(p.deductiblePension).toBeCloseTo(4540.5, 2);
    expect(p.nonDeductiblePension).toBeCloseTo(459.5, 2);
    expect(p.taxableIncome).toBe(0);
    expect(p.netIncome).toBeCloseTo(-459.5, 2); // 5,000 − 459.50 − 5,000 withheld
  });
});

describe('computePayroll — productivity bonus', () => {
  it('3,000 € in 2026 at 1%: INPS due, substitute tax on (bonus − its INPS), ordinary income unchanged', () => {
    const p = payroll({ ral: 35000, productivityBonus: 3000, priorYearIncome: 35000 });
    expect(p.gross).toBe(38000);
    expect(p.inps).toBeCloseTo(3492.2, 2); // 38,000 × 9.19%
    expect(p.productivityBonusTax).toBeCloseTo(27.243, 3); // (3,000 − 275.70) × 1%
    expect(p.taxableIncome).toBeCloseTo(31783.5, 2); // same as RAL 35,000 alone
    expect(p.irpefNet).toBeCloseTo(5042.03, 2);
    // 38,000 − 3,492.20 − 5,042.0316 − 645.20505 − 27.243 = 28,793.32035
    expect(p.netIncome).toBeCloseTo(28793.32, 2);
  });

  it('6,000 € in 2026: the 5,000 € cap is measured net of the bonus INPS (circ. AdE 28/E/2016)', () => {
    const p = payroll({ ral: 35000, productivityBonus: 6000, priorYearIncome: 35000 });
    expect(p.inps).toBeCloseTo(3767.9, 2); // 41,000 × 9.19%
    // gross part within the cap = 5,000 / (1 − 9.19%) = 5,506.0015; net of its INPS (506.0015) = exactly 5,000
    expect(p.productivityBonusTax).toBeCloseTo(50, 6); // 5,000 × 1%
    // excess 6,000 − 5,506.0015 = 493.9985 is ordinary: (35,000 + 493.9985) × (1 − 9.19%) = 32,232.10
    expect(p.taxableIncome).toBeCloseTo(32232.1, 2);
    expect(p.irpefGross).toBeCloseTo(7836.593, 3); // 6,440 + 4,232.10 × 33%
  });

  it('a bonus whose net of INPS is within the cap is entirely at the substitute rate', () => {
    // 5,500 gross − 9.19% INPS = 4,994.55 net ≤ 5,000: no excess (the old gross-cap rule would tax 500 ordinarily)
    const p = payroll({ ral: 35000, productivityBonus: 5500, priorYearIncome: 35000 });
    expect(p.productivityBonusTax).toBeCloseTo(49.9455, 4); // 5,500 × (1 − 9.19%) × 1%
    expect(p.taxableIncome).toBeCloseTo(31783.5, 2); // same as RAL 35,000 alone
  });

  it('ineligible when prior-year income > 80,000: the whole bonus is ordinary income', () => {
    const p = payroll({ ral: 35000, productivityBonus: 3000, priorYearIncome: 80001 });
    expect(p.productivityBonusTax).toBe(0);
    expect(p.taxableIncome).toBeCloseTo(34507.8, 2); // 38,000 × (1 − 9.19%)
    const atLimit = payroll({ ral: 35000, productivityBonus: 3000, priorYearIncome: 80000 });
    expect(atLimit.productivityBonusTax).toBeCloseTo(27.243, 3); // ≤ 80,000 is eligible
  });

  it('2027 still 1%; 2028 back to 10% with a 3,000 € cap', () => {
    expect(payroll({ ral: 35000, productivityBonus: 3000, calendarYear: 2027 }).productivityBonusTax).toBeCloseTo(27.243, 3);
    const p = payroll({ ral: 35000, productivityBonus: 4000, calendarYear: 2028 });
    expect(p.inps).toBeCloseTo(3584.1, 2); // 39,000 × 9.19%
    // within the cap: 3,000 / (1 − 9.19%) = 3,303.6009 gross → 3,000 net taxed at 10%
    expect(p.productivityBonusTax).toBeCloseTo(300, 6);
    // excess 4,000 − 3,303.6009 = 696.3991 is ordinary: (35,000 + 696.3991) × (1 − 9.19%) = 32,415.90
    expect(p.taxableIncome).toBeCloseTo(32415.9, 2);
  });
});

describe('computePayroll — indexing and guard rails', () => {
  it('INPS thresholds follow priceIndex; IRPEF brackets do not by default (fiscal drag)', () => {
    const p = payroll({ ral: 70000, priceIndex: 2 });
    expect(p.inps).toBeCloseTo(6433, 2); // threshold 112,448 > 70,000 → 70,000 × 9.19% only
    expect(p.irpefGross).toBeCloseTo(19533.81, 2); // RC 63,567: 6,440 + 7,260 + 13,567 × 43%
    expect(employeeInps(130000, IT_2026, 1)).toBeCloseTo(11899.6205, 3);
  });

  it('with irpef.indexToInflation every money amount scales with the price index', () => {
    const rules = cloneRules();
    rules.irpef.indexToInflation = true;
    const base = payroll({ ral: 35000 }, rules);
    const doubled = payroll({ ral: 70000, priceIndex: 2 }, rules);
    for (const key of MONEY_FIELDS) expect(doubled[key]).toBeCloseTo(2 * base[key], 6);
    expect(doubled.marginalRatePct).toBeCloseTo(base.marginalRatePct, 6);
    expect(doubled.averageRatePct).toBeCloseTo(base.averageRatePct, 6);
  });

  it('options.derived = false skips pensionTaxSaving / marginalRatePct (0) and changes nothing else', () => {
    const input: PayrollInput = {
      ral: 40000,
      ordinaryBonus: 0,
      productivityBonus: 2000,
      priorYearIncome: 40000,
      employeePensionContribution: 800,
      employerPensionContribution: 800,
      calendarYear: 2026,
      priceIndex: 1,
    };
    const full = computePayroll(input, IT_2026);
    const fast = computePayroll(input, IT_2026, { derived: false });
    expect(fast.pensionTaxSaving).toBe(0);
    expect(fast.marginalRatePct).toBe(0);
    for (const key of MONEY_FIELDS) if (key !== 'pensionTaxSaving') expect(fast[key]).toBe(full[key]);
  });

  it('negative inputs behave like 0 and nothing is NaN', () => {
    const zero = payroll();
    const negative = payroll({ ral: -1000, ordinaryBonus: -1, productivityBonus: -5, employeePensionContribution: -3 });
    for (const key of MONEY_FIELDS) expect(negative[key]).toBe(zero[key]);
    expect(zero.netIncome).toBe(0);
    const nan = payroll({ ral: Number.NaN, priceIndex: Number.NaN, calendarYear: Number.NaN, priorYearIncome: Number.NaN });
    for (const value of Object.values(nan)) expect(Number.isFinite(value)).toBe(true);
  });

  it('irpefGross − deductions = irpefNet and the net identity hold across a RAL sweep', () => {
    for (let ral = 0; ral <= 150000; ral += 2500) {
      const p = payroll({ ral, ordinaryBonus: 1000, employeePensionContribution: ral * 0.02, employerPensionContribution: ral * 0.02 });
      expect(p.irpefGross - p.employeeDeduction - p.cuneoExtraDeduction).toBeCloseTo(p.irpefNet, 6);
      const expectedNet =
        p.gross - p.inps - p.irpefNet - p.regionalSurcharge - p.municipalSurcharge - p.productivityBonusTax -
        (p.deductiblePension + p.nonDeductiblePension) + p.cuneoExemptSum + (p.supplementaryTreatment ?? 0);
      expect(p.netIncome).toBeCloseTo(expectedNet, 6);
      for (const value of Object.values(p)) expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('deductiblePensionRoom', () => {
  const input = (overrides: Partial<PayrollInput>): PayrollInput => ({
    ral: 0,
    ordinaryBonus: 0,
    productivityBonus: 0,
    priorYearIncome: 0,
    employeePensionContribution: 0,
    employerPensionContribution: 0,
    calendarYear: 2026,
    priceIndex: 1,
    ...overrides,
  });

  it('is the cap left by the employer when the income is large enough, independent of the employee contribution', () => {
    // 5,300 − 2% × 40,000 = 4,500
    expect(deductiblePensionRoom(input({ ral: 40000, employerPensionContribution: 800 }), IT_2026)).toBeCloseTo(4500, 9);
    expect(deductiblePensionRoom(input({ ral: 40000, employerPensionContribution: 800, employeePensionContribution: 9000 }), IT_2026)).toBeCloseTo(4500, 9);
    expect(deductiblePensionRoom(input({ ral: 40000, employerPensionContribution: 6000 }), IT_2026)).toBe(0);
  });

  it('is limited by the income after INPS, 0 without a salary, and matches computePayroll’s deduction', () => {
    expect(deductiblePensionRoom(input({}), IT_2026)).toBe(0);
    // 3,000 − 9.19% INPS = 2,724.30
    expect(deductiblePensionRoom(input({ ral: 3000 }), IT_2026)).toBeCloseTo(2724.3, 6);
    const p = payroll({ ral: 3000, employeePensionContribution: 5300 });
    expect(p.deductiblePension).toBeCloseTo(2724.3, 6);
    expect(p.nonDeductiblePension).toBeCloseTo(5300 - 2724.3, 6);
  });
});
