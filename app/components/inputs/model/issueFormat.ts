/**
 * Pure helpers to turn an engine Issue into display text (no React): param formatting and graceful handling of
 * params the engine did not provide.
 */
import type { Issue, Plan } from '@/lib/engine';
import type { MessageParams } from '@/lib/i18n/core';
import type { Formatters } from '@/lib/i18n/format';

/** Codes whose numeric params are all calendar years (validatePlan: {min, max} bounds of a year field). */
const CALENDAR_YEAR_CODES = new Set(['startYearRange', 'membershipYearRange']);

/** True when a numeric param is a calendar year (printed without a thousands separator: 2026, not 2.026). */
function isCalendarYear(code: string | undefined, key: string): boolean {
  if (code !== undefined && CALENDAR_YEAR_CODES.has(code)) return true;
  return /year/i.test(key) && !/years/i.test(key);
}

/**
 * Formats issue params for display: numbers are locale-formatted (up to 2 decimals), except calendar years (param
 * names containing "year" but not "years", e.g. `year`, `startYear`, or every param of a year-range code), printed
 * without a thousands separator. Strings pass through.
 */
export function formatIssueParams(params: Issue['params'], format: Formatters, code?: string): MessageParams | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const out: MessageParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'number') {
      out[key] = isCalendarYear(code, key) ? String(value) : format.num(value, { decimals: 2 });
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

const PLACEHOLDER = /\{\w+\}/;

/**
 * Issue messages keep every {param} inside a parenthetical "( … )" (checked by tests/inputs/issueMessages.test.ts),
 * so a message still reads well when the engine omits a param: a parenthetical holding an unfilled placeholder is
 * dropped instead of showing "{max}" to the user.
 */
export function dropUnfilled(text: string): string {
  if (!PLACEHOLDER.test(text)) return text;
  return text
    .replace(/\s*\([^()]*\{\w+\}[^()]*\)/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
}

const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * Makes an engine issue more specific when the plan shows its real cause (UI-side, the engine code stays):
 * - 'pfOrdinaryBenefit' with RITA chosen and an access age not before the old-age pension: the problem is the
 *   access age, not the retirement age (UX-12), so the message says which age to change and from when.
 */
export function refineIssue(issue: Issue, plan: Plan | null | undefined): Issue {
  if (!plan || issue.code !== 'pfOrdinaryBenefit') return issue;
  const pf = plan.pensionFund;
  const oldAge = plan.taxRules?.statePension?.oldAgeAge;
  const early = plan.taxRules?.pensionFund?.ritaMaxYearsEarly;
  if (pf?.accessMode !== 'rita' || !finite(pf.accessAge) || !finite(oldAge) || pf.accessAge < oldAge) return issue;
  return {
    ...issue,
    code: 'pfOrdinaryBenefitLateAccess',
    params: { ...issue.params, accessAge: pf.accessAge, oldAge, ...(finite(early) ? { ritaAge: oldAge - early } : {}) },
  };
}
