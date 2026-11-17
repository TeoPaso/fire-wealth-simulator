'use client';

import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from './cn';

export type BannerTone = 'info' | 'warning' | 'error' | 'success';

const TONES: Record<BannerTone, { icon: typeof Info; box: string; icon_: string }> = {
  info: { icon: Info, box: 'border-sky-400/30 bg-sky-400/10 text-sky-50', icon_: 'text-sky-300' },
  warning: { icon: TriangleAlert, box: 'border-amber-400/30 bg-amber-400/10 text-amber-50', icon_: 'text-amber-300' },
  error: { icon: CircleAlert, box: 'border-rose-400/40 bg-rose-400/10 text-rose-50', icon_: 'text-rose-300' },
  success: { icon: CircleCheck, box: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-50', icon_: 'text-emerald-300' },
};

export interface BannerProps {
  tone?: BannerTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Shows a close button. */
  onDismiss?: () => void;
  /** Trailing actions (buttons/links). */
  actions?: ReactNode;
  /** Live-region politeness: errors/warnings default to role="alert", info/success to role="status". */
  live?: 'alert' | 'status' | 'off';
  className?: string;
}

/** Inline message box for info / warning / error / success, optionally dismissible. */
export function Banner({ tone = 'info', title, children, onDismiss, actions, live, className }: BannerProps) {
  const t = useT();
  const style = TONES[tone];
  const Icon = style.icon;
  const role = (live ?? (tone === 'error' || tone === 'warning' ? 'alert' : 'status')) as 'alert' | 'status' | 'off';
  return (
    <div
      role={role === 'off' ? undefined : role}
      className={cn('flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm', style.box, className)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', style.icon_)} />
      <div className="min-w-0 flex-1 leading-relaxed">
        <span className="sr-only">{t(`common.level.${tone}`)}: </span>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title ? 'mt-0.5' : undefined, 'break-words')}>{children}</div> : null}
        {actions ? <div className="mt-2 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('common.actions.dismiss')}
          title={t('common.actions.dismiss')}
          className="-m-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-current opacity-80 transition hover:bg-white/10 hover:opacity-100"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
