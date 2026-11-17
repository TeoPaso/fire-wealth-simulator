/**
 * Issue messages (lib/i18n/messages/issues.ts): one per code the engine can raise, params only inside
 * parentheticals so a missing param degrades gracefully (dropUnfilled), calendar years printed without grouping.
 */
import { describe, expect, it } from 'vitest';
import * as validate from '@/lib/engine/validate';
import { createFormatters } from '@/lib/i18n/format';
import { MESSAGES } from '@/lib/i18n/core';
import { issues } from '@/lib/i18n/messages/issues';
import { dropUnfilled, formatIssueParams } from '@/app/components/inputs/model/issueFormat';

/** docs/SPEC.md §5.11. */
const SPEC_CODES = [
  'ageRange',
  'lifeExpectancyRange',
  'careerEmpty',
  'careerOrder',
  'careerFirstPhase',
  'negativeAmount',
  'pctRange',
  'mensilitaRange',
  'allocationSum',
  'unknownHoldingAsset',
  'fixedAgeRange',
  'eventAgeRange',
  'eventYears',
  'pfAccessTooEarly',
  'swrRange',
  'runsRange',
  'tfrBackToCompany',
  'returnVeryHigh',
  'realReturnNonPositive',
  'capitalShareAboveLegal',
  'ritaRequiresUnemployment',
  'claimBeforeOldAge',
  'singleAssetConcentration',
  'negativeSavingsWhileWorking',
  'bonusAboveCap',
  'bonusIneligibleIncome',
  'contributionAboveCap',
  'noStatePension',
  'pfShortMembership',
  'montanteEstimated',
  'bonusToFundDisabled',
  'tfrPartialCheckContract',
  'redemptionFallbackRita',
];

/** Codes exported by the validator (array of codes, or a record keyed by code), when available. */
function engineCodes(): string[] {
  const exported = (validate as Record<string, unknown>).ISSUE_CODES;
  if (Array.isArray(exported)) return exported.map(String);
  if (exported && typeof exported === 'object') return Object.keys(exported);
  return [];
}

describe('issue messages', () => {
  const codes = [...new Set([...SPEC_CODES, ...engineCodes()])];

  it('the validator exports its codes', () => {
    expect(engineCodes().length).toBeGreaterThan(0);
  });

  it('exist for every SPEC and engine code, in Italian and English', () => {
    const missing: string[] = [];
    for (const lang of ['it', 'en'] as const) {
      for (const code of codes) if (!(`issues.${code}` in MESSAGES[lang])) missing.push(`${lang}:${code}`);
    }
    expect(missing).toEqual([]);
  });

  it('keep every {param} inside a parenthetical', () => {
    const bad: string[] = [];
    for (const lang of ['it', 'en'] as const) {
      for (const [key, text] of Object.entries(issues[lang])) {
        const outside = text.replace(/\([^()]*\)/g, '');
        if (/\{\w+\}/.test(outside)) bad.push(`${lang}:${key}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('dropUnfilled', () => {
  it('drops the parenthetical holding an unfilled placeholder and tidies punctuation', () => {
    expect(dropUnfilled('Età non valida (ammessa da {min} a {max} anni).')).toBe('Età non valida.');
    expect(dropUnfilled('Il riscatto (a 60 anni): usa la RITA (da {age} anni).')).toBe('Il riscatto (a 60 anni): usa la RITA.');
    expect(dropUnfilled('Nessun parametro (qui).')).toBe('Nessun parametro (qui).');
  });
});

describe('formatIssueParams', () => {
  const it_ = createFormatters('it');

  it('formats numbers for the locale, but not calendar years', () => {
    expect(formatIssueParams({ max: 8, sum: 99.5, value: 'abc' }, it_)).toEqual({ max: '8', sum: '99,5', value: 'abc' });
    expect(formatIssueParams({ min: 1950, max: 2026 }, it_, 'membershipYearRange')).toEqual({ min: '1950', max: '2026' });
    expect(formatIssueParams({ startYear: 2026, years: 1200 }, it_)).toEqual({ startYear: '2026', years: '1.200' });
    expect(formatIssueParams(undefined, it_)).toBeUndefined();
  });
});

describe('refineIssue (UX-12: RITA with the default access age)', () => {
  it('blames the access age, not the retirement age, when RITA is chosen with an access age at the pension age', async () => {
    const { createDefaultPlan } = await import('@/lib/engine');
    const { refineIssue } = await import('@/app/components/inputs/model/issueFormat');
    const plan = createDefaultPlan();
    const issue = { level: 'info' as const, path: 'pensionFund.accessMode', code: 'pfOrdinaryBenefit', params: { age: 67 } };
    const rita = { ...plan, pensionFund: { ...plan.pensionFund, accessMode: 'rita' as const, accessAge: 67 } };
    const refined = refineIssue(issue, rita);
    expect(refined.code).toBe('pfOrdinaryBenefitLateAccess');
    expect(refined.params).toMatchObject({ accessAge: 67, oldAge: plan.taxRules.statePension.oldAgeAge, ritaAge: 62 });
    const text = dropUnfilled(MESSAGES.it[`issues.${refined.code}`]);
    expect(text).toContain('età di accesso');
    // Other causes keep the engine message.
    expect(refineIssue(issue, { ...rita, pensionFund: { ...rita.pensionFund, accessAge: 63 } })).toBe(issue);
    expect(refineIssue(issue, plan)).toBe(issue);
    expect(refineIssue(issue, null)).toBe(issue);
  });
});
