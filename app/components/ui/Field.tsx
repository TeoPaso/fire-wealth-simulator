'use client';

import type { ReactNode } from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { HelpTooltip } from './HelpTooltip';
import { cn } from './cn';

/** A message shown under a field. `message` is already translated (e.g. t(`issues.${issue.code}`, issue.params)). */
export interface FieldIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
}

/** Shared props of every labelled form control. */
export interface FieldBaseProps {
  /** Visible label (also the accessible name). */
  label: string;
  /** Visually hide the label (e.g. inside table rows); it stays available to assistive tech. */
  hideLabel?: boolean;
  /** Help text shown in a tooltip next to the label. */
  help?: ReactNode;
  /** Short hint under the control. */
  description?: ReactNode;
  /** Validation messages for this field (errors set aria-invalid). */
  issues?: readonly FieldIssue[];
  id?: string;
  className?: string;
}

/** Label row with the optional help tooltip. */
export function FieldLabel({
  htmlFor,
  label,
  hideLabel,
  help,
  id,
}: {
  htmlFor: string;
  label: string;
  hideLabel?: boolean;
  help?: ReactNode;
  id?: string;
}) {
  if (hideLabel) {
    return (
      <label id={id} htmlFor={htmlFor} className="sr-only">
        {label}
      </label>
    );
  }
  return (
    <div className="mb-1.5 flex min-h-6 items-center gap-1">
      <label id={id} htmlFor={htmlFor} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      {help ? <HelpTooltip content={help} label={label} /> : null}
    </div>
  );
}

const ISSUE_STYLE = {
  error: { icon: CircleAlert, className: 'text-rose-300' },
  warning: { icon: TriangleAlert, className: 'text-amber-200' },
  info: { icon: Info, className: 'text-sky-200' },
} as const;

/** Issue list under a field; a polite live region so new messages are announced. */
export function FieldMessages({ id, issues }: { id: string; issues: readonly FieldIssue[] }) {
  const t = useT();
  return (
    <div id={id} aria-live="polite" className={cn(issues.length > 0 && 'mt-1.5 space-y-1')}>
      {issues.map((issue, i) => {
        const style = ISSUE_STYLE[issue.level];
        const Icon = style.icon;
        return (
          <p key={`${issue.level}-${i}`} className={cn('flex items-start gap-1.5 text-xs leading-snug', style.className)}>
            <Icon aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="sr-only">{t(`common.level.${issue.level}`)}: </span>
              {issue.message}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export function hasError(issues: readonly FieldIssue[] | undefined): boolean {
  return !!issues?.some((i) => i.level === 'error');
}

/** Base classes of text-like inputs and selects. */
export const CONTROL_CLASS =
  'h-10 w-full min-w-0 rounded-xl border bg-slate-950/50 px-3 text-sm text-slate-100 transition-colors ' +
  'hover:border-slate-600 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60';

export function controlBorder(invalid: boolean): string {
  return invalid ? 'border-rose-400/80' : 'border-slate-700';
}
