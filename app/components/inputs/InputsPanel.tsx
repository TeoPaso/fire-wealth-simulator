'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { EmptyState } from '../ui/EmptyState';

/** PLACEHOLDER — replaced by the inputs engineer (input sections for the active plan). */
export function InputsPanel() {
  const t = useT();
  return (
    <EmptyState
      icon={<SlidersHorizontal />}
      title={t('common.placeholder.inputsTitle')}
      description={t('common.placeholder.inputsBody')}
    />
  );
}
