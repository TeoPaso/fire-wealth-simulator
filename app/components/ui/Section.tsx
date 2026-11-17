'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

export interface SectionProps {
  title: ReactNode;
  /** One-line summary shown in the header (e.g. "35.000 € · 3 fasi"), visible when collapsed and expanded. */
  summary?: ReactNode;
  /** Decorative icon before the title. */
  icon?: ReactNode;
  /** Trailing header content outside the toggle button (e.g. an issue badge). Keep it non-interactive. */
  badge?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Stable id for the content region (generated if omitted). */
  id?: string;
  headingLevel?: 2 | 3;
  className?: string;
  children: ReactNode;
}

/**
 * Collapsible accordion section (WAI-ARIA disclosure): the header is a button with aria-expanded/aria-controls
 * inside a heading; collapsed content stays mounted but hidden so field drafts survive.
 */
export function Section({
  title,
  summary,
  icon,
  badge,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  id,
  headingLevel = 2,
  className,
  children,
}: SectionProps) {
  const autoId = useId();
  const regionId = id ?? `section-${autoId}`;
  const buttonId = `${regionId}-button`;
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  const toggle = () => {
    const next = !open;
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  return (
    <section className={cn('glass rounded-2xl border border-slate-800', className)}>
      <div className="flex items-center gap-2 pr-3">
        <Heading className="min-w-0 flex-1">
          <button
            id={buttonId}
            type="button"
            aria-expanded={open}
            aria-controls={regionId}
            onClick={toggle}
            className="group flex w-full min-w-0 items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-slate-800/40"
          >
            {icon ? (
              <span aria-hidden="true" className="inline-flex shrink-0 text-cyan-300 [&>svg]:h-5 [&>svg]:w-5">
                {icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-slate-100">{title}</span>
              {summary ? <span className="mt-0.5 block truncate text-sm font-normal text-slate-400">{summary}</span> : null}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')}
            />
          </button>
        </Heading>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div id={regionId} role="region" aria-labelledby={buttonId} hidden={!open} className="px-4 pb-4 pt-1">
        {children}
      </div>
    </section>
  );
}
