/**
 * "Ipotesi e fonti" tab: the active plan's TaxRules values grouped like the rules editor (RULE_GROUPS), each group
 * linked to the sources (TaxRules.sources, by key) its default values come from.
 */
import type { SourceRef, TaxRules } from '@/lib/engine';
import { RULE_GROUPS, type RuleGroupId } from '../../inputs/model/taxRulesConfig';

export { RULE_GROUPS };

/** Conventions explained in the tab (i18n: results.assumptions.conv.<id>.title / .body). */
export const CONVENTIONS = ['todayEuros', 'nominal', 'midYear', 'returns', 'monteCarlo', 'locked', 'startOfAge', 'taxes'] as const;
/** Model simplifications (i18n: results.assumptions.simpl.<id>). */
export const SIMPLIFICATIONS = ['single', 'noAdvances', 'fixedRules', 'noFamily', 'annuity', 'stateRules'] as const;
/** Facts of the plan listed in the tab (i18n: results.assumptions.plan.<id>). */
export const PLAN_FACTS = ['startYear', 'inflation', 'portfolio', 'pensionFund', 'cash', 'swr', 'monteCarlo'] as const;

/** Source keys (TaxRules.sources[].key) behind each group of rules. */
export const GROUP_SOURCE_KEYS: Record<RuleGroupId, readonly string[]> = {
  general: ['irpef2'],
  irpef: ['irpef', 'irpef2'],
  employeeDeduction: ['detrazioni'],
  pensionerDeduction: ['pensioner'],
  cuneo: ['cuneo'],
  surcharges: ['addizionali'],
  supplementaryTreatment: ['trattamentoIntegrativo'],
  inps: ['inps'],
  productivityBonus: ['premio'],
  tfr: ['tfr', 'tfrReval', 'tfrTax'],
  pensionFund: ['fpCap', 'fpYield', 'fpExit', 'fpAccess'],
  investments: ['cg', 'bollo'],
  statePension: ['coeff'],
};

/** The plan's sources as a list, tolerating partial data from imported files. */
export function sourceList(rules: TaxRules): Partial<SourceRef>[] {
  return Array.isArray(rules.sources) ? (rules.sources as Partial<SourceRef>[]).filter((s) => s && typeof s === 'object') : [];
}

/** Sources of a group (found by key among the plan's sources). */
export function groupSources(rules: TaxRules, group: RuleGroupId): Partial<SourceRef>[] {
  const keys = GROUP_SOURCE_KEYS[group];
  return sourceList(rules).filter((s) => typeof s.key === 'string' && keys.includes(s.key));
}

/** Sources not attached to any group (e.g. added by the user), listed separately so none is hidden. */
export function ungroupedSources(rules: TaxRules): Partial<SourceRef>[] {
  const all = new Set(Object.values(GROUP_SOURCE_KEYS).flat());
  return sourceList(rules).filter((s) => typeof s.key !== 'string' || !all.has(s.key));
}

/** Only http(s) links are rendered as links (rules can come from imported files). */
export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}
