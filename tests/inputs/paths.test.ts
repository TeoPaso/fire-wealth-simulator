/**
 * Issue paths ↔ inputs panel (app/components/inputs/model/paths.ts): every value of a plan has a field (so its
 * issues are shown next to it), and every issue validatePlan can raise lands somewhere visible.
 */
import { describe, expect, it } from 'vitest';
import { createDefaultPlan, validatePlan, type Issue, type Plan } from '@/lib/engine';
import {
  SECTION_IDS,
  countIssuesBySection,
  fieldDomId,
  groupIssuesByPath,
  isFieldPath,
  normalizePath,
  sectionOfPath,
  unplacedIssues,
} from '@/app/components/inputs/model/paths';

/** Leaf paths of a JSON value, written like issue paths ('career[0].untilAge', 'x.coeff[67]'). */
function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => leafPaths(v, `${prefix}[${i}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => {
      const key = /^\d+$/.test(k) && prefix.endsWith('transformationCoefficients') ? `[${k}]` : prefix ? `.${k}` : k;
      return leafPaths(v, `${prefix}${key}`);
    });
  }
  return [prefix];
}

/** Plan metadata that is edited elsewhere (header) or never by hand. */
const NOT_INPUTS = /^(schemaVersion|id|name|notes|createdAt|updatedAt)$|^career\[\d+\]\.id$|^spending\.events\[\d+\]\.id$/;

/** Replaces every leaf with a value of the wrong kind, so validatePlan reports each one. */
function corrupt(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(corrupt);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, corrupt(v)]));
  }
  if (typeof value === 'number') return Number.NaN;
  if (typeof value === 'boolean') return 'yes';
  if (typeof value === 'string') return 42;
  return 'x';
}

describe('normalizePath', () => {
  it('writes numeric segments as brackets and drops quotes', () => {
    expect(normalizePath('career.1.untilAge')).toBe('career[1].untilAge');
    expect(normalizePath("taxRules.statePension.transformationCoefficients['67']")).toBe(
      'taxRules.statePension.transformationCoefficients[67]',
    );
    expect(normalizePath(' portfolio.assets[ 2 ].name ')).toBe('portfolio.assets[2].name');
    expect(normalizePath(undefined)).toBe('');
  });
});

describe('field coverage', () => {
  const plan = createDefaultPlan({ startYear: 2026, now: '2026-01-01T00:00:00.000Z' });
  plan.spending.events.push({ id: 'e1', label: 'Auto', age: 40, amountToday: 20000, years: 1 });

  it('every input value of the example plan has a field in the panel', () => {
    const missing = leafPaths(plan).filter((p) => !NOT_INPUTS.test(p) && !isFieldPath(p));
    expect(missing).toEqual([]);
  });

  it('every input value belongs to a section', () => {
    const orphan = leafPaths(plan).filter((p) => !NOT_INPUTS.test(p) && sectionOfPath(p) === null);
    expect(orphan).toEqual([]);
  });

  it('every issue validatePlan raises on a corrupted plan is shown next to a field or at the top of a section', () => {
    const issues = validatePlan(corrupt(plan) as Plan);
    expect(issues.length).toBeGreaterThan(50);
    const lost = issues.filter((i) => sectionOfPath(i.path) === null).map((i) => `${i.path} (${i.code})`);
    expect(lost).toEqual([]);
  });

  it('leaf-level issues of a corrupted plan sit on rendered fields', () => {
    const issues = validatePlan(corrupt(plan) as Plan);
    const leafPathsSet = new Set(leafPaths(plan).filter((p) => !NOT_INPUTS.test(p)));
    const notOnField = issues
      .filter((i) => leafPathsSet.has(normalizePath(i.path)) && !isFieldPath(i.path))
      .map((i) => `${i.path} (${i.code})`);
    expect(notOnField).toEqual([]);
  });
});

describe('sections and grouping', () => {
  it('maps roots to sections', () => {
    expect(sectionOfPath('profile.currentAge')).toBe('profile');
    expect(sectionOfPath('career[2].ralToday')).toBe('career');
    expect(sectionOfPath('assets.holdings[0].value')).toBe('wealth');
    expect(sectionOfPath('savingsPolicy.emergencyFundMonths')).toBe('portfolio');
    expect(sectionOfPath('savingsPolicy.voluntaryPension')).toBe('pensionFund');
    expect(sectionOfPath('retirement.fixedAge')).toBe('withdrawal');
    expect(sectionOfPath('simulation.seed')).toBe('market');
    expect(sectionOfPath('taxRules.irpef.brackets[1].upTo')).toBe('taxRules');
    expect(sectionOfPath('')).toBeNull();
    expect(sectionOfPath('somethingElse')).toBeNull();
  });

  it('lists every section once, in SPEC order', () => {
    expect(SECTION_IDS).toEqual([
      'profile',
      'career',
      'spending',
      'wealth',
      'portfolio',
      'pensionFund',
      'statePension',
      'withdrawal',
      'market',
      'taxRules',
    ]);
  });

  it('counts issues per section and keeps unplaced ones visible', () => {
    const issues: Issue[] = [
      { level: 'error', path: 'career[0].untilAge', code: 'careerFirstPhase' },
      { level: 'warning', path: 'career.1.tfrToFundPct', code: 'tfrBackToCompany' },
      { level: 'error', path: 'taxRules.irpef', code: 'missingField' },
      { level: 'error', path: '', code: 'invalidPlan' },
    ];
    const counts = countIssuesBySection(issues);
    expect(counts.get('career')).toEqual({ error: 1, warning: 1, info: 0 });
    expect(counts.get('taxRules')).toEqual({ error: 1, warning: 0, info: 0 });
    expect(unplacedIssues(issues, 'taxRules').map((i) => i.code)).toEqual(['missingField']);
    expect(unplacedIssues(issues, null).map((i) => i.code)).toEqual(['invalidPlan']);
    expect(groupIssuesByPath(issues).get('career[1].tfrToFundPct')?.[0].code).toBe('tfrBackToCompany');
  });

  it('builds stable DOM ids from equivalent paths', () => {
    expect(fieldDomId('career[1].untilAge')).toBe(fieldDomId('career.1.untilAge'));
    expect(fieldDomId('career[1].untilAge')).toMatch(/^in-[A-Za-z0-9-]+$/);
    expect(fieldDomId('career[1].untilAge')).not.toBe(fieldDomId('career[11].untilAge'));
  });
});
