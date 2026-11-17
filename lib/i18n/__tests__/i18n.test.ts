import { afterEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES, hasMessage, interpolate, translate, translatePlural } from '../core';
import { createFormatters, decimalSeparator, parseLocaleNumber } from '../format';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('translate', () => {
  it('translates and interpolates {params}', () => {
    expect(translate('it', 'common.nav.inputs')).toBe('Dati');
    expect(translate('en', 'common.nav.inputs')).toBe('Inputs');
    expect(translate('it', 'common.plan.copyName', { name: 'Base' })).toBe('Base (copia)');
    expect(translate('en', 'common.ui.belowMin', { min: 0 })).toBe('The minimum is 0.');
  });

  it('falls back to the key itself and warns once outside production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(translate('en', 'common.does.not.exist')).toBe('common.does.not.exist');
    expect(translate('en', 'common.does.not.exist')).toBe('common.does.not.exist');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(hasMessage('en', 'common.does.not.exist')).toBe(false);
  });

  it('leaves unknown placeholders visible', () => {
    expect(interpolate('Hello {name} {missing}', { name: 'Ada' })).toBe('Hello Ada {missing}');
    expect(interpolate('No params')).toBe('No params');
  });

  it('picks plural forms', () => {
    expect(translatePlural('it', 'common.import.planCount', 1, { file: 'a.json' })).toBe('1 piano trovato nel file «a.json».');
    expect(translatePlural('it', 'common.import.planCount', 3, { file: 'a.json' })).toBe('3 piani trovati nel file «a.json».');
    expect(translatePlural('en', 'common.import.planCount', 1, { file: 'a.json' })).toBe('1 plan found in “a.json”.');
  });

  it('merges every domain into one dictionary per language', () => {
    expect(Object.keys(MESSAGES.it).length).toBeGreaterThan(50);
    expect(Object.isFrozen(MESSAGES.en)).toBe(true);
  });
});

describe('formatters', () => {
  const it_ = createFormatters('it');
  const en = createFormatters('en');
  const norm = (s: string) => s.replace(/[  ]/g, ' ');

  it('formats euros with 0 decimals by default and groups thousands', () => {
    expect(norm(it_.eur(1500))).toBe('1.500 €');
    expect(norm(it_.eur(35000.4))).toBe('35.000 €');
    expect(en.eur(35000)).toBe('€35,000');
    expect(norm(it_.eur(12.345, { decimals: 2 }))).toBe('12,35 €');
    expect(norm(it_.eur(-200, { signed: true }))).toBe('-200 €');
    expect(norm(it_.eur(200, { signed: true }))).toBe('+200 €');
  });

  it('formats compact euros', () => {
    expect(norm(it_.eurCompact(1_234_567))).toBe('1,2 Mln €');
    expect(en.eurCompact(1_234_567)).toBe('€1.2m');
    expect(norm(it_.eurCompact(950))).toBe('950 €');
  });

  it('formats percentages given in percent', () => {
    expect(norm(it_.pct(7))).toBe('7,0%');
    expect(en.pct(7)).toBe('7.0%');
    expect(en.pct(3.456, 2)).toBe('3.46%');
    expect(en.pct(-1, 0, { signed: true })).toBe('-1%');
  });

  it('formats numbers and years', () => {
    expect(it_.num(1234.5, { decimals: 1 })).toBe('1.234,5');
    expect(en.num(1234.5, { decimals: 1 })).toBe('1,234.5');
    expect(it_.num(1234, { grouping: false })).toBe('1234');
    expect(it_.years(12)).toBe('12 anni');
    expect(it_.years(1)).toBe('1 anno');
    expect(en.years(1)).toBe('1 year');
  });

  it('renders non-finite values as an em dash', () => {
    expect(it_.eur(Number.NaN)).toBe('—');
    expect(en.pct(Number.POSITIVE_INFINITY)).toBe('—');
    expect(en.num(null as unknown as number)).toBe('—');
  });

  it('knows the decimal separator', () => {
    expect(decimalSeparator('it')).toBe(',');
    expect(decimalSeparator('en')).toBe('.');
  });
});

describe('parseLocaleNumber', () => {
  const num = (text: string, maxDecimals?: number) => {
    const r = parseLocaleNumber(text, { maxDecimals });
    return r.kind === 'number' ? r.value : r.kind;
  };

  it('accepts both decimal separators and a sign', () => {
    expect(num('1,5')).toBe(1.5);
    expect(num('1.5')).toBe(1.5);
    expect(num('-2,25')).toBe(-2.25);
    expect(num('−3')).toBe(-3);
    expect(num(' 42 ')).toBe(42);
    expect(num(',5')).toBe(0.5);
  });

  it('reports typing-in-progress states without committing', () => {
    expect(num('')).toBe('empty');
    expect(num('-')).toBe('incomplete');
    expect(num('1,')).toBe('incomplete');
    expect(num('1.')).toBe('incomplete');
    expect(num(',')).toBe('incomplete');
  });

  it('handles thousands separators', () => {
    expect(num('1.234,56')).toBe(1234.56);
    expect(num('1,234.56')).toBe(1234.56);
    expect(num('1.234.567')).toBe(1234567);
    expect(num("1'234")).toBe(1234);
    expect(num('35 000')).toBe(35000);
    // A single separator + 3 digits is a thousands separator only in whole-number fields.
    expect(num('1.500', 0)).toBe(1500);
    expect(num('1,500', 0)).toBe(1500);
    expect(num('1,125', 2)).toBe(1.125);
    expect(num('1.500')).toBe(1.5);
    expect(num('0.500', 0)).toBe(0.5);
  });

  it('rejects garbage', () => {
    expect(num('abc')).toBe('invalid');
    expect(num('1.2.3')).toBe('invalid');
    expect(num('1,2.3,4')).toBe('invalid');
    expect(num('12e3')).toBe('invalid');
    expect(num('--1')).toBe('invalid');
  });
});
