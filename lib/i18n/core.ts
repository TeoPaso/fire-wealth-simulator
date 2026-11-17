/**
 * i18n core (no React): languages, merged dictionaries, translation with {name} interpolation, plurals and
 * locale-aware number formatters. React bindings live in lib/i18n/index.tsx.
 */
import { DOMAINS } from './messages';

export type Lang = 'it' | 'en';
export const LANGS: readonly Lang[] = ['it', 'en'];
export const DEFAULT_LANG: Lang = 'it';
/** BCP 47 locale used for number/date formatting per UI language. */
export const LOCALES: Record<Lang, string> = { it: 'it-IT', en: 'en-GB' };

export type MessageParams = Record<string, string | number>;

export function isLang(value: unknown): value is Lang {
  return value === 'it' || value === 'en';
}

function mergeDomains(lang: Lang): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const domain of Object.values(DOMAINS)) Object.assign(out, domain[lang]);
  return Object.freeze(out);
}

/** Merged dictionaries (all domains) per language. */
export const MESSAGES: Record<Lang, Readonly<Record<string, string>>> = {
  it: mergeDomains('it'),
  en: mergeDomains('en'),
};

/** Replaces `{name}` placeholders with params; unknown placeholders are left visible. */
export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

export function hasMessage(lang: Lang, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(MESSAGES[lang], key);
}

const warned = new Set<string>();
function warnMissing(lang: Lang, key: string): void {
  if (process.env.NODE_ENV === 'production') return;
  const id = `${lang}:${key}`;
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(`[i18n] missing message "${key}" for language "${lang}"`);
}

/**
 * Translates `key` in `lang`. Missing keys fall back to the key itself (visible, so they get noticed) and log a
 * warning outside production.
 */
export function translate(lang: Lang, key: string, params?: MessageParams): string {
  const template = MESSAGES[lang][key];
  if (template === undefined) {
    warnMissing(lang, key);
    return key;
  }
  return interpolate(template, params);
}

const pluralRules = new Map<Lang, Intl.PluralRules>();
/**
 * Plural-aware translation: looks up `<key>.<category>` (Intl.PluralRules: one, other, …) and falls back to
 * `<key>.other`. `count` is available as the {count} placeholder (formatted with the locale).
 */
export function translatePlural(lang: Lang, key: string, count: number, params?: MessageParams): string {
  let rules = pluralRules.get(lang);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALES[lang]);
    pluralRules.set(lang, rules);
  }
  const category = rules.select(count);
  const specific = `${key}.${category}`;
  const resolved = hasMessage(lang, specific) ? specific : `${key}.other`;
  const formatted = new Intl.NumberFormat(LOCALES[lang], { useGrouping: 'always' }).format(count);
  return translate(lang, resolved, { count: formatted, ...params });
}
