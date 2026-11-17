'use client';

/**
 * "Dati" panel: the active plan's inputs as accordion sections (docs/SPEC.md §7), each with a one-line summary
 * and an issue badge. Validation issues come from validatePlan (usePlanValidation) and are shown next to the field
 * of their exact path; errors are also listed at the top with a link that opens the section and focuses the field.
 */
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  Activity,
  BriefcaseBusiness,
  ChartPie,
  ChevronsDownUp,
  ChevronsUpDown,
  Landmark,
  PiggyBank,
  Receipt,
  Scale,
  Sunset,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { Issue } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { useActivePlan, usePlanValidation } from '@/lib/store/hooks';
import { PanelBoundary } from '../shell/PanelBoundary';
import { Banner, FieldMessages, HelpTooltip, IconButton, Section } from '../ui';
import { PlanEditorProvider, usePlanEditor } from './editor';
import {
  SECTION_IDS,
  countIssuesBySection,
  emptyCounts,
  fieldDomId,
  isFieldPath,
  sectionOfPath,
  unplacedIssues,
  type SectionId,
} from './model/paths';
import { CareerSection, CareerSummary } from './sections/CareerSection';
import { MarketSection, MarketSummary } from './sections/MarketSection';
import { PensionFundSection, PensionFundSummary } from './sections/PensionFundSection';
import { PortfolioSection, PortfolioSummary } from './sections/PortfolioSection';
import { ProfileSection, ProfileSummary } from './sections/ProfileSection';
import { SpendingSection, SpendingSummary } from './sections/SpendingSection';
import { StatePensionSection, StatePensionSummary } from './sections/StatePensionSection';
import { TaxRulesSection, TaxRulesSummary } from './sections/TaxRulesSection';
import { WealthSection, WealthSummary } from './sections/WealthSection';
import { WithdrawalSection, WithdrawalSummary } from './sections/WithdrawalSection';

interface SectionDef {
  icon: ReactNode;
  Body: ComponentType;
  Summary: ComponentType;
}

const SECTIONS: Record<SectionId, SectionDef> = {
  profile: { icon: <UserRound />, Body: ProfileSection, Summary: ProfileSummary },
  career: { icon: <BriefcaseBusiness />, Body: CareerSection, Summary: CareerSummary },
  spending: { icon: <Receipt />, Body: SpendingSection, Summary: SpendingSummary },
  wealth: { icon: <Wallet />, Body: WealthSection, Summary: WealthSummary },
  portfolio: { icon: <ChartPie />, Body: PortfolioSection, Summary: PortfolioSummary },
  pensionFund: { icon: <PiggyBank />, Body: PensionFundSection, Summary: PensionFundSummary },
  statePension: { icon: <Landmark />, Body: StatePensionSection, Summary: StatePensionSummary },
  withdrawal: { icon: <Sunset />, Body: WithdrawalSection, Summary: WithdrawalSummary },
  market: { icon: <Activity />, Body: MarketSection, Summary: MarketSummary },
  taxRules: { icon: <Scale />, Body: TaxRulesSection, Summary: TaxRulesSummary },
};

/** DOM id of a section's content region (its toggle button is `<id>-button`). */
const sectionDomId = (id: SectionId) => `inputs-section-${id}`;

/** Per-viewer convenience: which sections are open survives a reload (never required). */
const OPEN_STORAGE_KEY = 'fire-planner:ui:inputs-open';
type OpenState = Record<SectionId, boolean>;

function defaultOpen(): OpenState {
  return Object.fromEntries(SECTION_IDS.map((id) => [id, id === 'profile'])) as OpenState;
}

function loadOpen(): OpenState {
  const state = defaultOpen();
  try {
    const raw = window.localStorage.getItem(OPEN_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      for (const id of SECTION_IDS) {
        const v = (parsed as Record<string, unknown>)[id];
        if (typeof v === 'boolean') state[id] = v;
      }
    }
  } catch {
    // Storage unavailable or unreadable: start from the defaults.
  }
  return state;
}

function saveOpen(state: OpenState): void {
  try {
    window.localStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode, quota): the open state is only a convenience.
  }
}

export function InputsPanel() {
  const plan = useActivePlan();
  const issues = usePlanValidation(plan);
  return (
    <PlanEditorProvider plan={plan} issues={issues}>
      <InputsSections />
    </PlanEditorProvider>
  );
}

function InputsSections() {
  const { t } = useI18n();
  const { issues } = usePlanEditor();
  const [open, setOpen] = useState<OpenState>(loadOpen);
  const counts = useMemo(() => countIssuesBySection(issues), [issues]);

  useEffect(() => saveOpen(open), [open]);

  const setSection = useCallback((id: SectionId, value: boolean) => setOpen((prev) => ({ ...prev, [id]: value })), []);
  const allOpen = SECTION_IDS.every((id) => open[id]);
  const setAll = (value: boolean) => setOpen(Object.fromEntries(SECTION_IDS.map((id) => [id, value])) as OpenState);

  /** Opens the section of an issue and moves focus to its field (or to the section header when it has none). */
  const goTo = useCallback(
    (issue: Issue) => {
      const section = sectionOfPath(issue.path);
      if (!section) return;
      setSection(section, true);
      requestAnimationFrame(() => {
        const field = isFieldPath(issue.path) ? document.getElementById(fieldDomId(issue.path)) : null;
        const usable = field && !(field as HTMLInputElement).disabled && field.offsetParent !== null ? field : null;
        const target = usable ?? document.getElementById(`${sectionDomId(section)}-button`);
        if (!target) return;
        target.scrollIntoView({ block: 'center' });
        target.focus({ preventScroll: true });
      });
    },
    [setSection],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-400">
          {t('inputs.panel.intro')}{' '}
          <HelpTooltip className="-my-1 align-middle" content={t('inputs.panel.todayEurosHelp')} label={t('inputs.panel.todayEurosLabel')} />
        </p>
        <IconButton
          size="sm"
          icon={allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
          label={allOpen ? t('inputs.panel.collapseAll') : t('inputs.panel.expandAll')}
          onClick={() => setAll(!allOpen)}
        />
      </div>

      <IssueOverview onGoTo={goTo} />

      {SECTION_IDS.map((id) => {
        const def = SECTIONS[id];
        const c = counts.get(id) ?? emptyCounts();
        return (
          <Section
            key={id}
            id={sectionDomId(id)}
            icon={def.icon}
            title={t(`inputs.section.${id}`)}
            summary={<def.Summary />}
            badge={<IssueBadge errors={c.error} warnings={c.warning} />}
            open={open[id]}
            onOpenChange={(v) => setSection(id, v)}
          >
            <SectionIssues id={id} />
            <PanelBoundary>
              <def.Body />
            </PanelBoundary>
          </Section>
        );
      })}
    </div>
  );
}

/** Error / warning counts of a section (non-interactive; the details are inside the section). */
function IssueBadge({ errors, warnings }: { errors: number; warnings: number }) {
  const { tp } = useI18n();
  if (errors === 0 && warnings === 0) return null;
  return (
    <span className="flex items-center gap-1">
      {errors > 0 ? (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-400/20 px-1.5 text-xs font-semibold text-rose-200">
          <span aria-hidden="true">{errors}</span>
          <span className="sr-only">{tp('inputs.panel.errorCount', errors)}</span>
        </span>
      ) : null}
      {warnings > 0 ? (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-400/15 px-1.5 text-xs font-semibold text-amber-100">
          <span aria-hidden="true">{warnings}</span>
          <span className="sr-only">{tp('inputs.panel.warningCount', warnings)}</span>
        </span>
      ) : null}
    </span>
  );
}

/** Issues of a section that have no field of their own (shown at its top, so none is ever hidden). */
function SectionIssues({ id }: { id: SectionId }) {
  const { issues, issueText } = usePlanEditor();
  const list = unplacedIssues(issues, id);
  if (list.length === 0) return null;
  return (
    <div className="mb-3">
      <FieldMessages id={`${sectionDomId(id)}-issues`} issues={list.map((i) => ({ level: i.level, message: issueText(i) }))} />
    </div>
  );
}

/** Max errors listed in the overview (the section badges count all of them). */
const MAX_LISTED = 8;

/**
 * Top-of-panel summary: the errors that block the computation, each with a link to its field, plus the issues
 * whose path belongs to no section.
 */
function IssueOverview({ onGoTo }: { onGoTo: (issue: Issue) => void }) {
  const { t, tp } = useI18n();
  const { issues, issueText } = usePlanEditor();
  const errors = issues.filter((i) => i.level === 'error');
  const orphans = unplacedIssues(issues, null).filter((i) => i.level !== 'error');

  return (
    <>
      {errors.length > 0 ? (
        <Banner tone="error" live="off" title={tp('inputs.panel.errorsTitle', errors.length)}>
          <p>{t('inputs.panel.errorsBody')}</p>
          <ul className="mt-2 space-y-1">
            {errors.slice(0, MAX_LISTED).map((issue, i) => {
              const section = sectionOfPath(issue.path);
              return (
                <li key={`${issue.path}-${issue.code}-${i}`}>
                  {section ? (
                    <button
                      type="button"
                      onClick={() => onGoTo(issue)}
                      className="text-left underline decoration-rose-300/60 underline-offset-2 hover:decoration-rose-200"
                    >
                      <span className="font-medium">{t(`inputs.section.${section}`)}</span>
                      {': '}
                      {issueText(issue)}
                    </button>
                  ) : (
                    <span>{issueText(issue)}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {errors.length > MAX_LISTED ? <p className="mt-1 text-xs">{tp('inputs.panel.moreErrors', errors.length - MAX_LISTED)}</p> : null}
        </Banner>
      ) : null}
      {orphans.length > 0 ? (
        <div className="rounded-xl border border-slate-800 px-3 py-2">
          <FieldMessages id="inputs-plan-issues" issues={orphans.map((i) => ({ level: i.level, message: issueText(i) }))} />
        </div>
      ) : null}
    </>
  );
}
