'use client';

import { ChartLine } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { EmptyState } from '../ui/EmptyState';

/** PLACEHOLDER — replaced by the results engineer (results tabs for the active plan). */
export function ResultsPanel() {
  const t = useT();
  return (
    <EmptyState
      icon={<ChartLine />}
      title={t('common.placeholder.resultsTitle')}
      description={t('common.placeholder.resultsBody')}
    />
  );
}
