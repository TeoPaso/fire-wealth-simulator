'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { InfoTooltip } from './InfoTooltip';

export interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  tooltip?: string;
  className?: string;
}

export function ToggleSwitch({ label, checked, onChange, description, tooltip, className }: ToggleSwitchProps) {
  const id = useId();

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex flex-col min-w-0 flex-1 pr-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <label htmlFor={id} className="text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer select-none leading-snug break-words">
            {label}
          </label>
          {tooltip && <InfoTooltip content={tooltip} label={label} />}
        </div>
        {description && <span className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-tight break-words">{description}</span>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900",
          checked ? "bg-cyan-500" : "bg-slate-700"
        )}
      >
        <span className="sr-only">Use setting</span>
        <motion.span
          layout
          initial={false}
          animate={{
            x: checked ? 8 : -8
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0"
        />
      </button>
    </div>
  );
}
