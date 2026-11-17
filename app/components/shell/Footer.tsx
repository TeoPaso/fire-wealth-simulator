'use client';

import { useT } from '@/lib/i18n';

/** Disclaimer strip, always visible (bottom of the page on mobile, slim bar on desktop). */
export function Footer() {
  const t = useT();
  return (
    <footer className="shrink-0 border-t border-slate-800/80 px-4 py-3 text-xs leading-relaxed text-slate-400 lg:py-2">
      <div className="mx-auto flex max-w-app flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
        <p>{t('common.footer.disclaimer')}</p>
        <p className="shrink-0">{t('common.footer.privacy')}</p>
      </div>
    </footer>
  );
}
