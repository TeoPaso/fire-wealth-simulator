import { describe, expect, it } from 'vitest';
import type { Plan, YearRow } from '../types';
import { deterministicPath } from '../paths';
import { annuityValueFactor, contributionYearsAt, preparePlan, simulate, simulatePrepared, statePensionClaimAge } from '../simulate';
import { runPlan } from '../fire';
import { phaseStartPayroll } from '../payrollPreview';
import { exitTaxRatePct } from '../tax/pensionFund';
import { tfrSeparateTaxRatePct } from '../tax/tfr';
import { balances, basePlan, externalInflows, outflows, rowAt, startBalances, zeroWorldPlan } from './helpers';

function rowsOf(plan: Plan, retirementAge: number): YearRow[] {
  const prep = preparePlan(plan);
  const sim = simulatePrepared(prep, { retirementAge, path: deterministicPath(plan, prep.years), detail: true });
  return sim.rows ?? [];
}

/** Asserts Σ external inflows − outflows + shortfall = Δ(cash + portfolio + fund + company TFR) for every year. */
function expectConservation(plan: Plan, rows: YearRow[]): void {
  let previous = startBalances(plan);
  for (const r of rows) {
    const delta = balances(r) - previous;
    expect(Math.abs(externalInflows(r) - outflows(r) + r.shortfall - delta), `age ${r.age}`).toBeLessThan(1e-6);
    previous = balances(r);
  }
}

describe('simulate — conservation with zero returns, inflation, costs and taxes', () => {
  function conservationPlan(): Plan {
    const plan = zeroWorldPlan();
    plan.pensionFund.capitalSharePct = 100; // no annuity: the whole position comes back as a lump sum
    plan.statePension.mode = 'estimate';
    plan.statePension.monthlyNetToday = 900;
    plan.career[1].bonusRegime = 'pensionFund';
    plan.career[2].bonusRegime = 'welfare';
    plan.savingsPolicy.voluntaryPension = 'fillCap';
    plan.spending.events = [
      { id: 'car', label: 'Auto', age: 33, amountToday: 15000, years: 1 },
      { id: 'gift', label: 'Eredità', age: 41, amountToday: -40000, years: 1 },
      { id: 'rent', label: 'Affitto extra', age: 60, amountToday: 3000, years: 5 },
    ];
    return plan;
  }

  it('flows mode, ordinary benefit: every year balances to 1e-6', () => {
    const plan = conservationPlan();
    const rows = rowsOf(plan, 52);
    expect(rows).toHaveLength(66);
    expectConservation(plan, rows);
    expect(rowAt(rows, 52).tfrPayoutNet).toBeGreaterThan(0);
    expect(rowAt(rows, 67).pfLumpSumNet).toBeGreaterThan(0);
  });

  it('annual rebalancing, RITA and a failing plan (shortfall counted as unpaid spending)', () => {
    const plan = conservationPlan();
    plan.portfolio.rebalancing = 'annual';
    plan.pensionFund.accessMode = 'rita';
    plan.pensionFund.accessAge = 62;
    expectConservation(plan, rowsOf(plan, 50));
    const failing = conservationPlan();
    failing.spending.monthlyToday = 6000;
    const rows = rowsOf(failing, 40);
    expect(rows.some((r) => r.shortfall > 0)).toBe(true);
    expectConservation(failing, rows);
  });

  it('redemption mode: 100% lump sum R + 4 years after work stops', () => {
    const plan = conservationPlan();
    plan.pensionFund.accessMode = 'redemption';
    const rows = rowsOf(plan, 45);
    expectConservation(plan, rows);
    expect(rowAt(rows, 48).pensionFund).toBeGreaterThan(0);
    expect(rowAt(rows, 49).pfLumpSumNet).toBeCloseTo(rowAt(rows, 48).pensionFund, 6);
    expect(rowAt(rows, 49).pensionFund).toBe(0);
  });
});

describe('simulate — compound interest acceptance (mid-year convention)', () => {
  it('10,000 € + 1,200 €/year on one asset at 5% with 0.2% TER matches the closed form', () => {
    const plan = zeroWorldPlan();
    plan.portfolio.assets = [{ ...plan.portfolio.assets[0], allocationPct: 100, expectedReturnPct: 5, terPct: 0.2 }];
    plan.assets.holdings = [{ assetId: plan.portfolio.assets[0].id, value: 10000, costBasis: 10000 }];
    plan.assets.cash = 0;
    plan.assets.companyTfr = 0;
    plan.assets.pensionFund.balance = 0;
    plan.assets.pensionFund.taxableBasis = 0;
    plan.pensionFund.enabled = false;
    plan.savingsPolicy.emergencyFundMonths = 0;
    plan.spending.monthlyToday = 0;
    plan.statePension.mode = 'estimate';
    plan.statePension.monthlyNetToday = 0;
    plan.retirement = { mode: 'fixedAge', fixedAge: 30 };
    plan.spending.events = [{ id: 'saving', label: 'Versamento', age: 30, amountToday: -1200, years: 10 }];
    const rows = runPlan(plan).rows;
    const G = 1.05 * (1 - 0.002);
    for (const n of [1, 5, 10]) {
      const closed = 10000 * G ** n + 1200 * Math.sqrt(G) * ((G ** n - 1) / (G - 1));
      expect(rows[n - 1].portfolioValue).toBeCloseTo(closed, 6);
    }
    // After the contributions stop the value just compounds.
    expect(rows[14].portfolioValue).toBeCloseTo(rows[9].portfolioValue * G ** 5, 6);
    // Return before costs and TER of year 1: V·(1+r) + C·sqrt(1+r) − V − C; costs = gross end − net end.
    const gross1 = 10000 * 1.05 + 1200 * Math.sqrt(1.05);
    expect(rows[0].portfolioReturn).toBeCloseTo(gross1 - 11200, 6);
    expect(rows[0].portfolioCosts).toBeCloseTo(gross1 - rows[0].portfolioValue, 6);
  });
});

describe('simulate — pension fund and TFR', () => {
  it('disabling the pension fund never loses money: the TFR stays in the company and is paid at job exit', () => {
    const plan = zeroWorldPlan();
    plan.pensionFund.enabled = false;
    plan.career[0].bonusRegime = 'pensionFund'; // treated as productivity bonus when the fund is disabled
    const rows = rowsOf(plan, 50);
    const working = rows.filter((r) => r.status === 'working');
    for (const r of working) {
      expect(r.pfEmployee + r.pfEmployer + r.pfTfr + r.pfBonus).toBe(0);
      expect(r.tfrToCompany).toBeCloseTo(r.tfrAccrued, 9);
    }
    expect(working[0].payroll?.gross).toBeCloseTo(working[0].ral + working[0].bonusGross, 6);
    const accrued = working.reduce((s, r) => s + r.tfrAccrued, 0) + plan.assets.companyTfr;
    expect(rowAt(rows, 50).tfrPayoutNet).toBeCloseTo(accrued, 6);
    // The existing fund position (3,000 €) is still paid at the access age.
    expect(rowAt(rows, 67).pfLumpSumNet + rowAt(rows, 67).pensionAnnuityNet).toBeGreaterThan(0);
    expectConservationLite(plan, rows);
  });

  it('with real rules the company TFR is revalued (17% tax) and paid with the separate-taxation rate', () => {
    const plan = basePlan();
    plan.pensionFund.enabled = false;
    const rows = rowsOf(plan, 45);
    const working = rows.filter((r) => r.status === 'working');
    const principal = plan.assets.companyTfr + working.reduce((s, r) => s + r.tfrToCompany, 0);
    const years = plan.assets.companyTfrYears + working.filter((r) => r.tfrToCompany > 0).length;
    const exit = rowAt(rows, 45);
    const rate = tfrSeparateTaxRatePct(principal, years, plan.taxRules) / 100;
    expect(exit.tfrPayoutTax).toBeCloseTo(principal * rate, 6);
    expect(exit.tfrPayoutNet + exit.tfrPayoutTax).toBeCloseTo(rowAt(rows, 44).companyTfr, 6);
    const r1 = working[1];
    expect(r1.tfrRevaluationTax).toBeCloseTo((r1.tfrRevaluationNet + r1.tfrRevaluationTax) * 0.17, 9);
    expect(exit.companyTfr).toBe(0);
  });

  it('employee + employer contributions fill exactly the 5,300 € cap with fillCap; the taxable basis follows the split', () => {
    const plan = basePlan();
    plan.career[0].ralToday = 60000;
    plan.career[0].bonusGrossToday = 0;
    plan.savingsPolicy.voluntaryPension = 'fillCap';
    const r0 = rowsOf(plan, 50)[0];
    expect(r0.pfEmployer).toBeCloseTo(1200, 9); // 2% of 60,000
    expect(r0.pfEmployee + r0.pfEmployer).toBeCloseTo(5300, 9);
    expect(r0.payroll?.deductiblePension).toBeCloseTo(4100, 9);
    expect(r0.payroll?.nonDeductiblePension).toBeCloseTo(0, 9);
    const tfr = r0.pfTfr;
    expect(r0.pensionFundTaxableBasis).toBeCloseTo(plan.assets.pensionFund.taxableBasis + 4100 + 1200 + tfr, 6);

    // A fixed voluntary amount above the cap: the excess is not deductible and stays exempt at exit.
    plan.savingsPolicy.voluntaryPension = 'fixed';
    plan.savingsPolicy.voluntaryPensionFixedToday = 6000;
    const f0 = rowsOf(plan, 50)[0];
    expect(f0.pfEmployee).toBeCloseTo(900 + 6000, 9);
    expect(f0.payroll?.deductiblePension).toBeCloseTo(4100, 9);
    expect(f0.payroll?.nonDeductiblePension).toBeCloseTo(2800, 9);
    expect(f0.pensionFundTaxableBasis).toBeCloseTo(plan.assets.pensionFund.taxableBasis + 4100 + 1200 + f0.pfTfr, 6);
    expect(runPlan(plan).issues.some((i) => i.code === 'contributionAboveCap' && i.path === 'savingsPolicy.voluntaryPensionFixedToday')).toBe(true);

    // Employer above the cap: only the cap counts in the basis, the excess is taxable income.
    plan.savingsPolicy.voluntaryPension = 'none';
    plan.career[0].employerPensionPct = 10;
    const e0 = rowsOf(plan, 50)[0];
    expect(e0.payroll?.employerExcessTaxable).toBeCloseTo(700, 9);
    expect(e0.payroll?.deductiblePension).toBe(0);
    expect(e0.pensionFundTaxableBasis).toBeCloseTo(plan.assets.pensionFund.taxableBasis + 5300 + e0.pfTfr, 6);
  });

  it('fillCap only fills the deductible room: nothing is withheld in a year without salary, at most the income otherwise', () => {
    const plan = basePlan();
    plan.savingsPolicy.voluntaryPension = 'fillCap';
    plan.career.splice(2, 0, { ...plan.career[1], id: 'break', label: 'Pausa', untilAge: 42, ralToday: 0, bonusGrossToday: 0 });
    plan.career[1].untilAge = 40;
    const result = runPlan(plan);
    for (const age of [40, 41]) {
      const r = rowAt(result.rows, age);
      expect(r.ral).toBe(0);
      expect(r.pfEmployee).toBe(0);
      expect(r.payroll?.netIncome).toBe(0);
      expect(r.payroll?.nonDeductiblePension).toBe(0);
    }
    const before = rowAt(result.rows, 39);
    expect(before.pfEmployee + before.pfEmployer).toBeCloseTo(5300, 9); // a normal salary still fills the cap
    expect(result.issues.some((i) => i.code === 'contributionAboveCap')).toBe(false);
    expect(phaseStartPayroll(plan, 2)?.payroll.netIncome).toBe(0); // the inputs-panel preview of the break

    // A tiny salary: the contribution is limited to the income it can be deducted from, all of it deductible.
    plan.career[2].ralToday = 3000;
    const low = rowAt(runPlan(plan).rows, 40);
    expect(low.pfEmployee).toBeGreaterThan(0);
    expect(low.pfEmployee + low.pfEmployer).toBeLessThan(5300);
    expect(low.payroll?.nonDeductiblePension).toBeCloseTo(0, 9);
    expect(low.payroll?.deductiblePension).toBeCloseTo(low.pfEmployee, 9);
    expect(low.payroll?.netIncome ?? -1).toBeGreaterThanOrEqual(-1e-9);
  });

  it('ordinary benefit at the access age: lump sum + nominal annuity, exit tax by membership years on the taxable share', () => {
    const plan = basePlan();
    plan.pensionFund.capitalSharePct = 50;
    plan.pensionFund.annuityRatePct = 5;
    const rows = rowsOf(plan, 50);
    const before = rowAt(rows, 66);
    const at = rowAt(rows, 67);
    const share = before.pensionFundTaxableBasis / before.pensionFund;
    const membership = at.calendarYear - plan.assets.pensionFund.membershipStartYear;
    expect(membership).toBe(40);
    const rate = exitTaxRatePct(membership, plan.taxRules) / 100;
    expect(rate).toBeCloseTo(0.09, 12); // 15% − 0.3 × 25 years beyond 15, floored at 9%
    const lump = before.pensionFund * 0.5;
    const annuity = before.pensionFund * 0.5 * 0.05;
    expect(at.pfLumpSumNet).toBeCloseTo(lump * (1 - share * rate), 6);
    expect(at.pensionAnnuityNet).toBeCloseTo(annuity * (1 - share * rate), 6);
    expect(at.pfExitTax).toBeCloseTo((lump + annuity) * share * rate, 6);
    expect(at.pensionFund).toBe(0);
    expect(rowAt(rows, 80).pensionAnnuityNet).toBeCloseTo(at.pensionAnnuityNet, 9); // constant nominal
    for (const r of rows.filter((x) => x.age < 67)) expect(r.pfLumpSumNet + r.pensionAnnuityNet).toBe(0);
  });

  it('the annuitised share stays in the locked wealth as the value of its remaining payments (no cliff at access)', () => {
    const plan = basePlan();
    const rows = runPlan(plan).rows;
    // Fund line: 3.5% before costs, 0.3% costs, yield tax 17% (40% government bonds).
    const rate = (1.035 * 0.997 - 1) * (1 - 0.17);
    expect(preparePlan(plan).pfAnnuityDiscount).toBeCloseTo(rate, 12);
    const at = rowAt(rows, 67);
    expect(at.pensionAnnuityNet).toBeGreaterThan(0);
    // 28 payments left (ages 68…95), each at mid-year.
    let factor = 0;
    for (let k = 1; k <= 95 - 67; k++) factor += Math.pow(1 + rate, -(k - 0.5));
    expect(annuityValueFactor(rate, 28)).toBeCloseTo(factor, 9);
    // A negative expected return never values the payments above their nominal sum.
    const losing = basePlan();
    losing.pensionFund.expectedReturnPct = -5;
    expect(preparePlan(losing).pfAnnuityDiscount).toBe(0);
    expect(annuityValueFactor(0, 28)).toBe(28);
    expect(at.pensionAnnuityValue).toBeCloseTo(at.pensionAnnuityNet * factor, 6);
    expect(rowAt(rows, 95).pensionAnnuityValue).toBe(0);
    for (const r of rows) {
      if (r.age < 67) expect(r.pensionAnnuityValue).toBe(0);
      expect(r.lockedNet).toBeCloseTo(r.pensionFundNet + r.companyTfrNet + (r.pensionAnnuityValue ?? 0), 6);
      expect(r.netWorth).toBeCloseTo(r.accessibleNet + r.lockedNet, 6);
    }
    // Paying the fund out no longer makes half of it vanish from the net worth (it fell by 37% in today's €).
    const real = (r: YearRow) => r.netWorth / (r.priceIndexEnd ?? r.priceIndex);
    expect(real(at) / real(rowAt(rows, 66))).toBeGreaterThan(0.95);
  });

  it('RITA: equal instalments of the remaining position from accessAge until the old-age age', () => {
    const plan = zeroWorldPlan();
    plan.pensionFund.accessMode = 'rita';
    plan.pensionFund.accessAge = 62;
    const rows = rowsOf(plan, 55);
    const position = rowAt(rows, 61).pensionFund;
    expect(position).toBeGreaterThan(0);
    for (const age of [62, 63, 64, 65, 66]) expect(rowAt(rows, age).pfLumpSumNet).toBeCloseTo(position / 5, 6);
    expect(rowAt(rows, 66).pensionFund).toBeCloseTo(0, 9);
    for (const r of rows.filter((x) => x.age < 62)) expect(r.pfLumpSumNet).toBe(0);
    expect(rows.reduce((s, r) => s + r.pensionAnnuityNet, 0)).toBe(0);

    // With the real rules each instalment pays the exit tax on its taxable share.
    const real = basePlan();
    real.pensionFund.accessMode = 'rita';
    real.pensionFund.accessAge = 62;
    const rr = rowsOf(real, 55);
    const first = rowAt(rr, 62);
    const prev = rowAt(rr, 61);
    const instalment = prev.pensionFund / 5;
    const rate = exitTaxRatePct(first.calendarYear - real.assets.pensionFund.membershipStartYear, real.taxRules) / 100;
    expect(first.pfExitTax).toBeCloseTo(instalment * (prev.pensionFundTaxableBasis / prev.pensionFund) * rate, 6);
    expect(first.pfLumpSumNet).toBeCloseTo(instalment - first.pfExitTax, 6);
  });

  it('redemption: lump sum 4 years after work stops, or RITA from oldAge − 5 when that falls in the blocked window', () => {
    const plan = basePlan();
    plan.pensionFund.accessMode = 'redemption';
    const early = rowsOf(plan, 45);
    expect(rowAt(early, 49).pfLumpSumNet).toBeGreaterThan(0);
    expect(rowAt(early, 49).pensionFund).toBe(0);
    for (const r of early.filter((x) => x.age < 49)) expect(r.pfLumpSumNet).toBe(0);
    const before = rowAt(early, 48);
    const rate = exitTaxRatePct(rowAt(early, 49).calendarYear - plan.assets.pensionFund.membershipStartYear, plan.taxRules) / 100;
    expect(rowAt(early, 49).pfExitTax).toBeCloseTo(Math.min(before.pensionFundTaxableBasis, before.pensionFund) * rate, 6);

    const late = rowsOf(plan, 59); // 59 + 4 = 63 is within the 5 years before 67 → RITA from 62
    expect(rowAt(late, 61).pfLumpSumNet).toBe(0);
    expect(rowAt(late, 62).pfLumpSumNet).toBeGreaterThan(0);
    expect(rowAt(late, 66).pensionFund).toBeCloseTo(0, 9);
    const fixed = basePlan();
    fixed.pensionFund.accessMode = 'redemption';
    fixed.retirement = { mode: 'fixedAge', fixedAge: 59 };
    const issue = runPlan(fixed).issues.find((i) => i.code === 'redemptionFallbackRita');
    expect(issue).toMatchObject({ level: 'info', path: 'pensionFund.accessMode', params: { age: 62, redemptionAge: 63 } });
  });
});

describe('simulate — locked money and shortfall', () => {
  it('a plan that needs the pension fund before its access age fails, although its net worth is large', () => {
    const plan = basePlan();
    plan.assets.holdings = [];
    plan.assets.cash = 20000;
    plan.assets.pensionFund.balance = 1_000_000;
    plan.assets.pensionFund.taxableBasis = 1_000_000;
    const prep = preparePlan(plan);
    const sim = simulate(plan, { retirementAge: 31, path: deterministicPath(plan, prep.years), detail: true });
    const rows = sim.rows ?? [];
    expect(sim.success).toBe(false);
    expect(sim.depletionAge).toBe(32); // year 31 is covered by the TFR payout and the cash
    const first = rows.find((r) => r.shortfall > 0.5);
    expect(first?.age).toBe(32);
    expect(first && first.netWorth > 800_000).toBe(true); // fund net of the 15% exit tax
    for (const r of rows.filter((x) => x.age < 67)) expect(r.pfLumpSumNet).toBe(0);
    expect(rowAt(rows, 66).pensionFund).toBeGreaterThan(1_000_000);
    expect(rowAt(rows, 67).pfLumpSumNet).toBeGreaterThan(0);
  });

  it('shortfall uses cash above the emergency fund, then the portfolio (grossed up for tax), then the rest of the cash', () => {
    const plan = basePlan();
    plan.retirement = { mode: 'fixedAge', fixedAge: 30 };
    plan.spending.monthlyToday = 4000;
    const result = runPlan(plan);
    const r0 = result.rows[0];
    expect(r0.withdrawalGross).toBeGreaterThan(0);
    expect(r0.withdrawalTax).toBeGreaterThanOrEqual(0);
    expect(result.summary.success).toBe(false);
    expect(result.summary.depletionAge).toBe(result.rows.find((r) => r.shortfall > 0.5)?.age);
    const depleted = rowAt(result.rows, result.summary.depletionAge ?? -1);
    expect(depleted.cash).toBeCloseTo(0, 6);
    expect(depleted.portfolioValue).toBeCloseTo(0, 6);
  });
});

/** Conservation for plans that keep zero taxes but may still have an annuity (lump sums only before 67). */
function expectConservationLite(plan: Plan, rows: YearRow[]): void {
  let previous = startBalances(plan);
  for (const r of rows.filter((x) => x.age < 67)) {
    const delta = balances(r) - previous;
    expect(Math.abs(externalInflows(r) - outflows(r) + r.shortfall - delta), `age ${r.age}`).toBeLessThan(1e-6);
    previous = balances(r);
  }
}

describe('simulate — state pension and guardrails', () => {
  it('contributivo: montante revalued at inflation + GDP, + 33% of RAL and bonus while working, × coefficient at the claim age', () => {
    const plan = basePlan();
    plan.assets.inps.montante = 50000;
    const rows = rowsOf(plan, 50);
    const r30 = rowAt(rows, 30);
    // The productivity bonus pays employee INPS, so it is credited to the montante too (same base as the INPS charge).
    expect(r30.bonusGross).toBeCloseTo(2500, 9);
    expect(r30.payroll?.gross).toBeCloseTo(r30.ral + r30.bonusGross, 9);
    expect(r30.inpsMontante).toBeCloseTo(50000 * (1 + 0.02 + 0.01) + 0.33 * (r30.ral + r30.bonusGross), 6);
    // A bonus paid into the pension fund or as welfare pays no INPS and is not credited.
    const toFund = basePlan();
    toFund.assets.inps.montante = 50000;
    toFund.career[0].bonusRegime = 'pensionFund';
    expect(rowAt(rowsOf(toFund, 50), 30).inpsMontante).toBeCloseTo(50000 * 1.03 + 0.33 * r30.ral, 6);
    const r55 = rowAt(rows, 55);
    expect(r55.inpsMontante).toBeCloseTo(rowAt(rows, 54).inpsMontante * 1.03, 6); // no contributions after 50
    const claim = rowAt(rows, 67);
    expect(claim.statePensionGross).toBeCloseTo((rowAt(rows, 66).inpsMontante * 5.514) / 100, 6);
    expect(claim.statePensionNet).toBeGreaterThan(0);
    expect(claim.statePensionNet + (claim.statePensionTax ?? 0)).toBeCloseTo(claim.statePensionGross ?? 0, 6);
    expect(rowAt(rows, 68).statePensionGross).toBeCloseTo((claim.statePensionGross ?? 0) * (1 + 0.9 * 0.02), 6);
    for (const r of rows.filter((x) => x.age < 67)) expect(r.statePensionNet).toBe(0);
    // Claiming at 70 uses the age-70 coefficient.
    plan.statePension.claimAge = 70;
    const late = rowsOf(plan, 50);
    expect(rowAt(late, 69).statePensionNet).toBe(0);
    expect(rowAt(late, 70).statePensionGross).toBeCloseTo((rowAt(late, 69).inpsMontante * 6.139) / 100, 6);
  });

  it('a career break with RAL 0 accrues no contribution years: the old-age pension moves to the fallback age', () => {
    const plan = basePlan();
    plan.profile.currentAge = 40;
    plan.assets.inps = { contributionYears: 8, montante: 60000 };
    const phase = { ...plan.career[0], realRaisePct: 0, bonusGrossToday: 0 };
    plan.career = [
      { ...phase, id: 'a', untilAge: 45, ralToday: 45000 },
      { ...phase, id: 'break', untilAge: 50, ralToday: 0 },
      { ...phase, id: 'b', untilAge: 67, ralToday: 45000 },
    ];
    plan.retirement = { mode: 'fixedAge', fixedAge: 55 };
    const prep = preparePlan(plan);
    // 8 + 5 (40–44) + 0 (break, 45–49) + 5 (50–54) = 18 < 20 at 67 → pensione a 71 anni con 5 anni.
    expect(contributionYearsAt(prep, 67, 55)).toBe(18);
    expect(contributionYearsAt(prep, 47, 55)).toBe(13);
    expect(statePensionClaimAge(prep, 55)).toBe(71);
    expect(runPlan(plan).summary.statePensionClaimAge).toBe(71);
    // The same years paid: 23 years → 67.
    plan.career[1].ralToday = 30000;
    expect(statePensionClaimAge(preparePlan(plan), 55)).toBe(67);
    // A break paid only with a welfare bonus has no contribution base either.
    plan.career[1] = { ...plan.career[1], ralToday: 0, bonusGrossToday: 3000, bonusRegime: 'welfare' };
    expect(contributionYearsAt(preparePlan(plan), 67, 55)).toBe(18);
  });

  it('estimate: the net monthly amount × 13 in today’s euros, from the claim age', () => {
    const plan = basePlan();
    plan.statePension.mode = 'estimate';
    plan.statePension.monthlyNetToday = 1000;
    plan.statePension.claimAge = 67;
    const rows = rowsOf(plan, 50);
    const r = rowAt(rows, 67);
    expect(r.statePensionNet).toBeCloseTo(13000 * r.priceIndex, 6);
    expect(rowAt(rows, 66).statePensionNet).toBe(0);
  });

  it('guardrails cut spending in the years whose withdrawal rate exceeds 1.2 × SWR', () => {
    const plan = basePlan();
    plan.withdrawal.strategy = 'guardrails';
    plan.withdrawal.guardrailCutPct = 10;
    const rows = rowsOf(plan, 45);
    const cut = rows.filter((r) => r.spendingCutPct > 0);
    expect(cut.length).toBeGreaterThan(0);
    for (const r of cut) {
      expect(r.status).toBe('retired');
      expect(r.livingExpenses).toBeCloseTo(1500 * 12 * r.priceIndex * 0.9, 6);
    }
    const constant = basePlan();
    expect(rowsOf(constant, 45).every((r) => r.spendingCutPct === 0)).toBe(true);
  });

  it('a productivity bonus above the cap (net of INPS) is reported once with its phase', () => {
    const plan = basePlan();
    plan.career[0].bonusGrossToday = 7000;
    const issue = runPlan(plan).issues.find((i) => i.code === 'bonusAboveCap');
    expect(issue).toMatchObject({ level: 'warning', path: 'career[0].bonusGrossToday', params: { age: 30, cap: 5000 } });
  });

  it('a one-off expense while working does not raise negativeSavingsWhileWorking', () => {
    const plan = basePlan();
    plan.spending.events = [{ id: 'house', label: 'Casa', age: 32, amountToday: 60000, years: 1 }];
    const result = runPlan(plan);
    expect(rowAt(result.rows, 32).netSavings).toBeLessThan(0);
    expect(result.issues.some((i) => i.code === 'negativeSavingsWhileWorking')).toBe(false);
  });
});
