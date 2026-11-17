'use client';

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { Button } from './Button';
import { cn } from './cn';

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  /** Body text or form content (a form submit — e.g. Enter in a field — confirms). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' uses a red confirm button. Initial focus goes to the first focusable element (a field, else Cancel). */
  tone?: 'default' | 'danger';
  confirmDisabled?: boolean;
  /** Hide the confirm button (information-only dialog). */
  hideConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Modal confirmation built on the native <dialog> (focus trap, Escape and top layer for free).
 * Escape and backdrop clicks cancel. Fully controlled through `open`.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  confirmDisabled,
  hideConfirm,
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!confirmDisabled) onConfirm();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={children ? bodyId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className={cn(
        'm-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-0 text-slate-200 shadow-2xl shadow-black/50',
        className,
      )}
    >
      {open ? (
        <form onSubmit={submit} className="p-5">
          <h2 id={titleId} className="text-lg font-semibold text-slate-100">
            {title}
          </h2>
          {children ? (
            <div id={bodyId} className="mt-2 text-sm leading-relaxed text-slate-300">
              {children}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>
              {cancelLabel ?? t('common.actions.cancel')}
            </Button>
            {hideConfirm ? null : (
              <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} disabled={confirmDisabled}>
                {confirmLabel ?? t('common.actions.confirm')}
              </Button>
            )}
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
