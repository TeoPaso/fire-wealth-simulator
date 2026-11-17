'use client';

import { useState } from 'react';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { IT_2026, cloneRules, type SourceRef } from '@/lib/engine';
import { useI18n, useT } from '@/lib/i18n';
import { Button, ConfirmDialog, Section, cn } from '../../ui';
import { listOf, numOr, usePlanEditor } from '../editor';
import { Note, PathIssues, SubHeading } from '../fields';
import { normalizePath } from '../model/paths';
import { RULE_GROUPS, deepEqual, getRuleValue, type RuleGroup, type RuleItem } from '../model/taxRulesConfig';
import { RuleBands, RuleCoefficients } from './rules/RuleBands';
import { RuleBool, RuleNullableYear, RuleNumber, RuleOptional, RuleText, rulePlanPath } from './rules/RuleFields';

/**
 * Regole fiscali (avanzate): every TaxRules value of the plan, grouped by area, with a reset to the 2026 defaults
 * and the list of sources. Each plan owns its copy of the rules.
 */
export function TaxRulesSection() {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const [confirming, setConfirming] = useState(false);
  const modified = !deepEqual(plan.taxRules, IT_2026);
  const year = numOr(plan.taxRules.referenceYear);

  return (
    <div>
      <Note>{t('inputs.rules.intro', { year: Number.isFinite(year) ? String(year) : '—' })}</Note>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className={cn('min-w-0 flex-1 text-sm', modified ? 'text-amber-200' : 'text-emerald-300')}>
          {modified ? t('inputs.rules.statusModified') : t('inputs.rules.statusDefault')}
        </p>
        <Button size="sm" icon={<RotateCcw />} disabled={!modified} onClick={() => setConfirming(true)}>
          {t('inputs.rules.reset')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title={t('inputs.rules.resetTitle')}
        confirmLabel={t('inputs.rules.resetConfirm')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          update((d) => {
            d.taxRules = cloneRules(IT_2026);
          });
        }}
      >
        {t('inputs.rules.resetBody')}
      </ConfirmDialog>

      <div className="mt-4 space-y-2">
        {RULE_GROUPS.map((group) => (
          <RuleGroupPanel key={group.id} group={group} />
        ))}
      </div>

      <RuleSources />
    </div>
  );
}

/** True when `path` (an issue path) is the item's path or inside it. */
function isInside(path: string, itemPath: string): boolean {
  const p = normalizePath(path);
  const base = rulePlanPath(itemPath);
  return p === base || p.startsWith(`${base}.`) || p.startsWith(`${base}[`);
}

function RuleGroupPanel({ group }: { group: RuleGroup }) {
  const { t, tp } = useI18n();
  const { plan, issues } = usePlanEditor();
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const changed = group.items.filter(
    (item) => !deepEqual(getRuleValue(plan.taxRules, item.path), getRuleValue(IT_2026, item.path)),
  ).length;
  const groupIssues = issues.filter((i) => group.items.some((item) => isInside(i.path, item.path)));
  const hasError = groupIssues.some((i) => i.level === 'error');
  // Groups holding an error open by themselves (so "go to field" can reach it) until the user toggles them.
  const open = userOpen ?? hasError;

  return (
    <Section
      id={`rules-group-${group.id}`}
      headingLevel={3}
      className="rounded-xl border-slate-800/80 bg-slate-950/30"
      title={t(`inputs.rules.group.${group.id}`)}
      summary={changed > 0 ? tp('inputs.rules.changedCount', changed) : t('inputs.rules.unchanged')}
      badge={
        groupIssues.length > 0 ? (
          <span
            className={cn(
              'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
              hasError ? 'bg-rose-400/20 text-rose-200' : 'bg-amber-400/15 text-amber-100',
            )}
          >
            <span aria-hidden="true">{groupIssues.length}</span>
            <span className="sr-only">{tp('inputs.panel.issueCount', groupIssues.length)}</span>
          </span>
        ) : undefined
      }
      open={open}
      onOpenChange={setUserOpen}
    >
      <Note className="mb-4 text-xs">{t(`inputs.rules.groupDesc.${group.id}`)}</Note>
      <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
        {group.items.map((item) => (
          <RuleItemEditor key={item.path} item={item} />
        ))}
      </div>
    </Section>
  );
}

/** Collections and optional groups span the full width; single values take one grid cell. */
function RuleItemEditor({ item }: { item: RuleItem }) {
  switch (item.kind) {
    case 'bands':
      return (
        <div className="sm:col-span-2">
          <RuleBands path={item.path} />
        </div>
      );
    case 'coefficients':
      return (
        <div className="sm:col-span-2">
          <RuleCoefficients path={item.path} />
        </div>
      );
    case 'optional':
      return (
        <div className="sm:col-span-2">
          <RuleOptional item={item} />
        </div>
      );
    case 'bool':
      return (
        <div className="sm:col-span-2">
          <RuleBool path={item.path} />
        </div>
      );
    case 'text':
      return (
        <div className="sm:col-span-2">
          <RuleText path={item.path} />
        </div>
      );
    case 'nullableYear':
      return <RuleNullableYear path={item.path} />;
    default:
      return <RuleNumber kind={item.kind} path={item.path} decimals={item.decimals} />;
  }
}

/** Only http(s) links are rendered as links (rules can come from imported files). */
function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function RuleSources() {
  const t = useT();
  const { plan } = usePlanEditor();
  const sources = listOf(plan.taxRules.sources as Partial<SourceRef>[] | undefined);

  return (
    <div className="mt-5">
      <SubHeading help={t('inputs.rules.sourcesHelp')} label={t('inputs.rules.sourcesTitle')}>
        {t('inputs.rules.sourcesTitle')}
      </SubHeading>
      <PathIssues path="taxRules.sources" className="mb-2" />
      {sources.length === 0 ? (
        <Note className="text-xs">{t('inputs.rules.sourcesEmpty')}</Note>
      ) : (
        <ul className="space-y-1.5">
          {sources.map((source, i) => {
            const href = safeHref(source?.url);
            const text =
              typeof source?.label === 'string' && source.label.trim()
                ? source.label
                : typeof source?.url === 'string'
                  ? source.url
                  : String(source?.key ?? i + 1);
            return (
              <li key={`${String(source?.key ?? '')}#${i}`} className="text-sm leading-snug">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-start gap-1.5 break-words text-cyan-300 underline-offset-2 hover:underline"
                  >
                    <span className="min-w-0 break-words">{text}</span>
                    <ExternalLink aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="sr-only">{t('inputs.rules.opensInNewTab')}</span>
                  </a>
                ) : (
                  <span className="break-words text-slate-300">{text}</span>
                )}
                <PathIssues path={`taxRules.sources[${i}]`} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Summary line of the rules section. */
export function TaxRulesSummary() {
  const t = useT();
  const { plan } = usePlanEditor();
  return <>{deepEqual(plan.taxRules, IT_2026) ? t('inputs.rules.summaryDefault') : t('inputs.rules.summaryModified')}</>;
}
