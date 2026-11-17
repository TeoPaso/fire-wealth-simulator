'use client';

/**
 * Plan editor context for the inputs panel: the active plan, its validation issues (by path) and `update`, which
 * routes every edit through the store (`updatePlan(id, recipe)` on a draft copy).
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Issue, Plan } from '@/lib/engine';
import { usePlanActions } from '@/lib/store/hooks';
import type { FieldIssue } from '../ui';
import { useIssueText } from './issueText';
import { fieldDomId, groupIssuesByPath, normalizePath } from './model/paths';

export interface PlanEditor {
  plan: Plan;
  /** All validation issues of the plan. */
  issues: readonly Issue[];
  /** Applies `recipe` to a draft copy of the plan (never mutate `plan` directly). */
  update: (recipe: (draft: Plan) => void) => void;
  /** Raw issues whose path is exactly `path` (after normalisation). */
  issuesFor: (path: string) => Issue[];
  /** Same, translated for the UI kit fields. */
  fieldIssues: (path: string) => FieldIssue[];
  /** Translated message of an issue. */
  issueText: (issue: Issue) => string;
  /** DOM id of the control for `path`. */
  fieldId: (path: string) => string;
}

const EditorContext = createContext<PlanEditor | null>(null);

export function PlanEditorProvider({ plan, issues, children }: { plan: Plan; issues: readonly Issue[]; children: ReactNode }) {
  const { updatePlan } = usePlanActions();
  const issueText = useIssueText();
  const value = useMemo<PlanEditor>(() => {
    const byPath = groupIssuesByPath(issues);
    const issuesFor = (path: string) => byPath.get(normalizePath(path)) ?? [];
    return {
      plan,
      issues,
      update: (recipe) => updatePlan(plan.id, recipe),
      issuesFor,
      fieldIssues: (path) => issuesFor(path).map((i) => ({ level: i.level, message: issueText(i) })),
      issueText,
      fieldId: fieldDomId,
    };
  }, [plan, issues, updatePlan, issueText]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function usePlanEditor(): PlanEditor {
  const value = useContext(EditorContext);
  if (!value) throw new Error('usePlanEditor must be used inside <PlanEditorProvider>');
  return value;
}

/** Numeric value of a stored field, NaN when missing (partial stored plans): the field then shows empty. */
export function numOr(value: unknown): number {
  return typeof value === 'number' ? value : NaN;
}

/** Array stored at a field, [] when the stored value is not an array (partial plans). */
export function listOf<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

/** React keys for list items: their ids when present and unique, otherwise the position. */
export function itemKeys(list: readonly unknown[]): string[] {
  const ids = list.map((item) => (item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined));
  const unique = ids.every((id, i) => typeof id === 'string' && id !== '' && ids.indexOf(id) === i);
  return unique ? (ids as string[]) : list.map((_, i) => `#${i}`);
}
