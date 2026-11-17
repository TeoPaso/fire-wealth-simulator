/**
 * Declarative description of the "Regole fiscali (avanzate)" editor: every TaxRules field, grouped by area.
 * tests/inputs/taxRulesConfig.test.ts checks that every field of IT_2026 is covered and every label/help exists.
 *
 * Labels and help texts use generated keys: `inputs.rules.field.<path>` and `inputs.rules.help.<path>`.
 */
import type { RateBand, TaxRules } from '@/lib/engine';

export type RuleNumberKind =
  /** Euro amount (nominal € of the reference year). */
  | 'eur'
  /** Percentage. */
  | 'pct'
  /** Duration in years (integer). */
  | 'years'
  /** Age in years (integer). */
  | 'age'
  /** Calendar year (integer, no thousands separator). */
  | 'year'
  /** Plain count (integer). */
  | 'count'
  /** Plain decimal number. */
  | 'number';

export type RuleItem =
  /** `decimals` overrides the default precision of the kind (e.g. 34,20 € of stamp duty). */
  | { kind: RuleNumberKind; path: string; decimals?: number }
  | { kind: 'nullableYear'; path: string }
  | { kind: 'bool'; path: string }
  | { kind: 'text'; path: string }
  /** RateBand[]: `amount` is the unit of `upTo`. */
  | { kind: 'bands'; path: string }
  /** Record<age, % of montante>. */
  | { kind: 'coefficients'; path: string }
  /** Optional object (absent = not modelled), with its own fields. */
  | { kind: 'optional'; path: string; fields: { kind: RuleNumberKind; path: string; decimals?: number }[] };

export type RuleGroupId =
  | 'general'
  | 'irpef'
  | 'employeeDeduction'
  | 'pensionerDeduction'
  | 'cuneo'
  | 'surcharges'
  | 'supplementaryTreatment'
  | 'inps'
  | 'productivityBonus'
  | 'tfr'
  | 'pensionFund'
  | 'investments'
  | 'statePension';

export interface RuleGroup {
  id: RuleGroupId;
  items: RuleItem[];
}

const DEDUCTION_FIELDS = [
  'band1Limit',
  'band1Amount',
  'band2Limit',
  'band2Base',
  'band2Extra',
  'band3Limit',
  'bonusFrom',
  'bonusTo',
  'bonusAmount',
] as const;

const eur = (path: string): RuleItem => ({ kind: 'eur', path });
const pct = (path: string): RuleItem => ({ kind: 'pct', path });

export const RULE_GROUPS: readonly RuleGroup[] = [
  {
    id: 'general',
    items: [
      { kind: 'text', path: 'label' },
      { kind: 'text', path: 'id' },
      { kind: 'year', path: 'referenceYear' },
    ],
  },
  {
    id: 'irpef',
    items: [{ kind: 'bands', path: 'irpef.brackets' }, { kind: 'bool', path: 'irpef.indexToInflation' }],
  },
  { id: 'employeeDeduction', items: DEDUCTION_FIELDS.map((f) => eur(`irpef.employeeDeduction.${f}`)) },
  { id: 'pensionerDeduction', items: DEDUCTION_FIELDS.map((f) => eur(`irpef.pensionerDeduction.${f}`)) },
  {
    id: 'cuneo',
    items: [
      { kind: 'bands', path: 'irpef.cuneo.exemptSumBands' },
      eur('irpef.cuneo.extraDeductionAmount'),
      eur('irpef.cuneo.extraDeductionFrom'),
      eur('irpef.cuneo.extraDeductionFullUpTo'),
      eur('irpef.cuneo.extraDeductionZeroAt'),
    ],
  },
  {
    id: 'surcharges',
    items: [
      { kind: 'bands', path: 'irpef.regionalSurchargeBands' },
      pct('irpef.municipalSurchargePct'),
      eur('irpef.municipalExemptionThreshold'),
    ],
  },
  {
    id: 'supplementaryTreatment',
    items: [
      {
        kind: 'optional',
        path: 'irpef.supplementaryTreatment',
        fields: [
          { kind: 'eur', path: 'irpef.supplementaryTreatment.amount' },
          { kind: 'eur', path: 'irpef.supplementaryTreatment.incomeLimit' },
          { kind: 'eur', path: 'irpef.supplementaryTreatment.capacityMargin' },
        ],
      },
    ],
  },
  {
    id: 'inps',
    items: [
      pct('inps.employeeRatePct'),
      pct('inps.additionalRatePct'),
      eur('inps.additionalThreshold'),
      eur('inps.ceiling'),
      { kind: 'bool', path: 'inps.indexThresholdsToInflation' },
      pct('inps.pensionAccrualRatePct'),
    ],
  },
  {
    id: 'productivityBonus',
    items: [
      pct('productivityBonus.ratePct'),
      eur('productivityBonus.cap'),
      eur('productivityBonus.priorYearIncomeLimit'),
      { kind: 'nullableYear', path: 'productivityBonus.validUntilYear' },
      pct('productivityBonus.afterRatePct'),
      eur('productivityBonus.afterCap'),
    ],
  },
  {
    id: 'tfr',
    items: [
      { kind: 'number', path: 'tfr.divisor' },
      pct('tfr.contributionPct'),
      pct('tfr.revalFixedPct'),
      pct('tfr.revalInflationSharePct'),
      pct('tfr.revalTaxPct'),
    ],
  },
  {
    id: 'pensionFund',
    items: [
      eur('pensionFund.deductionCap'),
      pct('pensionFund.yieldTaxPct'),
      pct('pensionFund.govBondYieldTaxPct'),
      pct('pensionFund.exitTaxMaxPct'),
      pct('pensionFund.exitTaxMinPct'),
      pct('pensionFund.exitTaxReductionPerYearPct'),
      { kind: 'years', path: 'pensionFund.exitTaxReductionAfterYears' },
      pct('pensionFund.earlyRedemptionTaxPct'),
      pct('pensionFund.maxCapitalSharePct'),
      { kind: 'years', path: 'pensionFund.minMembershipYears' },
      { kind: 'years', path: 'pensionFund.ritaMaxYearsEarly' },
      { kind: 'years', path: 'pensionFund.ritaMaxYearsEarlyUnemployed' },
      { kind: 'years', path: 'pensionFund.redemptionAfterUnemployedYears' },
      { kind: 'years', path: 'pensionFund.redemptionBlockedYearsBeforeOldAge' },
    ],
  },
  {
    id: 'investments',
    items: [
      pct('investments.capitalGainsPct'),
      pct('investments.govBondPct'),
      pct('investments.stampDutyPct'),
      { kind: 'eur', path: 'investments.cashStampDuty', decimals: 2 },
      eur('investments.cashStampDutyThreshold'),
      pct('investments.cashInterestTaxPct'),
    ],
  },
  {
    id: 'statePension',
    items: [
      { kind: 'age', path: 'statePension.oldAgeAge' },
      { kind: 'years', path: 'statePension.oldAgeMinYears' },
      { kind: 'age', path: 'statePension.fallbackAge' },
      { kind: 'years', path: 'statePension.fallbackMinYears' },
      { kind: 'count', path: 'statePension.installmentsPerYear' },
      { kind: 'coefficients', path: 'statePension.transformationCoefficients' },
    ],
  },
];

/** i18n keys of a rule field. */
export function ruleLabelKey(path: string): string {
  return `inputs.rules.field.${path}`;
}
export function ruleHelpKey(path: string): string {
  return `inputs.rules.help.${path}`;
}

/** Every field/collection path the editor renders (relative to TaxRules). */
export function configuredRulePaths(): string[] {
  const out: string[] = [];
  for (const group of RULE_GROUPS) {
    for (const item of group.items) {
      out.push(item.path);
      if (item.kind === 'optional') out.push(...item.fields.map((f) => f.path));
    }
  }
  return out;
}

/* ───────────────────────────── Path access ───────────────────────────── */

/** Reads a dotted path inside the rules (undefined when any step is missing). */
export function getRuleValue(rules: TaxRules, path: string): unknown {
  let cur: unknown = rules;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/**
 * Writes a dotted path inside a DRAFT of the rules, creating missing intermediate objects (partial stored plans).
 * `undefined` deletes the key (used for optional groups).
 */
export function setRuleValue(rules: TaxRules, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur = rules as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    const next = cur[key];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  if (value === undefined) delete cur[last];
  else cur[last] = value;
}

/** Bands at a path, or [] when the stored value is not an array. */
export function getBands(rules: TaxRules, path: string): Partial<RateBand>[] {
  const value = getRuleValue(rules, path);
  return Array.isArray(value) ? (value as Partial<RateBand>[]) : [];
}

/** Transformation coefficients sorted by age (numeric keys first, in ascending order). */
export function coefficientEntries(value: unknown): [string, unknown][] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).sort(([a], [b]) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

/** Deep structural equality (plain JSON data). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every(
    (k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}
