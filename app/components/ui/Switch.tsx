'use client';

import { useId, type ReactNode } from 'react';
import { HelpTooltip } from './HelpTooltip';
import { cn } from './cn';

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Secondary line under the label. */
  description?: ReactNode;
  help?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** On/off toggle (role="switch"); the whole label is clickable. Space/Enter toggle. */
export function Switch({ label, checked, onChange, description, help, disabled, id, className }: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? `sw-${autoId}`;
  const labelId = `${switchId}-label`;
  const descId = `${switchId}-desc`;
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <label id={labelId} htmlFor={switchId} className="cursor-pointer text-sm font-medium text-slate-200">
            {label}
          </label>
          {help ? <HelpTooltip content={help} label={label} /> : null}
        </div>
        {description ? (
          <p id={descId} className="mt-0.5 text-xs text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
          checked ? 'border-cyan-300 bg-cyan-400' : 'border-slate-600 bg-slate-700',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-5 w-5 rounded-full shadow transition-transform',
            checked ? 'translate-x-5 bg-slate-950' : 'translate-x-0.5 bg-slate-200',
          )}
        />
      </button>
    </div>
  );
}
