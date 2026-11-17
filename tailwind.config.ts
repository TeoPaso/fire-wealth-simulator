import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { SERIES_COLORS, THEME_COLORS } from './app/components/ui/colors';

const seriesVars = Object.fromEntries(Object.entries(SERIES_COLORS).map(([name, hex]) => [`--series-${name}`, hex]));
const seriesUtilities = Object.fromEntries(
  Object.keys(SERIES_COLORS).map((name) => [name, `var(--series-${name})`]),
);

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: THEME_COLORS.background,
        accent: THEME_COLORS.accent,
        series: seriesUtilities,
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      maxWidth: {
        app: '1920px',
      },
      gridTemplateColumns: {
        shell: '440px minmax(0, 1fr)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(-2px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': seriesVars });
    }),
  ],
};

export default config;
