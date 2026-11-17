/**
 * Inputs-panel messages (lib/i18n/messages/inputs.ts). Money params are passed already formatted with
 * `format.eur` (which adds the currency sign in the locale's position), so a message must not add its own "€" next
 * to a placeholder: that printed "5.300 € €".
 */
import { describe, expect, it } from 'vitest';
import { inputs } from '@/lib/i18n/messages/inputs';

describe('inputs messages', () => {
  it('never put a euro sign right next to a {param}', () => {
    const bad: string[] = [];
    for (const lang of ['it', 'en'] as const) {
      for (const [key, text] of Object.entries(inputs[lang])) {
        if (/\{\w+\}\s?€|€\s?\{\w+\}/.test(text)) bad.push(`${lang}:${key}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
