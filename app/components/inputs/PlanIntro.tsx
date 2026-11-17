'use client';

/**
 * Top-of-panel guidance (UX-03, UX-05, ROB-07):
 * - ExampleIntro: while the active plan is one of the example plans, says so (it describes a fictional person) and
 *   lists the four inputs that matter most, each linked to its field and ticked once it differs from the example;
 * - PlanNotes: the plan's notes (for plans converted from v1 they say which values were assumed or estimated), shown
 *   until dismissed for that text, and editable/clearable in place.
 */
import { useState } from 'react';
import { CircleCheck, Circle, NotebookPen, Sparkles, X } from 'lucide-react';
import { createExamplePlans, type Plan } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { EXAMPLE_NAME_KEYS } from '@/lib/store/store';
import { Banner, Button, cn } from '../ui';
import { CONTROL_CLASS, controlBorder } from '../ui/Field';
import { usePlanEditor } from './editor';

const INTRO_KEY = 'fire-planner:ui:intro-dismissed';
const NOTES_KEY = 'fire-planner:ui:notes-dismissed';

function readFlag(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Per-viewer convenience only.
  }
}

/** Small stable hash of a text (to remember which notes were dismissed without storing them twice). */
function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return `${text.length}:${(h >>> 0).toString(36)}`;
}

export interface EssentialStep {
  path: string;
  key: string;
  done: boolean;
}

/** The four essential inputs of an example plan, ticked once they differ from the example's own values. */
export function essentialSteps(plan: Plan, example: Plan): EssentialStep[] {
  const holdings = (p: Plan) => JSON.stringify(Array.isArray(p.assets?.holdings) ? p.assets.holdings.map((h) => h?.value) : []);
  return [
    { path: 'profile.currentAge', key: 'inputs.intro.step.age', done: plan.profile?.currentAge !== example.profile.currentAge },
    { path: 'career[0].ralToday', key: 'inputs.intro.step.salary', done: plan.career?.[0]?.ralToday !== example.career[0].ralToday },
    { path: 'spending.monthlyToday', key: 'inputs.intro.step.spending', done: plan.spending?.monthlyToday !== example.spending.monthlyToday },
    {
      path: 'assets.cash',
      key: 'inputs.intro.step.wealth',
      done:
        plan.assets?.cash !== example.assets.cash ||
        holdings(plan) !== holdings(example) ||
        plan.assets?.pensionFund?.balance !== example.assets.pensionFund.balance,
    },
  ];
}

export function ExampleIntro({ onGoTo }: { onGoTo: (path: string) => void }) {
  const { t, format } = useI18n();
  const { plan } = usePlanEditor();
  const [dismissed, setDismissed] = useState(() => readFlag(INTRO_KEY) === '1');
  if (dismissed || !EXAMPLE_NAME_KEYS[plan.id]) return null;
  const example = createExamplePlans().find((p) => p.id === plan.id) ?? createExamplePlans()[0];
  const steps = essentialSteps(plan, example);
  const allDone = steps.every((s) => s.done);
  const dismiss = () => {
    writeFlag(INTRO_KEY, '1');
    setDismissed(true);
  };

  return (
    <section
      aria-labelledby="example-intro-title"
      data-testid="example-intro"
      className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3.5 text-sm text-cyan-50"
    >
      <div className="flex items-start gap-2">
        <Sparkles aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-cyan-300" />
        <div className="min-w-0 flex-1">
          <h2 id="example-intro-title" className="font-semibold">
            {allDone ? t('inputs.intro.doneTitle') : t('inputs.intro.title')}
          </h2>
          <p className="mt-0.5 leading-relaxed">
            {allDone
              ? t('inputs.intro.doneBody')
              : t('inputs.intro.body', {
                  name: plan.name,
                  age: format.num(example.profile.currentAge),
                  ral: format.eur(example.career[0].ralToday),
                  spending: format.eur(example.spending.monthlyToday),
                })}
          </p>
          <ol className="mt-2 space-y-1">
            {steps.map((step, i) => {
              const Icon = step.done ? CircleCheck : Circle;
              return (
                <li key={step.path}>
                  <button
                    type="button"
                    onClick={() => onGoTo(step.path)}
                    className="inline-flex items-start gap-2 text-left underline decoration-cyan-300/50 underline-offset-2 hover:decoration-cyan-200"
                  >
                    <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', step.done ? 'text-emerald-300' : 'text-cyan-300')} />
                    <span>
                      {`${i + 1}. ${t(step.key)}`}
                      <span className="sr-only">{` (${t(step.done ? 'inputs.intro.stepDone' : 'inputs.intro.stepTodo')})`}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-cyan-100/80">{t('inputs.intro.advancedHint')}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('inputs.intro.dismiss')}
          title={t('inputs.intro.dismiss')}
          className="-m-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-80 transition hover:bg-white/10 hover:opacity-100"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export function PlanNotes() {
  const { t } = useI18n();
  const { plan, update } = usePlanEditor();
  const notes = typeof plan.notes === 'string' ? plan.notes : '';
  const hash = hashText(notes);
  const [dismissed, setDismissed] = useState<string | null>(() => readFlag(`${NOTES_KEY}:${plan.id}`));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [prevNotes, setPrevNotes] = useState(notes);
  if (prevNotes !== notes) {
    setPrevNotes(notes);
    if (!editing) setDraft(notes);
  }

  if (!editing && (notes.trim() === '' || dismissed === hash)) return null;

  const save = () => {
    update((d) => {
      d.notes = draft;
    });
    setEditing(false);
  };

  return (
    <Banner
      tone="info"
      live="off"
      title={t('inputs.notes.title')}
      onDismiss={
        editing
          ? undefined
          : () => {
              writeFlag(`${NOTES_KEY}:${plan.id}`, hash);
              setDismissed(hash);
            }
      }
      actions={
        editing ? (
          <>
            <Button size="sm" variant="primary" onClick={save}>
              {t('common.actions.save')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(notes);
                setEditing(false);
              }}
            >
              {t('common.actions.cancel')}
            </Button>
          </>
        ) : (
          <Button size="sm" icon={<NotebookPen />} onClick={() => setEditing(true)}>
            {t('inputs.notes.edit')}
          </Button>
        )
      }
    >
      {editing ? (
        <>
          <label htmlFor="plan-notes" className="sr-only">
            {t('inputs.notes.title')}
          </label>
          <textarea
            id="plan-notes"
            value={draft}
            rows={6}
            onChange={(e) => setDraft(e.target.value)}
            className={cn(CONTROL_CLASS, controlBorder(false), 'mt-1 h-auto py-2 leading-relaxed')}
          />
          <p className="mt-1 text-xs">{t('inputs.notes.editHint')}</p>
        </>
      ) : (
        <div data-testid="plan-notes" className="whitespace-pre-line">
          {notes}
        </div>
      )}
    </Banner>
  );
}
