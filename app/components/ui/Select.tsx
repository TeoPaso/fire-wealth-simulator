'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  tooltip?: string;
  error?: string;
}

export function Select({ label, options, value, onChange, tooltip, error, className, ...props }: SelectProps) {
  const id = useId();

  return (
    <div className={cn("flex flex-col justify-between h-full space-y-1.5 min-w-0", className)}>
      <div className="flex items-start justify-between gap-1.5 min-w-0 flex-1">
        <label
          htmlFor={id}
          className="text-xs font-medium text-slate-200 cursor-pointer select-none leading-snug break-words"
          title={label}
        >
          {label}
        </label>
        {tooltip && (
          <div className="shrink-0 mt-0.5">
            <InfoTooltip content={tooltip} label={label} />
          </div>
        )}
      </div>
      <div className="relative mt-auto">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full appearance-none bg-slate-950/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 pr-9 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all truncate",
            error && "border-red-500 focus:ring-red-500/50 focus:border-red-500"
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white font-medium">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-cyan-400">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
