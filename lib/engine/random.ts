/**
 * Deterministic random numbers for the Monte Carlo engine (docs/SPEC.md §5.9).
 *
 * - mulberry32: tiny, fast, seedable 32-bit PRNG (uniform in [0, 1)).
 * - deriveSeed: independent stream per (seed, run index) so run k is the same whatever the number of runs or the
 *   candidate retirement age (common random numbers).
 * - createNormal: standard normals by the Box–Muller transform (both values of each pair are used).
 * - choleskyWithFallback: lower-triangular factor of a correlation matrix; a matrix that is not positive definite
 *   is shrunk towards the identity until it is (keeps the unit diagonal).
 */

export type Rng = () => number;

/** Seeded PRNG returning floats in [0, 1). Any finite seed works (it is reduced to 32 bits). */
export function mulberry32(seed: number): Rng {
  let a = toUint32(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reduces any number to an unsigned 32-bit integer (non-finite → 0). */
export function toUint32(x: number): number {
  if (!Number.isFinite(x)) return 0;
  // Low 32 bits of the integer part (fmod on doubles is exact), including for negative values and values >= 2^32.
  return (Math.trunc(x) % 4294967296) >>> 0;
}

/** Seed of the independent stream `index` of a base seed (murmur3-style finaliser, well mixed). */
export function deriveSeed(seed: number, index: number): number {
  let h = (toUint32(seed) ^ Math.imul(toUint32(index) + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Standard normal generator (Box–Muller) on top of a uniform generator. */
export function createNormal(rng: Rng): () => number {
  let spare = 0;
  let hasSpare = false;
  return () => {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    let u = rng();
    while (u <= 0) u = rng(); // log(0) guard
    const v = rng();
    const radius = Math.sqrt(-2 * Math.log(u));
    const angle = 2 * Math.PI * v;
    spare = radius * Math.sin(angle);
    hasSpare = true;
    return radius * Math.cos(angle);
  };
}

/** Lower-triangular Cholesky factor L (A = L·Lᵀ), or null when A is not (numerically) positive definite. */
export function cholesky(a: number[][]): number[][] | null {
  const n = a.length;
  const l: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i][j];
      for (let k = 0; k < j; k++) sum -= l[i][k] * l[j][k];
      if (i === j) {
        if (!(sum > 1e-12) || !Number.isFinite(sum)) return null;
        l[i][i] = Math.sqrt(sum);
      } else {
        l[i][j] = sum / l[j][j];
      }
    }
  }
  return l;
}

/** Shrinkage steps tried when the correlation matrix is not positive definite (λ in (1−λ)·C + λ·I). */
const SHRINKAGE_STEPS = [0, 1e-10, 1e-8, 1e-6, 1e-4, 1e-3, 1e-2, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1];

export interface CholeskyResult {
  factor: number[][];
  /** λ actually applied: 0 = the matrix was used as given. */
  shrinkage: number;
}

/**
 * Cholesky factor of a correlation matrix with a "jitter" fallback: if the matrix is not positive definite, the
 * off-diagonal terms are shrunk towards 0 by the smallest λ in SHRINKAGE_STEPS that makes it so (λ = 1 is the
 * identity, always valid). Non-finite entries are treated as 0.
 */
export function choleskyWithFallback(corr: number[][]): CholeskyResult {
  const n = corr.length;
  for (const lambda of SHRINKAGE_STEPS) {
    const m = corr.map((row, i) =>
      row.map((v, j) => (i === j ? 1 : (1 - lambda) * (Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0))),
    );
    const factor = cholesky(m);
    if (factor) return { factor, shrinkage: lambda };
  }
  // Unreachable (λ = 1 is the identity), kept for type safety.
  return { factor: Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0))), shrinkage: 1 };
}
