'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
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
 * The tab list scrolls horizontally on narrow screens instead of overflowing the page.
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
  const tabbable = items.some((i) => i.value === focusValue) ? focusValue : selected;

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
      <div
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
              onFocus={() => setFocusValue(item.value)}
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
