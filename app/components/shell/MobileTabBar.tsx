'use client';

import { ChartLine, SlidersHorizontal } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '../ui/cn';

export type MobilePanel = 'inputs' | 'results';

/** Live summary of the active plan shown on the "Risultati" button, so edits give feedback without switching. */
export interface ResultsBadge {
  /** Short visible text, e.g. "48". */
  text: string;
  /** Spoken text, e.g. "Età FIRE: 48 anni". */
  label: string;
  tone: 'ok' | 'warning' | 'error';
}

const BADGE_TONE: Record<ResultsBadge['tone'], string> = {
  ok: 'bg-cyan-400/20 text-cyan-100 ring-cyan-300/30',
  warning: 'bg-amber-400/20 text-amber-100 ring-amber-300/30',
  error: 'bg-rose-400/25 text-rose-100 ring-rose-300/40',
};

/** Bottom navigation (< 1024px) switching between the inputs and results panels. */
export function MobileTabBar({
  value,
  onChange,
  inputsId,
  resultsId,
  resultsBadge,
}: {
  value: MobilePanel;
  onChange: (panel: MobilePanel) => void;
  inputsId: string;
  resultsId: string;
  resultsBadge?: ResultsBadge | null;
}) {
  const t = useT();
  const items = [
    { value: 'inputs' as const, label: t('common.nav.inputs'), icon: SlidersHorizontal, controls: inputsId, badge: null },
    { value: 'results' as const, label: t('common.nav.results'), icon: ChartLine, controls: resultsId, badge: resultsBadge ?? null },
  ];
  return (
    <nav
      data-mobile-tabbar
      aria-label={t('common.nav.label')}
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/85 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-md">
        {items.map((item) => {
          const selected = item.value === value;
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              aria-current={selected ? 'page' : undefined}
              aria-controls={item.controls}
              aria-describedby={item.badge ? `${item.controls}-badge` : undefined}
              onClick={() => onChange(item.value)}
              className={cn(
                'relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                selected ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-100',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-8 top-0 h-0.5 rounded-full transition-colors',
                  selected ? 'bg-cyan-400' : 'bg-transparent',
                )}
              />
              <span className="relative inline-flex">
                <Icon aria-hidden="true" className="h-5 w-5" />
                {item.badge ? (
                  <span
                    aria-hidden="true"
                    data-testid="results-badge"
                    className={cn(
                      'absolute -top-2 left-full ml-1 whitespace-nowrap rounded-full px-1.5 py-px text-[11px] font-semibold leading-4 ring-1 ring-inset',
                      BADGE_TONE[item.badge.tone],
                    )}
                  >
                    {item.badge.text}
                  </span>
                ) : null}
              </span>
              {item.label}
              {/* The badge is the button's description: its name stays "Risultati". */}
              {item.badge ? (
                <span id={`${item.controls}-badge`} hidden>
                  {item.badge.label}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
