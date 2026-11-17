'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export interface SegmentOption<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Accessible name when `label` is not descriptive (e.g. "IT" → "Italiano"). */
  ariaLabel?: string;
  /** Native tooltip. */
  title?: string;
}

export interface SegmentedControlProps<V extends string = string> {
  /** Accessible name of the group. */
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: readonly SegmentOption<V>[];
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Single-choice segmented control (role="radiogroup"): one tab stop, ←/→ (and ↑/↓) move and select.
 */
export function SegmentedControl<V extends string = string>({
  label,
  value,
  onChange,
  options,
  size = 'md',
  className,
}: SegmentedControlProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    if (next < 0) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex shrink-0 rounded-xl border border-slate-700 bg-slate-900/70 p-0.5', className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            title={option.title}
            tabIndex={index === selectedIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'whitespace-nowrap rounded-[10px] font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              checked ? 'bg-slate-700 text-cyan-200 shadow-sm' : 'text-slate-400 hover:text-slate-100',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
