import type { Issue, Plan } from './types';

// STUB — to be implemented (docs/SPEC.md §5.11). Must never throw on malformed plans: report issues instead.
export function validatePlan(_plan: Plan): Issue[] {
  return [];
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
