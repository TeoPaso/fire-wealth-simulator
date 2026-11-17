/**
 * Locale-aware formatters (it-IT / en-GB). Pure functions, no React. Non-finite inputs render as an em dash.
 * Percentages take numbers IN PERCENT (7 → "7,0%"), consistent with the engine contract.
 */
import { LOCALES, type Lang } from './core';

export const MISSING_VALUE = '—';

export interface EurOptions {
  /** Fraction digits (default 0). */
  decimals?: number;
  /** Always show the sign (+/−) except for zero. */
  signed?: boolean;
}

export interface NumOptions {
  /** Maximum fraction digits (default 0). */
  decimals?: number;
  /** Minimum fraction digits (default 0). */
  minDecimals?: number;
  /** Thousands separators (default true). */
  grouping?: boolean;
  signed?: boolean;
}

export interface Formatters {
  lang: Lang;
  locale: string;
  /** Euro amount, 0 decimals by default: "35.000 €" / "€35,000". */
  eur(value: number, opts?: EurOptions): string;
  /** Compact euro amount for axes and tight spaces: "1,2 Mln €" / "€1.2m". */
  eurCompact(value: number, opts?: { signed?: boolean }): string;
  /** Percentage from a number in percent: pct(7) → "7,0%" / "7.0%". */
  pct(value: number, decimals?: number, opts?: { signed?: boolean }): string;
  /** Plain number. */
  num(value: number, opts?: NumOptions): string;
  /** Duration in years: "12 anni" / "12 years" (singular handled by the locale). */
  years(value: number, decimals?: number): string;
  /** "35, 45 e 67" / "35, 45 and 67". */
  list(items: readonly string[]): string;
}

const cache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    // 'always' groups 4-digit numbers too (it-IT would otherwise print "1500 €" but "15.000 €").
    f = new Intl.NumberFormat(locale, { useGrouping: 'always', ...options });
    cache.set(key, f);
  }
  return f;
}

function safe(value: number, format: (v: number) => string): string {
  return typeof value === 'number' && Number.isFinite(value) ? format(value) : MISSING_VALUE;
}

export function createFormatters(lang: Lang): Formatters {
  const locale = LOCALES[lang];
  return {
    lang,
    locale,
    eur: (value, opts = {}) =>
      safe(value, (v) =>
        nf(locale, {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: opts.decimals ?? 0,
          maximumFractionDigits: opts.decimals ?? 0,
          signDisplay: opts.signed ? 'exceptZero' : 'auto',
        }).format(v),
      ),
    eurCompact: (value, opts = {}) =>
      safe(value, (v) =>
        nf(locale, {
          style: 'currency',
          currency: 'EUR',
          notation: 'compact',
          minimumFractionDigits: 0,
          maximumFractionDigits: Math.abs(v) >= 1000 ? 1 : 0,
          signDisplay: opts.signed ? 'exceptZero' : 'auto',
        }).format(v),
      ),
    pct: (value, decimals = 1, opts = {}) =>
      safe(value, (v) =>
        nf(locale, {
          style: 'percent',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          signDisplay: opts.signed ? 'exceptZero' : 'auto',
        }).format(v / 100),
      ),
    num: (value, opts = {}) =>
      safe(value, (v) =>
        nf(locale, {
          minimumFractionDigits: opts.minDecimals ?? 0,
          maximumFractionDigits: Math.max(opts.decimals ?? 0, opts.minDecimals ?? 0),
          useGrouping: opts.grouping === false ? false : 'always',
          signDisplay: opts.signed ? 'exceptZero' : 'auto',
        }).format(v),
      ),
    years: (value, decimals = 0) =>
      safe(value, (v) =>
        nf(locale, { style: 'unit', unit: 'year', unitDisplay: 'long', maximumFractionDigits: decimals }).format(v),
      ),
    list: (items) => new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items),
  };
}

/** Decimal separator of a language's locale ("," for it, "." for en). */
export function decimalSeparator(lang: Lang): string {
  return nf(LOCALES[lang], { minimumFractionDigits: 1 }).formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.';
}

export interface ParseNumberOptions {
  /**
   * Maximum number of decimals the field accepts. When it is 0 (whole-number fields such as euro amounts or ages),
   * a single separator followed by exactly three digits ("1.500", "1,500") is read as a thousands separator, as
   * users commonly type money that way. Fields accepting decimals always read it as a decimal separator.
   */
  maxDecimals?: number;
}

export type ParseResult =
  | { kind: 'empty' }
  | { kind: 'incomplete' } // "-", "1,", "." — typing in progress
  | { kind: 'invalid' }
  | { kind: 'number'; value: number };

/**
 * Parses user-typed numbers accepting both "," and "." as decimal separator, optional thousands separators
 * (".", ",", spaces, apostrophes) and a leading sign. Never guesses beyond the documented rules.
 */
export function parseLocaleNumber(text: string, opts: ParseNumberOptions = {}): ParseResult {
  const compact = text.replace(/[\s  '’]/g, '').replace(/^−/, '-');
  if (compact === '') return { kind: 'empty' };
  if (compact === '-' || compact === '+') return { kind: 'incomplete' };
  if (!/^[+-]?[\d.,]+$/.test(compact)) return { kind: 'invalid' };
  const sign = compact.startsWith('-') ? -1 : 1;
  let body = compact.replace(/^[+-]/, '');
  if (/^[.,]$/.test(body)) return { kind: 'incomplete' };

  const dots = (body.match(/\./g) ?? []).length;
  const commas = (body.match(/,/g) ?? []).length;
  let decimalSep: '.' | ',' | null = null;
  if (dots > 0 && commas > 0) {
    decimalSep = body.lastIndexOf('.') > body.lastIndexOf(',') ? '.' : ',';
    const groupSep = decimalSep === '.' ? ',' : '.';
    if ((body.match(decimalSep === '.' ? /\./g : /,/g) ?? []).length > 1) return { kind: 'invalid' };
    if (body.indexOf(groupSep) > body.indexOf(decimalSep)) return { kind: 'invalid' };
    body = body.split(groupSep).join('');
  } else if (dots + commas > 1) {
    const sep = dots > 0 ? '.' : ',';
    const groups = body.split(sep);
    // "1.234.567": every group after the first must have 3 digits.
    if (groups[0] === '' || groups.slice(1).some((g) => g.length !== 3)) return { kind: 'invalid' };
    body = groups.join('');
  } else if (dots + commas === 1) {
    const sep = dots === 1 ? '.' : ',';
    const [intPart, fracPart] = body.split(sep);
    const maxDecimals = opts.maxDecimals ?? Infinity;
    if (fracPart === '') return { kind: 'incomplete' };
    if (fracPart.length === 3 && intPart.length >= 1 && intPart.length <= 3 && intPart !== '0' && maxDecimals === 0) {
      body = intPart + fracPart;
    } else {
      decimalSep = sep;
    }
  }
  const normalized = decimalSep ? body.replace(decimalSep, '.') : body;
  if (!/^\d*\.?\d*$/.test(normalized) || normalized === '.' || normalized === '') return { kind: 'invalid' };
  const value = sign * Number(normalized);
  return Number.isFinite(value) ? { kind: 'number', value } : { kind: 'invalid' };
}
