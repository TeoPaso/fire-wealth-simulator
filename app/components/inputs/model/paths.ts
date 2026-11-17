/**
 * Issue paths ↔ input sections and fields. Pure (no React) so it can be unit-tested.
 *
 * Every Issue returned by validatePlan carries a `path` (e.g. 'career[1].untilAge'). The inputs panel shows an
 * issue next to the field rendered for that exact path; container paths ('career', 'portfolio.assets', …) are
 * shown at the top of their list; anything else is shown at the top of its section (or of the panel), so no
 * issue is ever hidden.
 */
import type { Issue } from '@/lib/engine';

export type SectionId =
  | 'profile'
  | 'career'
  | 'spending'
  | 'wealth'
  | 'portfolio'
  | 'pensionFund'
  | 'statePension'
  | 'withdrawal'
  | 'market'
  | 'taxRules';

/** Display order of the input sections (docs/SPEC.md §7). */
export const SECTION_IDS: readonly SectionId[] = [
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
];

/**
 * Canonical path: numeric segments written with dots ('career.1.untilAge') become brackets
 * ('career[1].untilAge'); quotes inside brackets are dropped ("x['67']" → 'x[67]'); whitespace is trimmed.
 */
export function normalizePath(path: unknown): string {
  return String(path ?? '')
    .trim()
    .replace(/\[\s*['"]?([^'"\]]*?)['"]?\s*\]/g, '[$1]')
    .replace(/\.(\d+)(?=[.[]|$)/g, '[$1]');
}

/** First segment of a path ('career[1].untilAge' → 'career'). */
export function rootOf(path: string): string {
  return normalizePath(path).split(/[.[]/)[0] ?? '';
}

const SECTION_BY_ROOT: Record<string, SectionId> = {
  profile: 'profile',
  career: 'career',
  spending: 'spending',
  assets: 'wealth',
  portfolio: 'portfolio',
  pensionFund: 'pensionFund',
  statePension: 'statePension',
  retirement: 'withdrawal',
  withdrawal: 'withdrawal',
  market: 'market',
  simulation: 'market',
  taxRules: 'taxRules',
};

/** Section showing the field at `path`, or null when the path belongs to no input section. */
export function sectionOfPath(path: string): SectionId | null {
  const p = normalizePath(path);
  if (p.startsWith('savingsPolicy.')) {
    return p === 'savingsPolicy.emergencyFundMonths' ? 'portfolio' : 'pensionFund';
  }
  // The savingsPolicy object itself (e.g. missing): its fields live in Investimenti and Fondo pensione.
  if (p === 'savingsPolicy') return 'portfolio';
  return SECTION_BY_ROOT[rootOf(p)] ?? null;
}

const ITEM = String.raw`\[\d+\]`;
const TAX_BANDS = String.raw`(?:irpef\.brackets|irpef\.regionalSurchargeBands|irpef\.cuneo\.exemptSumBands)`;
const DEDUCTION_FIELDS =
  'band1Limit|band1Amount|band2Limit|band2Base|band2Extra|band3Limit|bonusFrom|bonusTo|bonusAmount';

/**
 * Paths that the inputs panel renders as a field or as a list container (where its issues are displayed).
 * Kept in sync with the section components; tests/inputs/paths.test.ts checks every field of the example plan.
 */
const FIELD_PATTERNS: readonly RegExp[] = [
  /^profile\.(currentAge|lifeExpectancy|startYear)$/,
  new RegExp(
    `^career(${ITEM}(\\.(label|untilAge|ralToday|realRaisePct|mensilita|bonusGrossToday|bonusRegime|employeePensionPct|employerPensionPct|tfrToFundPct))?)?$`,
  ),
  /^retirement\.(mode|fixedAge)$/,
  /^spending\.(monthlyToday|retirementPct)$/,
  new RegExp(`^spending\\.events(${ITEM}(\\.(label|age|amountToday|years))?)?$`),
  /^savingsPolicy\.(emergencyFundMonths|voluntaryPension|voluntaryPensionFixedToday)$/,
  /^assets\.(cash|companyTfr|companyTfrYears)$/,
  new RegExp(`^assets\\.holdings(${ITEM}(\\.(assetId|value|costBasis))?)?$`),
  /^assets\.pensionFund\.(balance|taxableBasis|membershipStartYear)$/,
  /^assets\.inps\.(contributionYears|montante)$/,
  /^portfolio\.(equityBondCorrelation|rebalancing)$/,
  new RegExp(
    `^portfolio\\.assets(${ITEM}(\\.(id|name|kind|allocationPct|expectedReturnPct|volatilityPct|terPct|taxRatePct))?)?$`,
  ),
  /^pensionFund\.(enabled|name|expectedReturnPct|volatilityPct|costPct|govBondSharePct|equityCorrelation|accessMode|accessAge|capitalSharePct|annuityRatePct)$/,
  /^statePension\.(mode|monthlyNetToday|claimAge|realGdpGrowthPct|indexationPct)$/,
  /^withdrawal\.(swrPct|strategy|guardrailCutPct)$/,
  /^market\.(inflationPct|inflationVolatilityPct|cashRatePct)$/,
  /^simulation\.(monteCarloRuns|seed|successTargetPct)$/,
  // Tax rules: every field is editable (see model/taxRulesConfig.ts).
  /^taxRules\.(id|label|referenceYear)$/,
  new RegExp(`^taxRules\\.${TAX_BANDS}(${ITEM}(\\.(upTo|ratePct))?)?$`),
  /^taxRules\.irpef\.(indexToInflation|municipalSurchargePct|municipalExemptionThreshold)$/,
  new RegExp(`^taxRules\\.irpef\\.(employeeDeduction|pensionerDeduction)\\.(${DEDUCTION_FIELDS})$`),
  /^taxRules\.irpef\.cuneo\.(extraDeductionAmount|extraDeductionFrom|extraDeductionFullUpTo|extraDeductionZeroAt)$/,
  /^taxRules\.irpef\.supplementaryTreatment(\.(amount|incomeLimit|capacityMargin))?$/,
  /^taxRules\.inps\.(employeeRatePct|additionalRatePct|additionalThreshold|ceiling|indexThresholdsToInflation|pensionAccrualRatePct)$/,
  /^taxRules\.productivityBonus\.(ratePct|cap|priorYearIncomeLimit|validUntilYear|afterRatePct|afterCap)$/,
  /^taxRules\.tfr\.(divisor|contributionPct|revalFixedPct|revalInflationSharePct|revalTaxPct)$/,
  /^taxRules\.pensionFund\.(deductionCap|yieldTaxPct|govBondYieldTaxPct|exitTaxMaxPct|exitTaxMinPct|exitTaxReductionPerYearPct|exitTaxReductionAfterYears|earlyRedemptionTaxPct|maxCapitalSharePct|minMembershipYears|ritaMaxYearsEarly|ritaMaxYearsEarlyUnemployed|redemptionAfterUnemployedYears|redemptionBlockedYearsBeforeOldAge)$/,
  /^taxRules\.investments\.(capitalGainsPct|govBondPct|stampDutyPct|cashStampDuty|cashStampDutyThreshold|cashInterestTaxPct)$/,
  /^taxRules\.statePension\.(oldAgeAge|oldAgeMinYears|fallbackAge|fallbackMinYears|installmentsPerYear)$/,
  // Any key (a non-numeric age is reported on its own entry, which the editor renders too).
  /^taxRules\.statePension\.transformationCoefficients(\[[^\]]+\])?$/,
  // Sources list (shown as links at the bottom of the rules section).
  new RegExp(`^taxRules\\.sources(${ITEM}(\\.(key|label|url))?)?$`),
];

/** True when the panel renders a field (or list container) for this path, so its issues appear there. */
export function isFieldPath(path: string): boolean {
  const p = normalizePath(path);
  return FIELD_PATTERNS.some((re) => re.test(p));
}

/** Issues grouped by normalized path. */
export function groupIssuesByPath(issues: readonly Issue[]): Map<string, Issue[]> {
  const map = new Map<string, Issue[]>();
  for (const issue of issues) {
    const key = normalizePath(issue.path);
    const list = map.get(key);
    if (list) list.push(issue);
    else map.set(key, [issue]);
  }
  return map;
}

export interface IssueCounts {
  error: number;
  warning: number;
  info: number;
}

export function emptyCounts(): IssueCounts {
  return { error: 0, warning: 0, info: 0 };
}

/** Issue counts per section; issues outside every section are counted under `null`. */
export function countIssuesBySection(issues: readonly Issue[]): Map<SectionId | null, IssueCounts> {
  const out = new Map<SectionId | null, IssueCounts>();
  for (const issue of issues) {
    const section = sectionOfPath(issue.path);
    const counts = out.get(section) ?? emptyCounts();
    if (issue.level === 'error' || issue.level === 'warning' || issue.level === 'info') counts[issue.level] += 1;
    out.set(section, counts);
  }
  return out;
}

/**
 * Issues that have no field of their own: shown at the top of their section (section id) or of the panel (null).
 */
export function unplacedIssues(issues: readonly Issue[], section: SectionId | null): Issue[] {
  return issues.filter((i) => !isFieldPath(i.path) && sectionOfPath(i.path) === section);
}

/** DOM id of the control rendered for a path (stable across renders; used to focus a field from an issue). */
export function fieldDomId(path: string): string {
  return `in-${normalizePath(path).replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '')}`;
}
