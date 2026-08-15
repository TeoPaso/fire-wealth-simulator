import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Language } from './i18n/translations';

/**
 * Utility to merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as a currency string (EUR)
 */
export function formatCurrency(value: number, lang: Language = 'it'): string {
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as a percentage string
 */
export function formatPercent(value: number, lang: Language = 'it'): string {
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number, lang: Language = 'it', decimals: number = 0): string {
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
