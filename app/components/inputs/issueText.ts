'use client';

/**
 * Translation of engine Issues (`issues.<code>` with params). Exported for every panel that shows issues
 * (inputs fields, results banner) so they read the same.
 */
import { useCallback } from 'react';
import type { Issue } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { dropUnfilled, formatIssueParams } from './model/issueFormat';

export { dropUnfilled, formatIssueParams } from './model/issueFormat';

/** Returns `(issue) => translated message`; unknown codes fall back to a generic message naming the code. */
export function useIssueText(): (issue: Issue) => string {
  const { t, has, format } = useI18n();
  return useCallback(
    (issue: Issue) => {
      const key = `issues.${issue.code}`;
      return has(key)
        ? dropUnfilled(t(key, formatIssueParams(issue.params, format, String(issue.code))))
        : t('issues.unknownCode', { code: String(issue.code) });
    },
    [t, has, format],
  );
}
