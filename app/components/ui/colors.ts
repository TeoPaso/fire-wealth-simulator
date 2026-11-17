/**
 * Semantic series colours shared by charts and legends. Single source of truth: tailwind.config.ts turns this map
 * into CSS variables (`--series-<name>`) and utilities (`bg-series-<name>`, `text-series-<name>`, …).
 * All colours keep >= 3:1 contrast against the app background (#0b1020), as required for graphical objects.
 */
export const SERIES_COLORS = {
  accessible: '#22d3ee',
  locked: '#a78bfa',
  portfolio: '#22d3ee',
  cash: '#94a3b8',
  pensionFund: '#c084fc',
  tfr: '#fbbf24',
  statePension: '#f59e0b',
  taxes: '#fb7185',
  expenses: '#64748b',
  savings: '#34d399',
  withdrawals: '#f472b6',
} as const;

export type SeriesName = keyof typeof SERIES_COLORS;

/** CSS variable reference for a series colour, e.g. `var(--series-portfolio)`. */
export function seriesVar(name: SeriesName): string {
  return `var(--series-${name})`;
}

/** Design tokens used outside Tailwind classes (e.g. Recharts axes and grids). */
export const THEME_COLORS = {
  background: '#0b1020',
  surface: 'rgba(15, 23, 42, 0.6)',
  border: '#1e293b',
  grid: '#1e293b',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#22d3ee',
} as const;
