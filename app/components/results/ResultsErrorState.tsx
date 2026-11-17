'use client';

/**
 * Shown instead of the charts when the engine cannot run the plan: the validation errors (translated, with the
 * input section they belong to) or a generic engine failure. The plan itself is untouched.
 */
import { PlanValidationError, type Plan } from '@/lib/engine';
import { useT } from '@/lib/i18n';
import { usePlanValidation } from '@/lib/store/hooks';
import { Banner } from '../ui';
import { useIssueText } from '../inputs/issueText';
import { sectionOfPath } from '../inputs/model/paths';

export function ResultsErrorState({ plan, error }: { plan: Plan; error: unknown }) {
  const t = useT();
  const issueText = useIssueText();
  const validation = usePlanValidation(plan);
  const issues = error instanceof PlanValidationError ? error.issues : validation;
  const errors = issues.filter((i) => i.level === 'error');

  if (errors.length === 0) {
    return (
      <Banner tone="error" title={t('results.error.engineTitle')}>
        {t('results.error.engineBody')}
      </Banner>
    );
  }

  return (
    <Banner tone="error" title={t('results.error.invalidTitle', { count: String(errors.length) })} live="status">
      <p>{t('results.error.invalidBody')}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((issue, i) => {
          const section = sectionOfPath(issue.path);
          return (
            <li key={`${issue.path}#${issue.code}#${i}`}>
              {section ? <span className="font-medium">{t(`inputs.section.${section}`)}: </span> : null}
              {issueText(issue)}
            </li>
          );
        })}
      </ul>
    </Banner>
  );
}
