'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { CONTROL_CLASS, FieldLabel, FieldMessages, controlBorder, hasError, type FieldBaseProps } from './Field';
import { cn } from './cn';

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<V extends string = string> extends FieldBaseProps {
  value: V;
  onChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  disabled?: boolean;
  name?: string;
  selectClassName?: string;
}

/**
 * Labelled native <select> (best keyboard/mobile support). If `value` is not among the options (e.g. an invalid
 * stored value) it is shown as an extra option instead of being silently replaced.
 */
export function Select<V extends string = string>({
  label,
  hideLabel,
  help,
  description,
  issues = [],
  id,
  className,
  value,
  onChange,
  options,
  disabled,
  name,
  selectClassName,
}: SelectProps<V>) {
  const autoId = useId();
  const selectId = id ?? `sel-${autoId}`;
  const descId = `${selectId}-desc`;
  const msgId = `${selectId}-msg`;
  const invalid = hasError(issues);
  const known = options.some((o) => o.value === value);
  return (
    <div className={cn('min-w-0', className)}>
      <FieldLabel htmlFor={selectId} label={label} hideLabel={hideLabel} help={help} />
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as V)}
          aria-invalid={invalid || undefined}
          aria-describedby={[description ? descId : null, msgId].filter(Boolean).join(' ')}
          className={cn(CONTROL_CLASS, controlBorder(invalid), 'cursor-pointer appearance-none truncate pr-9', selectClassName)}
        >
          {!known ? <option value={value}>{String(value)}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled} className="bg-slate-900 text-slate-100">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
      </div>
      {description ? (
        <p id={descId} className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      ) : null}
      <FieldMessages id={msgId} issues={issues} />
    </div>
  );
}
