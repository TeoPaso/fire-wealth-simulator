'use client';

import { useId, type ComponentPropsWithRef } from 'react';
import { CONTROL_CLASS, FieldLabel, FieldMessages, controlBorder, hasError, type FieldBaseProps } from './Field';
import { cn } from './cn';

export interface TextFieldProps
  extends FieldBaseProps,
    Omit<ComponentPropsWithRef<'input'>, 'value' | 'onChange' | 'id' | 'className' | 'children'> {
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
}

/** Labelled single-line text input with help tooltip, description and issue messages. */
export function TextField({
  label,
  hideLabel,
  help,
  description,
  issues = [],
  id,
  className,
  value,
  onChange,
  inputClassName,
  type = 'text',
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? `tf-${autoId}`;
  const descId = `${inputId}-desc`;
  const msgId = `${inputId}-msg`;
  const invalid = hasError(issues);
  return (
    <div data-field className={cn('min-w-0', className)}>
      <FieldLabel htmlFor={inputId} label={label} hideLabel={hideLabel} help={help} />
      <div className="min-w-0">
        <input
          id={inputId}
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={[description ? descId : null, msgId].filter(Boolean).join(' ')}
          className={cn(CONTROL_CLASS, controlBorder(invalid), inputClassName)}
          {...rest}
        />
        {description ? (
          <p id={descId} className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        ) : null}
        <FieldMessages id={msgId} issues={issues} />
      </div>
    </div>
  );
}
