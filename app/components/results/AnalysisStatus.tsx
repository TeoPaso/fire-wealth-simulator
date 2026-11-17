'use client';

/** "Calcolo in corso" indicator of the Monte Carlo / sensitivity analysis (polite live region). */
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import { useFormat, useT } from '@/lib/i18n';
import type { AnalysisView } from './useAnalysis';

export function AnalysisStatus({ analysis }: { analysis: AnalysisView }) {
  const t = useT();
  const format = useFormat();
  let content;
  if (analysis.running) {
    content = (
      <>
        <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 text-cyan-300 motion-safe:animate-spin" />
        <span>{t('results.analysis.running')}</span>
      </>
    );
  } else if (analysis.available && analysis.error) {
    content = (
      <>
        <CircleAlert aria-hidden="true" className="h-3.5 w-3.5 text-rose-300" />
        <span>{t('results.analysis.failed')}</span>
      </>
    );
  } else if (analysis.available && analysis.result) {
    content = (
      <>
        <CircleCheck aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" />
        <span>
          {t('results.analysis.done', {
            runs: format.num(analysis.result.monteCarlo.runs),
            seconds: format.num(analysis.result.durationMs / 1000, { decimals: 1, minDecimals: 1 }),
          })}
        </span>
      </>
    );
  } else {
    content = null;
  }
  return (
    <p role="status" aria-live="polite" className="inline-flex min-h-5 items-center gap-1.5 text-xs text-slate-400" data-testid="analysis-status" data-state={analysis.running ? 'running' : analysis.available ? 'done' : 'idle'}>
      {content}
    </p>
  );
}
