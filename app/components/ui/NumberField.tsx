'use client';

import { useId, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { decimalSeparator, parseLocaleNumber, useI18n } from '@/lib/i18n';
import { CONTROL_CLASS, FieldLabel, FieldMessages, controlBorder, hasError, type FieldBaseProps, type FieldIssue } from './Field';
import { cn } from './cn';

export interface NumberFieldProps extends FieldBaseProps {
  value: number;
  /** Called only with valid numbers (parsable, within min/max, integer if required). */
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Arrow-key increment (Shift = ×10). Also sets the default number of decimals. */
  step?: number;
  /** Only whole numbers are committed. */
  integer?: boolean;
  /** Maximum decimals accepted/displayed (default: from `step`, or unlimited). */
  decimals?: number;
  /** Unit suffix shown inside the field, e.g. "€ oggi", "%", "anni". */
  unit?: string;
  /** Thousands separators in the displayed value (default true; false for calendar years, seeds…). */
  grouping?: boolean;
  disabled?: boolean;
  name?: string;
  inputClassName?: string;
}

function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  if (s.includes('e-')) return Math.min(10, Number(s.split('e-')[1]) + (s.split('.')[1]?.split('e')[0].length ?? 0));
  return s.split('.')[1]?.length ?? 0;
}

/** Caret position in the editable text matching `caret` in the formatted text (grouping separators removed). */
function editCaret(formatted: string, caret: number, decimalSep: string, max: number): number {
  let n = 0;
  for (const ch of formatted.slice(0, caret)) if ((ch >= '0' && ch <= '9') || ch === decimalSep || ch === '-') n += 1;
  return Math.min(n, max);
}

/**
 * Numeric input for today's-euro amounts, percentages, ages… Keeps a local draft string so users can type
 * "1," or "-" freely, accepts both "," and "." as decimal separator, and commits only valid numbers.
 * Invalid or out-of-range drafts are NOT committed and never silently clamped: the field shows why and keeps the
 * text until it is fixed (Esc restores the value in use). Engine issues are passed via `issues`.
 */
export function NumberField({
  label,
  hideLabel,
  help,
  description,
  issues = [],
  id,
  className,
  value,
  onChange,
  min,
  max,
  step,
  integer = false,
  decimals,
  unit,
  grouping = true,
  disabled,
  name,
  inputClassName,
}: NumberFieldProps) {
  const { t, lang, format } = useI18n();
  const autoId = useId();
  const inputId = id ?? `nf-${autoId}`;
  const unitId = `${inputId}-unit`;
  const descId = `${inputId}-desc`;
  const msgId = `${inputId}-msg`;

  // A value already holding decimals proves the field accepts them (keeps "1.234" from reading as 1234).
  const maxDecimals = Math.max(
    integer ? 0 : (decimals ?? (step !== undefined ? decimalsOf(step) : Infinity)),
    decimalsOf(value),
  );
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  if (!Object.is(prevValue, value)) {
    // The value changed from outside (another plan, import, reload): drop a stale draft unless the user is typing.
    setPrevValue(value);
    if (!focused && draft !== null) setDraft(null);
  }

  const shownDecimals = Math.min(6, Math.max(Number.isFinite(maxDecimals) ? maxDecimals : 0, decimalsOf(value)));
  const formatted = Number.isFinite(value) ? format.num(value, { decimals: shownDecimals, grouping }) : '';
  const editText = Number.isFinite(value) ? format.num(value, { decimals: 10, grouping: false }) : '';

  /**
   * On focus the formatted text ("1.500") becomes the editable one ("1500"). The swap is done here, synchronously,
   * keeping the selection: if React replaced the value on re-render, the selection would collapse to the end and
   * typing after Tab (which selects everything) would append to the old number ("1500" + "2100").
   */
  const onFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    if (draft !== null) return;
    const el = event.currentTarget;
    if (el.value !== editText) {
      // Everything selected (Tab) or nothing chosen yet (programmatic focus, select()): select the editable text.
      const all = el.selectionStart === 0 && (el.selectionEnd === 0 || el.selectionEnd === el.value.length);
      const caret = editCaret(el.value, el.selectionEnd ?? el.value.length, decimalSeparator(lang), editText.length);
      el.value = editText;
      if (all) el.select();
      else el.setSelectionRange(caret, caret);
    }
    setDraft(editText);
  };

  const check = (n: number): string | null => {
    if (integer && !Number.isInteger(n)) return t('common.ui.integerRequired');
    if (min !== undefined && n < min) return t('common.ui.belowMin', { min: format.num(min, { decimals: 6 }) });
    if (max !== undefined && n > max) return t('common.ui.aboveMax', { max: format.num(max, { decimals: 6 }) });
    return null;
  };

  const parse = (text: string) => parseLocaleNumber(text, { maxDecimals });

  let localError: string | null = null;
  if (draft !== null) {
    const parsed = parse(draft);
    if (parsed.kind === 'invalid') localError = t('common.ui.invalidNumber');
    else if (parsed.kind === 'number') localError = check(parsed.value);
    else if (showIncomplete) localError = t('common.ui.invalidNumber');
  }

  const commitText = (text: string) => {
    const parsed = parse(text);
    if (parsed.kind === 'number' && check(parsed.value) === null && !Object.is(parsed.value, value)) {
      onChange(parsed.value);
    }
  };

  const onBlur = () => {
    setFocused(false);
    if (draft === null) return;
    if (draft === editText) {
      setDraft(null);
      setShowIncomplete(false);
      return;
    }
    // "12," is finished typing once the user leaves the field.
    const text = draft.replace(/[.,]\s*$/, '');
    const parsed = parse(text);
    if (parsed.kind === 'number' && check(parsed.value) === null) {
      commitText(text);
      setDraft(null);
      setShowIncomplete(false);
    } else {
      setShowIncomplete(true);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && draft !== null && draft !== editText) {
      event.preventDefault();
      setDraft(editText);
      setShowIncomplete(false);
      return;
    }
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && step !== undefined) {
      const current = draft === null ? { kind: 'number' as const, value } : parse(draft);
      if (current.kind !== 'number' || !Number.isFinite(current.value)) return;
      event.preventDefault();
      const delta = (event.key === 'ArrowUp' ? 1 : -1) * step * (event.shiftKey ? 10 : 1);
      const precision = Math.max(decimalsOf(step), decimalsOf(current.value));
      const next = Number((current.value + delta).toFixed(Math.min(10, precision)));
      setDraft(format.num(next, { decimals: 10, grouping: false }));
      setShowIncomplete(false);
      if (check(next) === null && !Object.is(next, value)) onChange(next);
    }
  };

  const invalid = localError !== null || hasError(issues);
  const messages: FieldIssue[] = localError
    ? [
        {
          level: 'error',
          message: `${localError} ${t('common.ui.notSaved', { value: formatted || '—' })}`,
        },
        ...issues,
      ]
    : [...issues];
  const describedBy = [unit ? unitId : null, description ? descId : null, msgId].filter(Boolean).join(' ');

  return (
    <div data-field className={cn('min-w-0', className)}>
      <FieldLabel htmlFor={inputId} label={label} hideLabel={hideLabel} help={help} />
      <div className="min-w-0">
        <div className="relative">
          <input
            id={inputId}
            name={name}
            type="text"
            inputMode={min !== undefined && min >= 0 ? 'decimal' : 'text'}
            autoComplete="off"
            spellCheck={false}
            lang={lang}
            disabled={disabled}
            value={draft ?? (focused ? editText : formatted)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={(e) => {
              setDraft(e.target.value);
              setShowIncomplete(false);
              commitText(e.target.value);
            }}
            onKeyDown={onKeyDown}
            className={cn(CONTROL_CLASS, controlBorder(invalid), 'tabular text-right', inputClassName)}
            style={unit ? { paddingRight: `calc(${unit.length}ch + 1.25rem)` } : undefined}
          />
          {unit ? (
            <span
              id={unitId}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center whitespace-nowrap text-sm text-slate-400"
            >
              {unit}
            </span>
          ) : null}
        </div>
        {description ? (
          <p id={descId} className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        ) : null}
        <FieldMessages id={msgId} issues={messages} />
      </div>
    </div>
  );
}
