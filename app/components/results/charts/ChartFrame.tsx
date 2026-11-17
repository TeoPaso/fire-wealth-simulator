'use client';

/**
 * Card wrapper of every results chart (dataviz: chart container): title, unit, legend, the chart itself (only
 * mounted once its box has a width, so hidden panels never render a 0×0 chart), and a "Mostra dati" toggle with
 * the accessible table alternative.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Table2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { Button, Card, cn } from '../../ui';
import { CHART } from './theme';

export interface LegendItem {
  key: string;
  label: string;
  color: string;
  /** Mirrors the mark: rect for bars/areas, line for lines, band for a translucent range. */
  shape: 'rect' | 'line' | 'band' | 'rule';
}

/** Width of an element, tracked with ResizeObserver (0 while hidden). */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function LegendSwatch({ item }: { item: Pick<LegendItem, 'color' | 'shape'> }) {
  if (item.shape === 'line') {
    return <span aria-hidden="true" className="inline-block h-0.5 w-4 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />;
  }
  if (item.shape === 'rule') {
    return <span aria-hidden="true" className="inline-block h-3.5 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3 w-3 shrink-0 rounded-[3px]"
      style={{ backgroundColor: item.color, opacity: item.shape === 'band' ? 0.45 : 1 }}
    />
  );
}

export function ChartLegend({ items, className }: { items: readonly LegendItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-300', className)}>
      {items.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5">
          <LegendSwatch item={item} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export interface ChartFrameProps {
  title: string;
  /** One-line explanation under the title. */
  description?: ReactNode;
  /** Unit label shown next to the title (e.g. "€ di oggi"). */
  unit?: string;
  /** Accessible name of the chart (what it shows, in words). */
  ariaLabel: string;
  legend?: readonly LegendItem[];
  /** Plot height in px, axis band included. */
  height: number;
  /** Renders the chart for the measured width (Recharts elements). */
  children: (width: number) => ReactNode;
  /** Table alternative, shown by "Mostra dati". */
  table: ReactNode;
  /** Notes under the chart. */
  footer?: ReactNode;
  /** Data is being recomputed: keep the frame, dim it. */
  stale?: boolean;
  /** Extra controls in the header (right side). */
  actions?: ReactNode;
  className?: string;
}

export function ChartFrame({
  title,
  description,
  unit,
  ariaLabel,
  legend,
  height,
  children,
  table,
  footer,
  stale,
  actions,
  className,
}: ChartFrameProps) {
  const t = useT();
  const [showData, setShowData] = useState(false);
  const [boxRef, width] = useElementWidth<HTMLDivElement>();
  const tableId = useId();
  const titleId = useId();

  return (
    <Card as="section" aria-labelledby={titleId} className={cn('min-w-0', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-base font-semibold text-slate-100">
            {title}
          </h3>
          {description ? <p className="mt-0.5 text-sm text-slate-400">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {unit ? (
            <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-xs text-slate-300">{unit}</span>
          ) : null}
          {actions}
        </div>
      </div>
      {legend && legend.length > 0 ? <ChartLegend items={legend} className="mb-2" /> : null}
      <figure
        aria-label={ariaLabel}
        aria-busy={stale || undefined}
        className={cn('m-0 transition-opacity duration-200', stale && 'opacity-50')}
      >
        <div ref={boxRef} style={{ height }} className="w-full min-w-0">
          {width > 0 ? (
            <ResponsiveContainer width="100%" height={height} initialDimension={{ width, height }}>
              {children(width) as React.ReactElement}
            </ResponsiveContainer>
          ) : null}
        </div>
      </figure>
      {footer ? <div className="mt-2 text-xs leading-relaxed text-slate-400">{footer}</div> : null}
      <div className="mt-2">
        <Button
          size="sm"
          variant="ghost"
          icon={<Table2 />}
          aria-expanded={showData}
          aria-controls={tableId}
          onClick={() => setShowData((v) => !v)}
          className="-ml-2"
        >
          {showData ? t('results.chart.hideData') : t('results.chart.showData')}
        </Button>
        <div id={tableId} hidden={!showData} className="mt-2">
          {showData ? table : null}
        </div>
      </div>
    </Card>
  );
}

/** Whether a chart of this width should use the compact layout. */
export function isCompact(width: number): boolean {
  return width > 0 && width < CHART.compactWidth;
}
