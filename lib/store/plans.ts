/**
 * Plan utilities for the store: forward-compatible deep merge over the default plan, id generation and id
 * remapping. None of these "fix" user values: they only guarantee the plan's object structure exists.
 */
import { createDefaultPlan, type Plan } from '@/lib/engine';

export type IdFactory = (prefix: string) => string;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep-merges `override` over `base`:
 * - plain objects are merged key by key (keys unknown to `base` are kept, for forward compatibility);
 * - arrays in `override` replace the base array as a whole;
 * - primitive values in `override` win, even if they are invalid (validation reports them);
 * - `undefined`/`null`, or a non-object where `base` has an object/array, keep the base structure so the UI
 *   never crashes on a missing section.
 * Returns a new value; inputs are not mutated.
 */
export function deepMerge<T>(base: T, override: unknown): T {
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return structuredClone(base);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) out[key] = deepMerge(base[key], override[key]);
    for (const key of Object.keys(override)) {
      if (!(key in base) && override[key] !== undefined) out[key] = structuredClone(override[key]);
    }
    return out as T;
  }
  if (Array.isArray(base)) {
    return (Array.isArray(override) ? structuredClone(override) : structuredClone(base)) as T;
  }
  if (override === undefined || override === null) return base;
  return override as T;
}

/**
 * Turns stored/imported data into a structurally complete Plan by deep-merging it over `createDefaultPlan()`.
 * Values are kept as-is (an invalid plan stays invalid and editable). Returns null if `raw` is not an object.
 */
export function normalizePlan(raw: unknown, opts: { now?: string } = {}): Plan | null {
  if (!isPlainObject(raw)) return null;
  const base = createDefaultPlan({ now: opts.now });
  return deepMerge(base, raw);
}

function randomHex(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '').slice(0, 12);
  return Math.random().toString(16).slice(2, 14).padEnd(12, '0');
}

/** Default id factory: `<prefix>-<12 random hex chars>`. */
export const randomId: IdFactory = (prefix) => `${prefix}-${randomHex()}`;

/** Generates an id not contained in `taken`. */
export function uniqueId(prefix: string, taken: ReadonlySet<string>, newId: IdFactory = randomId): string {
  for (let i = 0; i < 100; i++) {
    const id = newId(prefix);
    if (!taken.has(id)) return id;
  }
  let n = taken.size + 1;
  while (taken.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

/**
 * Returns a deep copy of `plan` with a new plan id and new ids for every nested entity (career phases, life
 * events, portfolio assets). Holdings are remapped to the new asset ids; holdings pointing to unknown assets keep
 * their assetId (validation reports them).
 */
export function withFreshIds(plan: Plan, takenPlanIds: ReadonlySet<string>, newId: IdFactory = randomId): Plan {
  const copy = structuredClone(plan);
  copy.id = uniqueId('plan', takenPlanIds, newId);

  const used = new Set<string>();
  const fresh = (prefix: string) => {
    const id = uniqueId(prefix, used, newId);
    used.add(id);
    return id;
  };

  if (Array.isArray(copy.career)) {
    for (const phase of copy.career) if (isPlainObject(phase)) phase.id = fresh('phase');
  }
  if (isPlainObject(copy.spending) && Array.isArray(copy.spending.events)) {
    for (const event of copy.spending.events) if (isPlainObject(event)) event.id = fresh('event');
  }
  const assetMap = new Map<string, string>();
  if (isPlainObject(copy.portfolio) && Array.isArray(copy.portfolio.assets)) {
    for (const asset of copy.portfolio.assets) {
      if (!isPlainObject(asset)) continue;
      const next = fresh('asset');
      if (typeof asset.id === 'string' && !assetMap.has(asset.id)) assetMap.set(asset.id, next);
      asset.id = next;
    }
  }
  if (isPlainObject(copy.assets) && Array.isArray(copy.assets.holdings)) {
    for (const holding of copy.assets.holdings) {
      if (isPlainObject(holding) && typeof holding.assetId === 'string') {
        holding.assetId = assetMap.get(holding.assetId) ?? holding.assetId;
      }
    }
  }
  return copy;
}
