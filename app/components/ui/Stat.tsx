import type { ReactNode } from 'react';
import { cn } from './cn';

export type StatTone = 'default' | 'accent' | 'positive' | 'negative' | 'warning';

const TONES: Record<StatTone, string> = {
  default: 'text-slate-100',
  accent: 'text-cyan-300',
  positive: 'text-emerald-300',
  negative: 'text-rose-300',
  warning: 'text-amber-300',
};

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Secondary line under the value (context, comparison…). */
  sub?: ReactNode;
  tone?: StatTone;
  size?: 'sm' | 'md' | 'lg';
  /** Optional trailing element next to the label (e.g. a HelpTooltip). */
  aside?: ReactNode;
  className?: string;
}

/** Key figure: small label, large tabular value, optional sub-line and tone colour. */
export function Stat({ label, value, sub, tone = 'default', size = 'md', aside, className }: StatProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1 text-sm text-slate-400">
        <span className="truncate">{label}</span>
        {aside}
      </div>
      <div
        className={cn(
          'tabular mt-1 truncate font-semibold tracking-tight',
          size === 'lg' ? 'text-3xl sm:text-4xl' : size === 'md' ? 'text-2xl' : 'text-lg',
          TONES[tone],
        )}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-sm text-slate-400">{sub}</div> : null}
    </div>
  );
}
