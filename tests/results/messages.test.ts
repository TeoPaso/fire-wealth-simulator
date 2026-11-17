/**
 * Results messages: keys built at run time (from ids, constants or engine keys) exist in both languages, every
 * complete 'results.*' literal in the results components exists, and money placeholders never get a second "€".
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MESSAGES } from '@/lib/i18n/core';
import { results } from '@/lib/i18n/messages/results';
import { SENSITIVITY_VARIATIONS } from '@/lib/engine/sensitivity';
import { RULE_GROUPS, ruleLabelKey } from '@/app/components/inputs/model/taxRulesConfig';
import { CONVENTIONS, PLAN_FACTS, SIMPLIFICATIONS } from '@/app/components/results/model/assumptions';
import { COMPARE_COLUMNS } from '@/app/components/results/model/compare';
import { TOTAL_KEYS } from '@/app/components/results/model/flows';
import { YEAR_COLUMNS, columnGroups, columnLabelKey, groupLabelKey } from '@/app/components/results/model/yearTable';

const DIR = path.resolve(__dirname, '../../app/components/results');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

function expectKeys(keys: string[]) {
  const missing: string[] = [];
  for (const key of keys) {
    for (const lang of ['it', 'en'] as const) {
      if (!(key in MESSAGES[lang]) && !(`${key}.other` in MESSAGES[lang])) missing.push(`${lang}:${key}`);
    }
  }
  expect(missing).toEqual([]);
}

describe('results messages', () => {
  it('every literal message key in the results components exists', () => {
    const keys: string[] = [];
    for (const file of walk(DIR)) {
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(/(['"])((?:results|inputs|issues|common)\.[A-Za-z0-9_.]+)\1/g)) {
        if (!m[2].endsWith('.')) keys.push(m[2]);
      }
    }
    expect(keys.length).toBeGreaterThan(100);
    expectKeys(keys);
  });

  it('keys built from ids exist', () => {
    expectKeys([
      ...['retirement', 'pensionFund', 'statePension'].flatMap((k) => [`results.marker.${k}`, `results.marker.short.${k}`]),
      ...YEAR_COLUMNS.map((c) => columnLabelKey(c.id)),
      ...columnGroups().map((g) => groupLabelKey(g.group)),
      ...['working', 'retired'].map((s) => `results.table.status.${s}`),
      ...TOTAL_KEYS.map((k) => `results.totals.${k}`),
      ...COMPARE_COLUMNS.map((c) => `results.compare.col.${c}`),
      ...CONVENTIONS.flatMap((c) => [`results.assumptions.conv.${c}.title`, `results.assumptions.conv.${c}.body`]),
      ...SIMPLIFICATIONS.map((s) => `results.assumptions.simpl.${s}`),
      ...PLAN_FACTS.map((f) => `results.assumptions.plan.${f}`),
      ...SENSITIVITY_VARIATIONS.flatMap((v) => [`results.sens.item.${v.key}`, `results.sens.short.${v.key}`]),
      ...SENSITIVITY_VARIATIONS.filter((v) => v.unit !== 'pct').map((v) => `results.sens.unit.${v.unit}`),
      ...['positive', 'neutral', 'warning'].map((t) => `results.insight.tone.${t}`),
      ...RULE_GROUPS.map((g) => `inputs.rules.group.${g.id}`),
      ...RULE_GROUPS.flatMap((g) => g.items.flatMap((i) => [i.path, ...(i.kind === 'optional' ? i.fields.map((f) => f.path) : [])])).map(ruleLabelKey),
    ]);
  });

  it('payroll lines all have a label', () => {
    const source = readFileSync(path.join(DIR, 'flows/PayrollCard.tsx'), 'utf8');
    const keys = [...source.matchAll(/\{ key: '(\w+)', sign:/g)].map((m) => `results.payroll.line.${m[1]}`);
    expect(keys.length).toBeGreaterThan(15);
    expectKeys(keys);
  });

  it('money placeholders are not wrapped in an extra euro sign', () => {
    for (const lang of ['it', 'en'] as const) {
      for (const [key, text] of Object.entries(results[lang])) {
        expect(/\{(amount|locked|total|atRetirement|median|endP\d+|upTo|spending)\}\s?€|€\s?\{(amount|locked|total)\}/.test(text), `${lang}:${key}`).toBe(
          false,
        );
      }
    }
  });
});
