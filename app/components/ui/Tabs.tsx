'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from './cn';

export interface TabItem<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Decorative icon before the label. */
  icon?: ReactNode;
  /** Panel content. Only the selected panel is mounted unless `keepMounted`. */
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<V extends string = string> {
  items: readonly TabItem<V>[];
  /** Controlled value. */
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  /** Accessible name of the tab list. */
  label: string;
  /** 'auto' selects on arrow-key focus; 'manual' needs Enter/Space (use it for heavy panels). */
  activation?: 'auto' | 'manual';
  keepMounted?: boolean;
  className?: string;
  listClassName?: string;
  panelClassName?: string;
}

/**
 * WAI-ARIA tabs with roving tabindex: ←/→ move, Home/End jump, Enter/Space activate (manual mode).
 * The tab list scrolls horizontally on narrow screens instead of overflowing the page: edge fades show that more
 * tabs are hidden on that side, and a focused or selected tab is scrolled into view (UX-13).
 */
export function Tabs<V extends string = string>({
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  label,
  activation = 'auto',
  keepMounted = false,
  className,
  listClassName,
  panelClassName,
}: TabsProps<V>) {
  const baseId = useId();
  const [valueState, setValueState] = useState<V | undefined>(defaultValue ?? items[0]?.value);
  const selected = valueProp ?? valueState ?? items[0]?.value;
  const [focusValue, setFocusValue] = useState<V | undefined>(undefined);
  const tabRefs = useRef(new Map<V, HTMLButtonElement>());
  const listRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });
  const tabbable = items.some((i) => i.value === focusValue) ? focusValue : selected;

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const start = list.scrollLeft > 1;
    const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
    setOverflow((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    measure();
    list.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(list);
    return () => {
      list.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [measure, items.length]);

  // Keep the selected tab visible (e.g. selected from code, or after a resize).
  useEffect(() => {
    if (selected !== undefined) tabRefs.current.get(selected)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selected]);

  const select = (v: V) => {
    if (valueProp === undefined) setValueState(v);
    onValueChange?.(v);
  };

  const enabled = items.filter((i) => !i.disabled);
  const moveFocus = (v: V) => {
    setFocusValue(v);
    tabRefs.current.get(v)?.focus();
    if (activation === 'auto') select(v);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: V) => {
    const index = enabled.findIndex((i) => i.value === current);
    if (index < 0) return;
    let next: V | undefined;
    if (event.key === 'ArrowRight') next = enabled[(index + 1) % enabled.length].value;
    else if (event.key === 'ArrowLeft') next = enabled[(index - 1 + enabled.length) % enabled.length].value;
    else if (event.key === 'Home') next = enabled[0].value;
    else if (event.key === 'End') next = enabled[enabled.length - 1].value;
    if (next !== undefined) {
      event.preventDefault();
      moveFocus(next);
    }
  };

  const tabId = (v: V) => `${baseId}-tab-${v}`;
  const panelId = (v: V) => `${baseId}-panel-${v}`;

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          aria-orientation="horizontal"
          className={cn(
            'scroll-thin flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-1',
            listClassName,
          )}
        >
          {items.map((item) => {
            const isSelected = item.value === selected;
            return (
              <button
                key={item.value}
                ref={(el) => {
                  if (el) tabRefs.current.set(item.value, el);
                  else tabRefs.current.delete(item.value);
                }}
                id={tabId(item.value)}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={isSelected || keepMounted ? panelId(item.value) : undefined}
                tabIndex={item.value === tabbable ? 0 : -1}
                disabled={item.disabled}
                onClick={() => select(item.value)}
                onFocus={(e) => {
                  setFocusValue(item.value);
                  e.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
                }}
                onKeyDown={(e) => onKeyDown(e, item.value)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'disabled:pointer-events-none disabled:opacity-50',
                  isSelected
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100',
                )}
              >
                {item.icon ? (
                  <span aria-hidden="true" className="inline-flex [&>svg]:h-4 [&>svg]:w-4">
                    {item.icon}
                  </span>
                ) : null}
                {item.label}
              </button>
            );
          })}
        </div>
        {/* Edge fades: more tabs are hidden on that side (decorative; the tabs stay reachable with ←/→). */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-px left-px w-8 rounded-l-xl bg-gradient-to-r from-slate-950 to-transparent transition-opacity',
            overflow.start ? 'opacity-100' : 'opacity-0',
          )}
        />
        <span
          aria-hidden="true"
          data-testid="tabs-more"
          data-visible={overflow.end || undefined}
          className={cn(
            'pointer-events-none absolute inset-y-px right-px flex w-10 items-center justify-end rounded-r-xl bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent pr-1 text-slate-300 transition-opacity',
            overflow.end ? 'opacity-100' : 'opacity-0',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
      {items.map((item) => {
        const isSelected = item.value === selected;
        if (!isSelected && !keepMounted) return null;
        return (
          <div
            key={item.value}
            id={panelId(item.value)}
            role="tabpanel"
            aria-labelledby={tabId(item.value)}
            hidden={!isSelected}
            tabIndex={0}
            className={cn('mt-4 rounded-xl', panelClassName)}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
