'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export type MenuEntry =
  | {
      type?: 'item';
      id: string;
      label: string;
      /** Secondary line under the label. */
      hint?: string;
      icon?: ReactNode;
      onSelect: () => void;
      tone?: 'default' | 'danger';
      disabled?: boolean;
    }
  | { type: 'separator'; id: string }
  | { type: 'label'; id: string; label: string };

export interface MenuProps {
  /** Accessible name of the trigger button. */
  label: string;
  /** Trigger icon. */
  icon?: ReactNode;
  /** Visible trigger text (otherwise the trigger is icon-only). */
  text?: ReactNode;
  items: readonly MenuEntry[];
  /** Which edge of the trigger the popup aligns to. */
  align?: 'start' | 'end';
  triggerClassName?: string;
  className?: string;
}

type ItemEntry = Extract<MenuEntry, { onSelect: () => void }>;
const isItem = (e: MenuEntry): e is ItemEntry => e.type === undefined || e.type === 'item';

/**
 * Menu button (WAI-ARIA menu pattern): Enter/Space/↓ open on the first item, ↑ on the last; ↑/↓/Home/End move,
 * Escape closes and returns focus to the trigger, Tab or an outside click closes.
 */
export function Menu({ label, icon, text, items, align = 'end', triggerClassName, className }: MenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabledItems = items.filter(isItem).filter((i) => !i.disabled);

  useEffect(() => {
    if (open) itemRefs.current[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const close = (focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(Math.max(0, enabledItems.length - 1));
    }
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = enabledItems.length;
    if (n === 0) return;
    if (e.key === 'ArrowDown') setActive((a) => (a + 1) % n);
    else if (e.key === 'ArrowUp') setActive((a) => (a - 1 + n) % n);
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(n - 1);
    else if (e.key === 'Escape') close(true);
    else if (e.key === 'Tab') {
      setOpen(false);
      return;
    } else return;
    e.preventDefault();
  };

  const choose = (item: ItemEntry) => {
    close(true);
    item.onSelect();
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={text ? undefined : label}
        title={label}
        onClick={() => (open ? close(false) : openAt(0))}
        onKeyDown={onTriggerKey}
        className={cn(
          'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-100',
          text ? 'px-3 text-sm font-medium' : 'w-10',
          open && 'bg-slate-800/70 text-slate-100',
          triggerClassName,
        )}
      >
        {icon ? (
          <span aria-hidden="true" className="inline-flex [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {icon}
          </span>
        ) : null}
        {text}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className={cn(
            'absolute top-full z-40 mt-1.5 w-max min-w-[14rem] max-w-[calc(100vw-2rem)] animate-fade-in rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-xl shadow-black/40 backdrop-blur',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((entry) => {
            if (entry.type === 'separator') return <div key={entry.id} role="separator" className="my-1 h-px bg-slate-800" />;
            if (entry.type === 'label') {
              return (
                <div key={entry.id} role="presentation" className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {entry.label}
                </div>
              );
            }
            const index = enabledItems.indexOf(entry);
            return (
              <button
                key={entry.id}
                ref={(el) => {
                  if (index >= 0) itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={index === active ? 0 : -1}
                disabled={entry.disabled}
                aria-disabled={entry.disabled || undefined}
                onClick={() => choose(entry)}
                onMouseEnter={() => index >= 0 && setActive(index)}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  'focus-visible:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50',
                  entry.tone === 'danger' ? 'text-rose-300 hover:bg-rose-400/10' : 'text-slate-200 hover:bg-slate-800',
                )}
              >
                {entry.icon ? (
                  <span aria-hidden="true" className="mt-0.5 inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4">
                    {entry.icon}
                  </span>
                ) : null}
                <span className="min-w-0">
                  <span className="block">{entry.label}</span>
                  {entry.hint ? <span className="block text-xs text-slate-400">{entry.hint}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
