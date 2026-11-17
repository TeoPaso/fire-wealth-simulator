/**
 * Message keys written as plain string literals in the inputs components (option `labelKey`s, template `nameKey`s,
 * keys chosen with a ternary) are not seen by tests/i18n-keys.test.ts, which only checks direct t('…') calls.
 * This test checks every complete 'inputs.*' / 'issues.*' / 'common.*' literal, plus the keys built from ids.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MESSAGES } from '@/lib/i18n/core';
import { SECTION_IDS } from '@/app/components/inputs/model/paths';

const DIR = path.resolve(__dirname, '../../app/components/inputs');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe('inputs components', () => {
  it('every literal message key exists in both languages', () => {
    const missing: string[] = [];
    for (const file of walk(DIR)) {
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(/(['"])((?:inputs|issues|common)\.[A-Za-z0-9_.]+)\1/g)) {
        const key = m[2];
        if (key.endsWith('.')) continue; // prefix of a generated key
        for (const lang of ['it', 'en'] as const) {
          if (!(key in MESSAGES[lang]) && !(`${key}.other` in MESSAGES[lang])) {
            missing.push(`${lang}:${key} (${path.relative(DIR, file)})`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('every section has a title in both languages', () => {
    for (const lang of ['it', 'en'] as const) {
      for (const id of SECTION_IDS) expect(MESSAGES[lang][`inputs.section.${id}`], `${lang}:${id}`).toBeTruthy();
    }
  });
});
