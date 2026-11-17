import next from 'eslint-config-next';

const config = [
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'coverage/**', 'public/sw.js', 'next-env.d.ts'] },
  ...next,
];

export default config;
