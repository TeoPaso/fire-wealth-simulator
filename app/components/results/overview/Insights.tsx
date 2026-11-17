'use client';

/** Plain-language observations (from the summary and Monte Carlo) and the plan's warnings / notes. */
import { useMemo } from 'react';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { IssueLevel } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { Card, cn } from '../../ui';
import { useIssueText } from '../../inputs/issueText';
import { sectionOfPath } from '../../inputs/model/paths';
import { buildInsights, type InsightTone } from '../model/overview';
import type { TabProps } from '../types';

const TONE_ICON: Record<InsightTone, { icon: typeof Info; className: string; srKey: string }> = {
  positive: { icon: CircleCheck, className: 'text-emerald-300', srKey: 'results.insight.tone.positive' },
  neutral: { icon: Info, className: 'text-sky-300', srKey: 'results.insight.tone.neutral' },
  warning: { icon: TriangleAlert, className: 'text-amber-300', srKey: 'results.insight.tone.warning' },
};

const LEVEL_TONE: Record<IssueLevel, InsightTone> = { error: 'warning', warning: 'warning', info: 'neutral' };

export function Insights({ data }: TabProps) {
  const { t, format } = useI18n();
  const { plan, result, analysis } = data;
  const issueText = useIssueText();
  const mc = analysis.available && !analysis.stale ? (analysis.result?.monteCarlo ?? null) : null;
  const insights = useMemo(() => buildInsights(plan, result, mc, format), [plan, result, mc, format]);
  const notes = result.issues.filter((i) => i.level !== 'error');

  return (
    <Card as="section" aria-labelledby="results-insights">
      <h3 id="results-insights" className="mb-3 text-base font-semibold text-slate-100">
        {t('results.insight.title')}
      </h3>
      <ul className="space-y-2.5">
        {insights.map((insight) => {
          const tone = TONE_ICON[insight.tone];
          const Icon = tone.icon;
          return (
            <li key={insight.id} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-200">
              <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', tone.className)} />
              <span>
                <span className="sr-only">{t(tone.srKey)}: </span>
                {t(insight.key, insight.params)}
              </span>
            </li>
          );
        })}
      </ul>
      {notes.length > 0 ? (
        <>
          <h4 className="mb-2 mt-5 text-sm font-semibold text-slate-200">{t('results.insight.notesTitle')}</h4>
          <ul className="space-y-2">
            {notes.map((issue, i) => {
              const tone = TONE_ICON[LEVEL_TONE[issue.level]];
              const Icon = tone.icon;
              const section = sectionOfPath(issue.path);
              return (
                <li key={`${issue.code}#${issue.path}#${i}`} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-300">
                  <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', tone.className)} />
                  <span>
                    <span className="sr-only">{t(`common.level.${issue.level}`)}: </span>
                    {section ? <span className="text-slate-400">{t(`inputs.section.${section}`)} · </span> : null}
                    {issueText(issue)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
