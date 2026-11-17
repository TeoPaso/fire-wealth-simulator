'use client';

/**
 * Translation of engine Issues (`issues.<code>` with params). Exported for every panel that shows issues
 * (inputs fields, results banner) so they read the same.
 */
import { useCallback } from 'react';
import type { Issue } from '@/lib/engine';
import { useI18n, type Formatters, type MessageParams } from '@/lib/i18n';

/**
 * Formats issue params for display: numbers are locale-formatted (up to 2 decimals), except params whose name
 * contains "year" (calendar years are printed without a thousands separator). Strings pass through.
 */
export function formatIssueParams(params: Issue['params'], format: Formatters): MessageParams | undefined {
  if (!params) return undefined;
  const out: MessageParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'number') {
      out[key] = /year/i.test(key) ? String(value) : format.num(value, { decimals: 2 });
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

/** Returns `(issue) => translated message`; unknown codes fall back to a generic message naming the code. */
export function useIssueText(): (issue: Issue) => string {
  const { t, has, format } = useI18n();
  return useCallback(
    (issue: Issue) => {
      const key = `issues.${issue.code}`;
      return has(key) ? t(key, formatIssueParams(issue.params, format)) : t('issues.unknownCode', { code: String(issue.code) });
    },
    [t, has, format],
  );
}
