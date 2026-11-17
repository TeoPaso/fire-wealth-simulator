'use client';

/**
 * Translation of engine Issues (`issues.<code>` with params). Exported for every panel that shows issues
 * (inputs fields, results banner) so they read the same.
 */
import { useCallback } from 'react';
import type { Issue, Plan } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { dropUnfilled, formatIssueParams, refineIssue } from './model/issueFormat';

export { dropUnfilled, formatIssueParams, refineIssue } from './model/issueFormat';

/**
 * Returns `(issue) => translated message`; unknown codes fall back to a generic message naming the code. With the
 * plan, issues whose real cause is visible in the plan get a more specific message (refineIssue).
 */
export function useIssueText(plan?: Plan | null): (issue: Issue) => string {
  const { t, has, format } = useI18n();
  return useCallback(
    (raw: Issue) => {
      const issue = refineIssue(raw, plan);
      const key = `issues.${issue.code}`;
      return has(key)
        ? dropUnfilled(t(key, formatIssueParams(issue.params, format, String(issue.code))))
        : t('issues.unknownCode', { code: String(issue.code) });
    },
    [t, has, format, plan],
  );
}
