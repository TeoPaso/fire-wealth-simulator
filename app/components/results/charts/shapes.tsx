'use client';

/**
 * Bar shapes (dataviz mark specs): 4px rounded data end, square at the baseline, and a 2px surface gap between
 * touching segments (each segment is inset by 1px at both ends instead of being outlined).
 */
import type { BarShapeProps } from 'recharts';

const RADIUS = 4;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Path of a box with its `end` side rounded ('top' | 'bottom' | 'left' | 'right' | null = square). */
export function roundedBoxPath({ x, y, w, h }: Box, end: 'top' | 'bottom' | 'left' | 'right' | null): string {
  const r = end === 'top' || end === 'bottom' ? Math.min(RADIUS, w / 2, h) : Math.min(RADIUS, h / 2, w);
  const x1 = x + w;
  const y1 = y + h;
  if (!end || r <= 0) return `M${x},${y}H${x1}V${y1}H${x}Z`;
  switch (end) {
    case 'top':
      return `M${x},${y1}V${y + r}Q${x},${y} ${x + r},${y}H${x1 - r}Q${x1},${y} ${x1},${y + r}V${y1}Z`;
    case 'bottom':
      return `M${x},${y}H${x1}V${y1 - r}Q${x1},${y1} ${x1 - r},${y1}H${x + r}Q${x},${y1} ${x},${y1 - r}Z`;
    case 'right':
      return `M${x},${y}H${x1 - r}Q${x1},${y} ${x1},${y + r}V${y1 - r}Q${x1},${y1} ${x1 - r},${y1}H${x}Z`;
    case 'left':
      return `M${x1},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x1}Z`;
  }
}

function normalise(props: BarShapeProps): Box {
  const x = Math.min(props.x, props.x + props.width);
  const y = Math.min(props.y, props.y + props.height);
  return { x, y, w: Math.abs(props.width), h: Math.abs(props.height) };
}

function numericValue(value: BarShapeProps['value']): number {
  if (Array.isArray(value)) return value[1] - value[0];
  return Number(value);
}

/**
 * Vertical stacked segment of series `key`. The datum says which series ends the positive (`topKey`) and the
 * negative (`bottomKey`) stack; only that segment gets the rounded end.
 */
export function stackedColumnShape(key: string, color: string) {
  function StackedColumn(props: BarShapeProps) {
    const box = normalise(props);
    if (box.h < 0.5 || box.w <= 0) return <g />;
    const datum = (props.payload ?? {}) as { topKey?: string | null; bottomKey?: string | null };
    const value = numericValue(props.value);
    const end = value > 0 && datum.topKey === key ? 'top' : value < 0 && datum.bottomKey === key ? 'bottom' : null;
    // 2px surface gap between touching segments: 1px off each end when there is room for it.
    const inset = box.h > 3 ? 1 : 0;
    const inner = { x: box.x, y: box.y + inset, w: box.w, h: box.h - 2 * inset };
    return <path d={roundedBoxPath(inner, end)} fill={color} />;
  }
  return StackedColumn;
}

/** Single (non-stacked) vertical column growing from zero, rounded at its data end. */
export function columnShape(color: string | ((datum: unknown) => string)) {
  function Column(props: BarShapeProps) {
    const box = normalise(props);
    if (box.h < 0.5 || box.w <= 0) return <g />;
    const value = numericValue(props.value);
    const fill = typeof color === 'function' ? color(props.payload) : color;
    return <path d={roundedBoxPath(box, value >= 0 ? 'top' : 'bottom')} fill={fill} />;
  }
  return Column;
}

/** Horizontal bar growing from zero (tornado), rounded at its data end. */
export function horizontalBarShape(color: string) {
  function HorizontalBar(props: BarShapeProps) {
    const box = normalise(props);
    if (box.w < 0.5 || box.h <= 0) return <g />;
    const value = numericValue(props.value);
    return <path d={roundedBoxPath(box, value >= 0 ? 'right' : 'left')} fill={color} />;
  }
  return HorizontalBar;
}
