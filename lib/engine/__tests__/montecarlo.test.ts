import { describe, expect, it } from 'vitest';
import { cholesky, choleskyWithFallback, createNormal, deriveSeed, mulberry32 } from '../random';
import { buildPathModel, createPathGenerator, deterministicPath } from '../paths';
import { percentileSorted, runMonteCarlo } from '../montecarlo';
import { runPlan } from '../fire';
import { PlanValidationError } from '../types';
import { basePlan } from './helpers';

describe('random', () => {
  it('mulberry32 is deterministic, in [0, 1) and roughly uniform', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      sum += x;
    }
    expect(sum / 20000).toBeCloseTo(0.5, 2);
    expect(mulberry32(43)()).not.toBe(mulberry32(42)());
    expect(deriveSeed(1, 0)).not.toBe(deriveSeed(1, 1));
  });

  it('Box–Muller normals have mean 0 and variance 1', () => {
    const normal = createNormal(mulberry32(7));
    const n = 50000;
    let s = 0;
    let s2 = 0;
    for (let i = 0; i < n; i++) {
      const z = normal();
      s += z;
      s2 += z * z;
    }
    expect(s / n).toBeCloseTo(0, 1);
    expect(s2 / n).toBeCloseTo(1, 1);
  });

  it('Cholesky reproduces the matrix; a non positive-definite matrix is shrunk until it factors', () => {
    const m = [
      [1, 0.85, 0.2],
      [0.85, 1, 0.2],
      [0.2, 0.2, 1],
    ];
    const l = cholesky(m);
    expect(l).not.toBeNull();
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        let v = 0;
        for (let k = 0; k < 3; k++) v += (l?.[i][k] ?? 0) * (l?.[j][k] ?? 0);
        expect(v).toBeCloseTo(m[i][j], 12);
      }
    const bad = [
      [1, 0.99, -0.99],
      [0.99, 1, 0.99],
      [-0.99, 0.99, 1],
    ];
    expect(cholesky(bad)).toBeNull();
    const fixed = choleskyWithFallback(bad);
    expect(fixed.shrinkage).toBeGreaterThan(0);
    expect(fixed.factor[0][0]).toBe(1);
  });
});

describe('market paths', () => {
  it('the deterministic path repeats the expected returns and inflation', () => {
    const plan = basePlan();
    const path = deterministicPath(plan, 3);
    expect(path.assetReturns).toEqual([
      [0.06, 0.03],
      [0.06, 0.03],
      [0.06, 0.03],
    ]);
    expect(path.pensionFundReturns).toEqual([0.035, 0.035, 0.035]);
    expect(path.inflation).toEqual([0.02, 0.02, 0.02]);
  });

  it('random paths are lognormal with the expected median, correlated, with clipped inflation', () => {
    const plan = basePlan();
    const model = buildPathModel(plan);
    expect(model.factors).toEqual([0, 1, -1]);
    expect(model.shrinkage).toBe(0);
    const gen = createPathGenerator(plan, 60, 99);
    const equity: number[] = [];
    const bond: number[] = [];
    const inflation: number[] = [];
    for (let r = 0; r < 300; r++) {
      const p = gen(r);
      for (let t = 0; t < 60; t++) {
        equity.push(p.assetReturns[t][0]);
        bond.push(p.assetReturns[t][1]);
        inflation.push(p.inflation[t]);
      }
    }
    const median = (xs: number[]) => percentileSorted(Float64Array.from(xs).sort(), 50);
    expect(median(equity)).toBeCloseTo(0.06, 2);
    expect(median(bond)).toBeCloseTo(0.03, 2);
    expect(Math.min(...inflation)).toBeGreaterThanOrEqual(-0.03);
    expect(Math.max(...inflation)).toBeLessThanOrEqual(0.15);
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const le = equity.map((x) => Math.log(1 + x));
    const lb = bond.map((x) => Math.log(1 + x));
    const me = mean(le);
    const mb = mean(lb);
    let cov = 0;
    let ve = 0;
    let vb = 0;
    for (let i = 0; i < le.length; i++) {
      cov += (le[i] - me) * (lb[i] - mb);
      ve += (le[i] - me) ** 2;
      vb += (lb[i] - mb) ** 2;
    }
    expect(cov / Math.sqrt(ve * vb)).toBeCloseTo(0.2, 1);
    // Same (seed, run) → same path.
    expect(createPathGenerator(plan, 60, 99)(7)).toEqual(gen(7));
  });
});

describe('runMonteCarlo', () => {
  const plan = basePlan();

  it('is reproducible with the same seed and changes with another seed', () => {
    const a = runMonteCarlo(plan, { runs: 200 });
    const b = runMonteCarlo(plan, { runs: 200 });
    expect(b).toEqual(a);
    const c = runMonteCarlo(plan, { runs: 200, seed: plan.simulation.seed + 1 });
    expect(c.netWorth).not.toEqual(a.netWorth);
    expect(a.runs).toBe(200);
    expect(a.seed).toBe(plan.simulation.seed);
  });

  it('percentiles are ordered, depletion histogram counts the failed runs, confidentFiAge meets the target', () => {
    const mc = runMonteCarlo(plan, { runs: 300 });
    expect(mc.netWorth).toHaveLength(66);
    for (const rows of [mc.netWorth, mc.accessible]) {
      for (const r of rows) {
        expect(r.p10).toBeLessThanOrEqual(r.p25);
        expect(r.p25).toBeLessThanOrEqual(r.p50);
        expect(r.p50).toBeLessThanOrEqual(r.p75);
        expect(r.p75).toBeLessThanOrEqual(r.p90);
      }
    }
    const failed = mc.depletionAges.reduce((s, d) => s + d.count, 0);
    expect(failed).toBe(Math.round(300 * (1 - mc.successProbabilityPct / 100)));
    const det = runPlan(plan).summary;
    expect(mc.retirementAge).toBe(det.retirementAge);
    const ages = mc.successByRetirementAge.map((x) => x.age);
    expect(ages).toEqual([...ages].sort((x, y) => x - y));
    expect(ages[0]).toBeLessThanOrEqual((det.fiAge ?? 0) - 3);
    expect(ages[ages.length - 1]).toBeGreaterThanOrEqual((det.fiAge ?? 0) + 10);
    expect(mc.confidentFiAge).not.toBeNull();
    const at = mc.successByRetirementAge.find((x) => x.age === mc.confidentFiAge);
    expect(at?.successPct ?? 0).toBeGreaterThanOrEqual(plan.simulation.successTargetPct);
    for (const x of mc.successByRetirementAge) {
      if (x.age < (mc.confidentFiAge ?? 0)) expect(x.successPct).toBeLessThan(plan.simulation.successTargetPct);
    }
    // The success at the displayed age is the one in the by-age list (common random numbers).
    expect(mc.successByRetirementAge.find((x) => x.age === mc.retirementAge)?.successPct).toBe(mc.successProbabilityPct);
  });

  it('a later retirement age is at least as safe on the same paths for this plan', () => {
    const mc = runMonteCarlo(plan, { runs: 300 });
    const s = mc.successByRetirementAge;
    for (let i = 1; i < s.length; i++) expect(s[i].successPct).toBeGreaterThanOrEqual(s[i - 1].successPct - 1);
  });

  it('honours opts.retirementAge and validates runs', () => {
    const mc = runMonteCarlo(plan, { runs: 100, retirementAge: 60 });
    expect(mc.retirementAge).toBe(60);
    expect(mc.successByRetirementAge.some((x) => x.age === 60)).toBe(true);
    expect(() => runMonteCarlo(plan, { runs: 0 })).toThrow(PlanValidationError);
    const invalid = basePlan();
    invalid.profile.currentAge = Number.NaN;
    expect(() => runMonteCarlo(invalid)).toThrow(PlanValidationError);
  });

  it('1000 runs over the candidate ages run within the time budget', () => {
    runMonteCarlo(plan, { runs: 200 }); // warm-up (JIT)
    const t0 = performance.now();
    const mc = runMonteCarlo(plan, { runs: 1000 });
    const ms = performance.now() - t0;
    expect(mc.successByRetirementAge.length).toBeGreaterThanOrEqual(12);
    // SPEC budget: < 1.5 s in a worker. Generous bound here because test files run in parallel.
    expect(ms).toBeLessThan(4000);
  });
});
