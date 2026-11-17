'use client';

import { ChartLine, SlidersHorizontal } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '../ui/cn';

export type MobilePanel = 'inputs' | 'results';

/** Bottom navigation (< 1024px) switching between the inputs and results panels. */
export function MobileTabBar({
  value,
  onChange,
  inputsId,
  resultsId,
}: {
  value: MobilePanel;
  onChange: (panel: MobilePanel) => void;
  inputsId: string;
  resultsId: string;
}) {
  const t = useT();
  const items = [
    { value: 'inputs' as const, label: t('common.nav.inputs'), icon: SlidersHorizontal, controls: inputsId },
    { value: 'results' as const, label: t('common.nav.results'), icon: ChartLine, controls: resultsId },
  ];
  return (
    <nav
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
              <Icon aria-hidden="true" className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
