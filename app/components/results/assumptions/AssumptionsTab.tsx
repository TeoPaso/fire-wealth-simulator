'use client';

/**
 * "Ipotesi e fonti": the conventions behind every number, the plan's main assumptions, every TaxRules value of the
 * active plan (grouped as in the rules editor, flagged when changed from the 2026 defaults) with its sources, and the
 * disclaimer.
 */
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { IT_2026, type RateBand, type SourceRef } from '@/lib/engine';
import { useI18n, type I18nValue } from '@/lib/i18n';
import { Banner, Card } from '../../ui';
import { coefficientEntries, deepEqual, getRuleValue, ruleLabelKey, type RuleItem } from '../../inputs/model/taxRulesConfig';
import { CONVENTIONS, PLAN_FACTS, RULE_GROUPS, SIMPLIFICATIONS, groupSources, safeHref, ungroupedSources } from '../model/assumptions';
import type { TabProps } from '../types';


/** Decimals needed to show a rule value as stored (at most 2): 23 → 0, 1.23 → 2, 0.3 → 1. */
function decimalsOf(value: number): number {
  const [, fraction = ''] = String(value).split('.');
  return Math.min(2, fraction.length);
}

function formatNumberItem(i18n: I18nValue, kind: string, value: unknown, decimals?: number): string {
  const { t, format } = i18n;
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  switch (kind) {
    case 'eur':
      return format.eur(value, { decimals: decimals ?? decimalsOf(value) });
    case 'pct':
      return format.pct(value, decimals ?? decimalsOf(value));
    case 'years':
      return format.years(value);
    case 'age':
      return t('results.ageValue', { age: format.num(value) });
    case 'year':
      return String(value);
    default:
      return format.num(value, { decimals: 4 });
  }
}

function formatBands(i18n: I18nValue, value: unknown): ReactNode {
  if (!Array.isArray(value) || value.length === 0) return '—';
  const bands = value as Partial<RateBand>[];
  if (bands.length === 1 && (bands[0].upTo === null || bands[0].upTo === undefined)) {
    return i18n.t('results.rules.bandFlat', { rate: formatNumberItem(i18n, 'pct', bands[0].ratePct) });
  }
  return (
    <ul className="space-y-0.5">
      {(value as Partial<RateBand>[]).map((band, i) => (
        <li key={i}>
          {band.upTo === null || band.upTo === undefined
            ? i18n.t('results.rules.bandAbove', { rate: formatNumberItem(i18n, 'pct', band.ratePct) })
            : i18n.t('results.rules.bandUpTo', {
                upTo: formatNumberItem(i18n, 'eur', band.upTo),
                rate: formatNumberItem(i18n, 'pct', band.ratePct),
              })}
        </li>
      ))}
    </ul>
  );
}

function RuleValue({ item, value }: { item: RuleItem; value: unknown }) {
  const i18n = useI18n();
  const { t } = i18n;
  switch (item.kind) {
    case 'bands':
      return <>{formatBands(i18n, value)}</>;
    case 'coefficients': {
      const entries = coefficientEntries(value);
      if (entries.length === 0) return <>—</>;
      return (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
          {entries.map(([age, pct]) => (
            <li key={age} className="tabular">
              {t('results.rules.coefficient', { age, pct: formatNumberItem(i18n, 'pct', pct, 3) })}
            </li>
          ))}
        </ul>
      );
    }
    case 'bool':
      return <>{value === true ? t('results.yes') : value === false ? t('results.no') : '—'}</>;
    case 'text':
      return <>{typeof value === 'string' && value.trim() ? value : '—'}</>;
    case 'nullableYear':
      return <>{value === null ? t('results.rules.noEnd') : formatNumberItem(i18n, 'year', value)}</>;
    case 'optional':
      return value === undefined || value === null ? <>{t('results.rules.notModelled')}</> : <>{t('results.rules.modelled')}</>;
    default:
      return <>{formatNumberItem(i18n, item.kind, value, item.decimals)}</>;
  }
}

function SourceLinks({ sources }: { sources: Partial<SourceRef>[] }) {
  const { t } = useI18n();
  if (sources.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {sources.map((source, i) => {
        const href = safeHref(source.url);
        const text = typeof source.label === 'string' && source.label.trim() ? source.label : String(source.url ?? source.key ?? i + 1);
        return (
          <li key={`${String(source.key)}#${i}`} className="text-sm leading-snug">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-start gap-1.5 break-words text-cyan-300 underline-offset-2 hover:underline"
              >
                <span className="min-w-0 break-words">{text}</span>
                <ExternalLink aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="sr-only">{t('results.rules.newTab')}</span>
              </a>
            ) : (
              <span className="text-slate-300">{text}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RuleRow({ item, rules }: { item: { kind: RuleItem['kind']; path: string; decimals?: number }; rules: TabProps['data']['plan']['taxRules'] }) {
  const { t } = useI18n();
  const value = getRuleValue(rules, item.path);
  const changed = !deepEqual(value, getRuleValue(IT_2026, item.path));
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-b border-slate-800/70 py-1.5 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <dt className="text-slate-300">
        {t(ruleLabelKey(item.path))}
        {changed ? (
          <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-xs text-amber-100">{t('results.rules.changed')}</span>
        ) : null}
      </dt>
      <dd className="text-slate-100 sm:text-right">
        <RuleValue item={item as RuleItem} value={value} />
      </dd>
    </div>
  );
}

export function AssumptionsTab({ data }: TabProps) {
  const i18n = useI18n();
  const { t, format } = i18n;
  const { plan } = data;
  const rules = plan.taxRules;
  const others = ungroupedSources(rules);

  const planFacts: { key: (typeof PLAN_FACTS)[number]; value: string | string[] }[] = [
    { key: 'startYear', value: String(plan.profile.startYear) },
    { key: 'inflation', value: format.pct(plan.market.inflationPct, 1) },
    {
      key: 'portfolio',
      value: plan.portfolio.assets.map((a) =>
        t('results.assumptions.asset', {
          name: a.name,
          share: format.pct(a.allocationPct, 0),
          ret: format.pct(a.expectedReturnPct, 1),
          ter: format.pct(a.terPct, 2),
        }),
      ),
    },
    {
      key: 'pensionFund',
      value: plan.pensionFund.enabled
        ? t('results.assumptions.fund', { ret: format.pct(plan.pensionFund.expectedReturnPct, 1), cost: format.pct(plan.pensionFund.costPct, 2) })
        : t('results.assumptions.fundOff'),
    },
    { key: 'cash', value: format.pct(plan.market.cashRatePct, 1) },
    { key: 'swr', value: format.pct(plan.withdrawal.swrPct, 1) },
    {
      key: 'monteCarlo',
      value: t('results.assumptions.mc', {
        runs: format.num(plan.simulation.monteCarloRuns),
        seed: String(plan.simulation.seed),
        target: format.pct(plan.simulation.successTargetPct, 0),
      }),
    },
  ];

  return (
    <div className="space-y-4">
      <Card as="section" aria-labelledby="results-conventions">
        <h3 id="results-conventions" className="text-base font-semibold text-slate-100">
          {t('results.assumptions.conventionsTitle')}
        </h3>
        <dl className="mt-3 space-y-3">
          {CONVENTIONS.map((key) => (
            <div key={key}>
              <dt className="text-sm font-semibold text-slate-200">{t(`results.assumptions.conv.${key}.title`)}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-slate-300">{t(`results.assumptions.conv.${key}.body`)}</dd>
            </div>
          ))}
        </dl>
        <h4 className="mt-5 text-sm font-semibold text-slate-200">{t('results.assumptions.simplificationsTitle')}</h4>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-300">
          {SIMPLIFICATIONS.map((key) => (
            <li key={key}>{t(`results.assumptions.simpl.${key}`)}</li>
          ))}
        </ul>
      </Card>

      <Card as="section" aria-labelledby="results-plan-assumptions">
        <h3 id="results-plan-assumptions" className="text-base font-semibold text-slate-100">
          {t('results.assumptions.planTitle')}
        </h3>
        <dl className="mt-2">
          {planFacts.map((f) => (
            <div key={f.key} className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-b border-slate-800/70 py-1.5 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <dt className="text-slate-300">{t(`results.assumptions.plan.${f.key}`)}</dt>
              <dd className="break-words text-slate-100 sm:text-right">
                {Array.isArray(f.value) ? (
                  <ul className="space-y-0.5">
                    {f.value.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card as="section" aria-labelledby="results-rules">
        <h3 id="results-rules" className="text-base font-semibold text-slate-100">
          {t('results.rules.title', { label: typeof rules.label === 'string' ? rules.label : '—' })}
        </h3>
        <p className="mt-0.5 text-sm text-slate-400">{t('results.rules.description')}</p>
        <div className="mt-3 space-y-5">
          {RULE_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`results-rules-${group.id}`}>
              <h4 id={`results-rules-${group.id}`} className="text-sm font-semibold text-slate-200">
                {t(`inputs.rules.group.${group.id}`)}
              </h4>
              <dl className="mt-1">
                {group.items.flatMap((item) =>
                  item.kind === 'optional'
                    ? [
                        <RuleRow key={item.path} item={item} rules={rules} />,
                        ...(getRuleValue(rules, item.path) !== undefined
                          ? item.fields.map((f) => <RuleRow key={f.path} item={f} rules={rules} />)
                          : []),
                      ]
                    : [<RuleRow key={item.path} item={item} rules={rules} />],
                )}
              </dl>
              <SourceLinks sources={groupSources(rules, group.id)} />
            </section>
          ))}
          {others.length > 0 ? (
            <section aria-labelledby="results-rules-other">
              <h4 id="results-rules-other" className="text-sm font-semibold text-slate-200">
                {t('results.rules.otherSources')}
              </h4>
              <SourceLinks sources={others} />
            </section>
          ) : null}
        </div>
      </Card>

      <Banner tone="warning" live="off" title={t('results.disclaimer.title')}>
        {t('results.disclaimer.body')}
      </Banner>
    </div>
  );
}
