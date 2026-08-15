'use client';

import React, { InputHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from './InfoTooltip';

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  tooltip?: string;
  error?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  suffix,
  tooltip,
  error,
  className,
  ...props
}: NumberInputProps) {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange(isNaN(val) ? 0 : val);
  };

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
      <div className="relative flex items-center mt-auto">
        <input
          id={id}
          type="number"
          value={value === 0 && props.placeholder ? '' : value}
          onChange={handleChange}
          className={cn(
            "w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all",
            error && "border-red-500 focus:ring-red-500/50 focus:border-red-500",
            suffix && "pr-9"
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-xs md:text-sm font-bold text-cyan-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
