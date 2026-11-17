/**
 * Semantic series colours shared by charts and legends. Single source of truth: tailwind.config.ts turns this map
 * into CSS variables (`--series-<name>`) and utilities (`bg-series-<name>`, `text-series-<name>`, …).
 *
 * Values are the dark-mode steps of the dataviz reference palette, validated (dataviz skill,
 * scripts/validate_palette.js --mode dark --surface #0d1426, the card surface over the app background) for every
 * set that is drawn side by side: lightness band, chroma floor, CVD separation, normal-vision floor and >= 3:1
 * contrast. Validated neighbours:
 * - wealth: accessible ↔ locked;
 * - working-year flows: expenses ↔ savings (above zero), taxes ↔ inps (below zero), savings ↔ taxes;
 * - retired-year flows: statePension, pensionFund, withdrawals (all pairs);
 * - CATEGORICAL_COLORS in this fixed order (adjacent pairs).
 * Text never uses these colours: values and labels stay in slate ink.
 */
export const SERIES_COLORS = {
  /** Accessible net worth (cash + portfolio − latent tax). */
  accessible: '#199e70',
  /** Locked net worth (pension fund + TFR kept by the employer). */
  locked: '#9085e9',
  /** Total net worth (Monte Carlo fan chart). */
  netWorth: '#3987e5',
  portfolio: '#199e70',
  cash: '#3987e5',
  pensionFund: '#9085e9',
  tfr: '#9085e9',
  statePension: '#c98500',
  /** Employee INPS contributions (same family as the INPS pension they pay for). */
  inps: '#c98500',
  /** IRPEF, surcharges and other taxes. */
  taxes: '#d55181',
  expenses: '#3987e5',
  savings: '#0ca30c',
  withdrawals: '#199e70',
} as const;

export type SeriesName = keyof typeof SERIES_COLORS;

/** CSS variable reference for a series colour, e.g. `var(--series-portfolio)`. */
export function seriesVar(name: SeriesName): string {
  return `var(--series-${name})`;
}

/**
 * Categorical slots for entities without a semantic colour (compared plans, tornado variations). Assign in this
 * fixed order and never cycle: a 9th entity is folded or left out, never given a generated colour.
 */
export const CATEGORICAL_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'] as const;

/** Design tokens used outside Tailwind classes (e.g. Recharts axes and grids). */
export const THEME_COLORS = {
  background: '#0b1020',
  surface: 'rgba(15, 23, 42, 0.6)',
  /** Opaque equivalent of a card (surface over background): the chart surface used for gaps and rings. */
  chartSurface: '#0d1426',
  border: '#1e293b',
  grid: '#1e293b',
  /** Baseline / zero line. */
  axis: '#334155',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  /** De-emphasised marks (context series in an emphasis chart): 3.85:1 on the chart surface. */
  deemphasis: '#64748b',
  accent: '#22d3ee',
} as const;
