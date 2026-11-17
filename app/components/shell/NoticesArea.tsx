'use client';

import { useT } from '@/lib/i18n';
import { useNotices } from '@/lib/store/hooks';
import { Banner } from '../ui/Banner';

/** Store notices (migration, recovery, save failures, import results) as dismissible banners. */
export function NoticesArea() {
  const t = useT();
  const { notices, dismiss } = useNotices();
  if (notices.length === 0) return null;
  return (
    <div aria-label={t('common.notices.label')} role="region" className="shrink-0 px-4 pt-3">
      <div className="mx-auto max-w-app space-y-2">
        {notices.map((n) => (
          <Banner key={n.id} tone={n.level} onDismiss={() => dismiss(n.id)}>
            {t(n.messageKey, n.params)}
          </Banner>
        ))}
      </div>
    </div>
  );
}
