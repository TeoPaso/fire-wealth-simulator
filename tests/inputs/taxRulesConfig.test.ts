/**
 * "Regole fiscali (avanzate)" editor config (app/components/inputs/model/taxRulesConfig.ts): every TaxRules value
 * is editable, every label/help text exists in both languages, path helpers never lose data.
 */
import { describe, expect, it } from 'vitest';
import { IT_2026, cloneRules, type TaxRules } from '@/lib/engine';
import { MESSAGES } from '@/lib/i18n/core';
import {
  RULE_GROUPS,
  coefficientEntries,
  configuredRulePaths,
  deepEqual,
  getBands,
  getRuleValue,
  ruleHelpKey,
  ruleLabelKey,
  setRuleValue,
} from '@/app/components/inputs/model/taxRulesConfig';

/** Paths the editor must cover: scalar leaves, plus arrays (bands) and the coefficients map as one item each. */
function rulePaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [prefix];
  if (value !== null && typeof value === 'object') {
    if (prefix.endsWith('transformationCoefficients')) return [prefix];
    return Object.entries(value).flatMap(([k, v]) => rulePaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe('RULE_GROUPS', () => {
  const configured = configuredRulePaths();

  it('covers every value of the 2026 rules (sources are shown as links)', () => {
    const expected = rulePaths(IT_2026).filter((p) => p !== 'sources');
    expect(expected.filter((p) => !configured.includes(p))).toEqual([]);
  });

  it('only configures paths that exist in the 2026 rules', () => {
    expect(configured.filter((p) => getRuleValue(IT_2026, p) === undefined)).toEqual([]);
  });

  it('has no duplicate paths', () => {
    expect(new Set(configured).size).toBe(configured.length);
  });

  it('has a label and a help text for every path, in Italian and English', () => {
    const missing: string[] = [];
    for (const lang of ['it', 'en'] as const) {
      for (const p of configured) {
        for (const key of [ruleLabelKey(p), ruleHelpKey(p)]) if (!(key in MESSAGES[lang])) missing.push(`${lang}:${key}`);
      }
      for (const g of RULE_GROUPS) {
        for (const key of [`inputs.rules.group.${g.id}`, `inputs.rules.groupDesc.${g.id}`]) {
          if (!(key in MESSAGES[lang])) missing.push(`${lang}:${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('path helpers', () => {
  it('reads and writes nested values without touching the rest', () => {
    const rules = cloneRules();
    setRuleValue(rules, 'irpef.cuneo.extraDeductionAmount', 1234);
    expect(getRuleValue(rules, 'irpef.cuneo.extraDeductionAmount')).toBe(1234);
    expect(rules.irpef.cuneo.extraDeductionFrom).toBe(IT_2026.irpef.cuneo.extraDeductionFrom);
    expect(getRuleValue(rules, 'irpef.nope.deeper')).toBeUndefined();
  });

  it('creates missing intermediate objects (partial stored plans) and deletes with undefined', () => {
    const rules = {} as TaxRules;
    setRuleValue(rules, 'irpef.supplementaryTreatment.amount', 1200);
    expect(rules.irpef.supplementaryTreatment).toEqual({ amount: 1200 });
    setRuleValue(rules, 'irpef.supplementaryTreatment', undefined);
    expect('supplementaryTreatment' in rules.irpef).toBe(false);
  });

  it('returns [] for bands that are not an array', () => {
    const rules = cloneRules();
    (rules.irpef as unknown as Record<string, unknown>).brackets = 'broken';
    expect(getBands(rules, 'irpef.brackets')).toEqual([]);
    expect(getBands(IT_2026, 'irpef.brackets')).toHaveLength(3);
  });

  it('sorts transformation coefficients by numeric age', () => {
    expect(coefficientEntries({ '67': 5.5, '9': 1, '100': 9, abc: 2 }).map(([k]) => k)).toEqual(['9', '67', '100', 'abc']);
    expect(coefficientEntries(null)).toEqual([]);
    expect(coefficientEntries([1, 2])).toEqual([]);
  });

  it('compares structures deeply', () => {
    expect(deepEqual(cloneRules(), IT_2026)).toBe(true);
    const changed = cloneRules();
    changed.irpef.brackets[0].ratePct = 22;
    expect(deepEqual(changed, IT_2026)).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });
});
