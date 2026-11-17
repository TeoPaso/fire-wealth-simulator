/**
 * i18n integrity (docs/SPEC.md §7):
 * - every domain has identical key sets in Italian and English, keys prefixed with `<domain>.`, no empty strings;
 * - no key is defined by two domains;
 * - every literal key used in app/ via t('…') / tp('…') exists in the merged dictionary.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MESSAGES } from '@/lib/i18n/core';
import { DOMAINS } from '@/lib/i18n/messages';

const ROOT = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full);
    return /\.(tsx?|jsx?)$/.test(name) ? [full] : [];
  });
}

describe('message dictionaries', () => {
  for (const [domain, messages] of Object.entries(DOMAINS)) {
    it(`${domain}: identical keys in it and en`, () => {
      const itKeys = Object.keys(messages.it).sort();
      const enKeys = Object.keys(messages.en).sort();
      expect(itKeys.filter((k) => !(k in messages.en)), 'missing in en').toEqual([]);
      expect(enKeys.filter((k) => !(k in messages.it)), 'missing in it').toEqual([]);
    });

    it(`${domain}: keys start with "${domain}." and values are non-empty strings`, () => {
      for (const lang of ['it', 'en'] as const) {
        for (const [key, value] of Object.entries(messages[lang])) {
          expect(key.startsWith(`${domain}.`), `${lang}:${key}`).toBe(true);
          expect(typeof value === 'string' && value.trim().length > 0, `${lang}:${key}`).toBe(true);
        }
      }
    });

    it(`${domain}: placeholders match between languages`, () => {
      const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      for (const [key, value] of Object.entries(messages.it)) {
        const en = messages.en[key];
        if (en !== undefined) expect(placeholders(en), key).toEqual(placeholders(value));
      }
    });
  }

  it('no key is defined in two domains', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [domain, messages] of Object.entries(DOMAINS)) {
      for (const key of Object.keys(messages.it)) {
        if (seen.has(key)) duplicates.push(`${key} (${seen.get(key)}, ${domain})`);
        seen.set(key, domain);
      }
    }
    expect(duplicates).toEqual([]);
  });
});

describe('keys used in app/', () => {
  const files = walk(path.join(ROOT, 'app'));
  const used: { key: string; file: string; plural: boolean }[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(/\b(tp?)\(\s*(['"])([^'"\n]+)\2/g)) {
      used.push({ key: m[3], file: path.relative(ROOT, file), plural: m[1] === 'tp' });
    }
  }

  it('finds translation calls to check', () => {
    expect(used.length).toBeGreaterThan(20);
  });

  it('every literal t()/tp() key exists in both languages', () => {
    const missing: string[] = [];
    for (const { key, file, plural } of used) {
      const lookup = plural ? `${key}.other` : key;
      for (const lang of ['it', 'en'] as const) {
        if (!(lookup in MESSAGES[lang])) missing.push(`${lang}:${lookup} (${file})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
