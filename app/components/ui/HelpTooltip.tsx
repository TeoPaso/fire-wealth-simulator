'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from './cn';

export interface HelpTooltipProps {
  /** Help text (plain, non-interactive content). */
  content: ReactNode;
  /** What the help is about (usually the field label): the button is named "Aiuto: <label>". */
  label?: string;
  className?: string;
}

/**
 * Small "?" button showing help text. Opens on hover or click / Enter / Space (which pins it open, useful on
 * touch); Escape, blur, outside click, scroll or resize close it. It does NOT open on keyboard focus: tabbing
 * through a form would otherwise cover the next fields with bubbles (UX-09). The text is the button's accessible
 * description (a `hidden` element: referenced descriptions are read even when hidden, and it does not leak into
 * the name of a surrounding heading or label, UX-18), so screen-reader users hear it on focus. The bubble is
 * portalled to <body> (glass cards create containing blocks).
 */
export function HelpTooltip({ content, label, className }: HelpTooltipProps) {
  const t = useT();
  const descId = useId();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setHovered(false);
    setPinned(false);
  }, []);

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const bubble = bubbleRef.current;
    if (!open || !button || !bubble) return;
    const rect = button.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, viewportWidth - width - 8));
    const fitsBelow = rect.bottom + 8 + height <= window.innerHeight - 8;
    const top = fitsBelow || rect.top - 8 - height < 8 ? rect.bottom + 8 : rect.top - 8 - height;
    bubble.style.left = `${Math.round(left)}px`;
    bubble.style.top = `${Math.round(top)}px`;
    bubble.style.visibility = 'visible';
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !bubbleRef.current?.contains(target)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label ? t('common.ui.helpFor', { label }) : t('common.ui.help')}
        aria-describedby={descId}
        onClick={() => (pinned ? close() : setPinned(true))}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onBlur={() => setPinned(false)}
        className={cn(
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-cyan-300',
          open && 'text-cyan-300',
          className,
        )}
      >
        <CircleHelp aria-hidden="true" className="h-4 w-4" />
      </button>
      <span id={descId} hidden>
        {content}
      </span>
      {open
        ? createPortal(
            <div
              ref={bubbleRef}
              aria-hidden="true"
              style={{ position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
              className="z-50 w-max max-w-[min(20rem,calc(100vw-16px))] animate-fade-in rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-relaxed text-slate-200 shadow-xl shadow-black/40"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
