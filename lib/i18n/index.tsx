'use client';

/**
 * React bindings for i18n. Components get strings ONLY through `useT()` / `useI18n()` and numbers through
 * `useFormat()`. Without a provider, Italian is used (handy for isolated rendering in tests).
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { usePlannerState } from '@/lib/store/hooks';
import {
  DEFAULT_LANG,
  LOCALES,
  hasMessage,
  translate,
  translatePlural,
  type Lang,
  type MessageParams,
} from './core';
import { createFormatters, type Formatters } from './format';

export * from './core';
export * from './format';

/** Translate a key with optional {name} params. */
export type TFunction = (key: string, params?: MessageParams) => string;
/** Plural-aware translate: picks `<key>.one` / `<key>.other` from `count`. */
export type TPluralFunction = (key: string, count: number, params?: MessageParams) => string;

export interface I18nValue {
  lang: Lang;
  locale: string;
  t: TFunction;
  tp: TPluralFunction;
  has: (key: string) => boolean;
  format: Formatters;
}

function createI18nValue(lang: Lang): I18nValue {
  return {
    lang,
    locale: LOCALES[lang],
    t: (key, params) => translate(lang, key, params),
    tp: (key, count, params) => translatePlural(lang, key, count, params),
    has: (key) => hasMessage(lang, key),
    format: createFormatters(lang),
  };
}

const VALUES: Record<Lang, I18nValue> = { it: createI18nValue('it'), en: createI18nValue('en') };
const I18nContext = createContext<I18nValue>(VALUES[DEFAULT_LANG]);

/** Provides a fixed language (tests, previews). Keeps `<html lang>` in sync. */
export function StaticI18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = VALUES[lang] ?? VALUES[DEFAULT_LANG];
  useEffect(() => {
    document.documentElement.lang = value.lang;
  }, [value.lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Provides the language chosen in the planner store (`state.ui.lang`). Must be inside `StoreProvider`. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = usePlannerState(selectLang);
  return <StaticI18nProvider lang={lang}>{children}</StaticI18nProvider>;
}

function selectLang(state: { ui: { lang: Lang } }): Lang {
  return state.ui.lang;
}

/** Full i18n context: lang, locale, t, tp, has, format. */
export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** `t(key, params?)` — the translation function for the current language. */
export function useT(): TFunction {
  return useContext(I18nContext).t;
}

/** Locale-aware formatters for the current language (eur, eurCompact, pct, num, years). */
export function useFormat(): Formatters {
  return useContext(I18nContext).format;
}

/** Memoised helper for components that need a translated list (e.g. select options). */
export function useTranslatedOptions<V extends string>(
  options: readonly { value: V; labelKey: string }[],
): { value: V; label: string }[] {
  const t = useT();
  return useMemo(() => options.map((o) => ({ value: o.value, label: t(o.labelKey) })), [options, t]);
}
