/**
 * Chart chrome shared by every results chart: recessive solid hairline grid, muted tick text (never the series
 * colour), tick density for narrow screens.
 */
import { THEME_COLORS } from '../../ui/colors';

export const CHART = {
  grid: THEME_COLORS.grid,
  axis: THEME_COLORS.axis,
  tick: THEME_COLORS.textMuted,
  ink: THEME_COLORS.text,
  surface: THEME_COLORS.chartSurface,
  deemphasis: THEME_COLORS.deemphasis,
  /** Width below which charts use fewer ticks and shorter labels. */
  compactWidth: 520,
  /** Bars never get thicker than this (px). */
  maxBarSize: 24,
} as const;

/** Tick style for axes (12px, muted ink, tabular figures). */
export const TICK_STYLE = { fill: CHART.tick, fontSize: 12, fontVariantNumeric: 'tabular-nums' } as const;

/** Common XAxis / YAxis props: no tick marks, solid hairline axis. */
export const AXIS_PROPS = {
  tick: TICK_STYLE,
  tickLine: false,
  axisLine: { stroke: CHART.axis },
} as const;

/**
 * Integer ticks on multiples of `step` between min and max; a bound is added only when it is far enough from the
 * nearest multiple not to collide with it (>= 3/4 step), e.g. ages 30…96 → 30, 40 … 90 (step 10) or 30, 35 … 95.
 */
export function stepTicks(min: number, max: number, step: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || !(step > 0)) return [];
  const ticks: number[] = [];
  const first = Math.ceil(min / step) * step;
  if (first - min >= step * 0.75) ticks.push(min);
  for (let v = first; v <= max; v += step) ticks.push(v);
  if (ticks.length === 0 || max - ticks[ticks.length - 1] >= step * 0.75) ticks.push(max);
  return ticks;
}

/** Age-axis step for a span of years at the given width. */
export function ageStep(span: number, compact: boolean): number {
  if (span <= 12) return compact ? 2 : 1;
  if (span <= 30) return compact ? 5 : 2;
  return compact ? 10 : 5;
}
