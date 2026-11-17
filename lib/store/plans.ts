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

/** Collects the paths of values that could not be kept as stored (see deepMerge). */
export interface MergeReport {
  /** Paths whose value was converted (number → text) or replaced by the default because of its type. */
  coerced: string[];
}

/**
 * Arrays of entities rendered by the UI. Their items are checked against a per-item template: items that are not
 * objects are dropped and text fields get the same type checks as the rest of the plan. Missing fields are NOT
 * filled in (validation reports them).
 */
let itemTemplates: Record<string, Record<string, unknown>> | null = null;
function itemTemplate(path: string): Record<string, unknown> | undefined {
  if (!itemTemplates) {
    const plan = createDefaultPlan();
    itemTemplates = {
      career: { ...plan.career[0], id: '', label: '' },
      'spending.events': { id: '', label: '', age: 0, amountToday: 0, years: 1 },
      'portfolio.assets': { ...plan.portfolio.assets[0], id: '', name: '' },
      'assets.holdings': { ...plan.assets.holdings[0], assetId: '' },
    };
  }
  return itemTemplates[path];
}

const join = (path: string, key: string) => (path === '' ? key : `${path}.${key}`);

/** A value of the wrong type for a text field: numbers and booleans become text, anything else the default. */
function coerceText(base: string, override: unknown, path: string, report?: MergeReport): string {
  if (typeof override === 'number' || typeof override === 'boolean' || typeof override === 'bigint') {
    report?.coerced.push(path);
    return String(override);
  }
  report?.coerced.push(path);
  return base;
}

/**
 * Checks the items of an array against `template` without filling in missing fields: text fields must be text,
 * an object or array cannot stand where the template has a primitive, nested objects are checked recursively.
 */
function sanitizeItem(template: Record<string, unknown>, item: Record<string, unknown>, path: string, report?: MergeReport) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(item)) {
    const value = item[key];
    const tpl = template[key];
    const at = join(path, key);
    if (value === undefined || value === null || !(key in template)) {
      out[key] = value === undefined ? undefined : structuredClone(value);
    } else if (typeof tpl === 'string') {
      out[key] = typeof value === 'string' ? value : coerceText(tpl, value, at, report);
    } else if (isPlainObject(tpl)) {
      out[key] = isPlainObject(value) ? sanitizeItem(tpl, value, at, report) : structuredClone(value);
    } else if ((typeof tpl === 'number' || typeof tpl === 'boolean') && typeof value === 'object') {
      report?.coerced.push(at);
      out[key] = tpl;
    } else {
      out[key] = structuredClone(value);
    }
  }
  return out;
}

function mergeArray(base: unknown[], override: unknown[], path: string, report?: MergeReport): unknown[] {
  const entity = itemTemplate(path);
  const template = entity ?? (isPlainObject(base[0]) ? base[0] : null);
  if (!template) return structuredClone(override);
  const out: unknown[] = [];
  override.forEach((item, i) => {
    const at = `${path}[${i}]`;
    if (isPlainObject(item)) out.push(sanitizeItem(template, item, at, report));
    else if (entity || base.every(isPlainObject)) report?.coerced.push(at); // not an entity: dropped (reported)
    else out.push(structuredClone(item));
  });
  return out;
}

/**
 * Deep-merges `override` over `base`, using the type of each `base` value to decide what can be kept:
 * - plain objects are merged key by key (keys unknown to `base` are kept, for forward compatibility);
 * - arrays in `override` replace the base array as a whole; their items are checked (not filled) against an item
 *   template (career phases, life events, portfolio assets, holdings, or the first item of the base array);
 * - primitive values in `override` win, even if they are invalid numbers (validation reports them);
 * - text fields only hold text: a number or boolean becomes its text, any other value keeps the default;
 * - an object or array where `base` has a number/boolean, `undefined`/`null`, or a non-object where `base` has an
 *   object/array, keep the base value so the UI never crashes on a missing section or an unrenderable value.
 * Every conversion of a present value is recorded in `report.coerced` so the caller can back up the original
 * data and tell the user. Returns a new value; inputs are not mutated.
 */
export function deepMerge<T>(base: T, override: unknown, report?: MergeReport, path = ''): T {
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) {
      if (override !== undefined && override !== null) report?.coerced.push(path);
      return structuredClone(base);
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) out[key] = deepMerge(base[key], override[key], report, join(path, key));
    for (const key of Object.keys(override)) {
      if (!(key in base) && override[key] !== undefined) out[key] = structuredClone(override[key]);
    }
    return out as T;
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(override)) {
      if (override !== undefined && override !== null) report?.coerced.push(path);
      return structuredClone(base) as T;
    }
    return mergeArray(base, override, path, report) as T;
  }
  if (override === undefined || override === null) return base;
  if (typeof base === 'string' && typeof override !== 'string') return coerceText(base, override, path, report) as T;
  if ((typeof base === 'number' || typeof base === 'boolean') && typeof override === 'object') {
    report?.coerced.push(path);
    return base;
  }
  return override as T;
}

/** Gives every career phase, life event and portfolio asset a unique non-empty string id (React keys, editing). */
function ensureEntityIds(plan: Plan, newId: IdFactory): void {
  const lists: [unknown, string][] = [
    [plan.career, 'phase'],
    [plan.spending?.events, 'event'],
    [plan.portfolio?.assets, 'asset'],
  ];
  for (const [list, prefix] of lists) {
    if (!Array.isArray(list)) continue;
    const seen = new Set<string>();
    for (const item of list as Record<string, unknown>[]) {
      if (typeof item.id !== 'string' || item.id === '' || seen.has(item.id)) item.id = uniqueId(prefix, seen, newId);
      seen.add(item.id as string);
    }
  }
}

/**
 * Turns stored/imported data into a structurally complete Plan by deep-merging it over `createDefaultPlan()`.
 * Values are kept as-is (an invalid plan stays invalid and editable), except values of a type the UI cannot show
 * (see deepMerge), which are listed in `report`. Returns null if `raw` is not an object.
 */
export function normalizePlan(raw: unknown, opts: { now?: string; report?: MergeReport; newId?: IdFactory } = {}): Plan | null {
  if (!isPlainObject(raw)) return null;
  const base = createDefaultPlan({ now: opts.now });
  const plan = deepMerge(base, raw, opts.report);
  ensureEntityIds(plan, opts.newId ?? randomId);
  return plan;
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
