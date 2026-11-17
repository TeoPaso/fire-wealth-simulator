'use client';

/** Stand-in for a Monte Carlo / sensitivity card while the first analysis of a plan runs, or when it failed. */
import { LoaderCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Banner, Card, Skeleton } from '../../ui';
import type { AnalysisView } from '../useAnalysis';

export function AnalysisPlaceholder({ analysis, title, height }: { analysis: AnalysisView; title: string; height: number }) {
  const t = useT();
  const failed = analysis.available && analysis.error !== null;
  return (
    <Card as="section" aria-label={title} aria-busy={!failed}>
      <h3 className="mb-3 text-base font-semibold text-slate-100">{title}</h3>
      {failed ? (
        <Banner tone="error" live="off" title={t('results.analysis.failed')}>
          {t('results.analysis.failedBody')}
        </Banner>
      ) : (
        <div className="relative" style={{ height }}>
          <Skeleton className="h-full w-full" />
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-300">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />
            {t('results.analysis.running')}
          </p>
        </div>
      )}
    </Card>
  );
}
