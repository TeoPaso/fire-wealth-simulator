'use client';

import { fireNumberToday, type RetirementMode, type WithdrawalStrategy } from '@/lib/engine';
import { useFormat, useT, useTranslatedOptions } from '@/lib/i18n';
import { SegmentedControl } from '../../ui';
import { numOr, usePlanEditor } from '../editor';
import { FieldGrid, FieldGroup, PlanNumber, PlanSelect, SubHeading } from '../fields';

const STRATEGY_OPTIONS = [
  { value: 'constantReal', labelKey: 'inputs.withdrawal.strategy.constantReal' },
  { value: 'guardrails', labelKey: 'inputs.withdrawal.strategy.guardrails' },
] as const satisfies readonly { value: WithdrawalStrategy; labelKey: string }[];

/** Ritiro e prelievi: when to stop working, SWR, withdrawal strategy. */
export function WithdrawalSection() {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const mode = plan.retirement.mode;
  const w = plan.withdrawal;
  const strategyOptions = useTranslatedOptions(STRATEGY_OPTIONS);
  const swr = numOr(w.swrPct);
  // Classic FIRE number from the engine (annual retirement spending / SWR), shown as a reference while editing.
  const fireNumber = swr > 0 ? fireNumberToday(plan) : NaN;

  return (
    <div className="space-y-4">
      <FieldGroup
        path="retirement.mode"
        label={t('inputs.withdrawal.mode')}
        help={t('inputs.withdrawal.modeHelp')}
        description={
          mode === 'auto' ? t('inputs.withdrawal.modeAutoDesc') : mode === 'fixedAge' ? t('inputs.withdrawal.modeFixedDesc') : undefined
        }
      >
        <SegmentedControl<RetirementMode>
          label={t('inputs.withdrawal.mode')}
          value={mode}
          onChange={(v) =>
            update((d) => {
              d.retirement.mode = v;
            })
          }
          options={[
            { value: 'auto', label: t('inputs.withdrawal.modeAuto') },
            { value: 'fixedAge', label: t('inputs.withdrawal.modeFixed') },
          ]}
        />
      </FieldGroup>
      <FieldGrid>
        <PlanNumber
          path="retirement.fixedAge"
          label={t('inputs.withdrawal.fixedAge')}
          help={t('inputs.withdrawal.fixedAgeHelp')}
          description={mode !== 'fixedAge' ? t('inputs.withdrawal.fixedAgeOnly') : undefined}
          unit={t('common.unit.age')}
          value={numOr(plan.retirement.fixedAge)}
          integer
          min={0}
          step={1}
          disabled={mode !== 'fixedAge'}
          onChange={(v) =>
            update((d) => {
              d.retirement.fixedAge = v;
            })
          }
        />
      </FieldGrid>

      <SubHeading>{t('inputs.withdrawal.withdrawalsTitle')}</SubHeading>
      <FieldGrid>
        <PlanNumber
          path="withdrawal.swrPct"
          label={t('inputs.withdrawal.swrPct')}
          help={t('inputs.withdrawal.swrPctHelp')}
          description={
            swr > 0 && Number.isFinite(fireNumber)
              ? t('inputs.withdrawal.swrPctDesc', { amount: format.eur(fireNumber), multiple: format.num(100 / swr, { decimals: 1 }) })
              : undefined
          }
          unit={t('common.unit.pct')}
          value={swr}
          min={0}
          step={0.1}
          onChange={(v) =>
            update((d) => {
              d.withdrawal.swrPct = v;
            })
          }
        />
        <PlanSelect<WithdrawalStrategy>
          path="withdrawal.strategy"
          label={t('inputs.withdrawal.strategyLabel')}
          help={t('inputs.withdrawal.strategyHelp')}
          value={(w.strategy ?? '') as WithdrawalStrategy}
          options={strategyOptions}
          onChange={(v) =>
            update((d) => {
              d.withdrawal.strategy = v;
            })
          }
        />
        <PlanNumber
          path="withdrawal.guardrailCutPct"
          label={t('inputs.withdrawal.guardrailCutPct')}
          help={t('inputs.withdrawal.guardrailCutPctHelp')}
          description={w.strategy !== 'guardrails' ? t('inputs.withdrawal.guardrailOnly') : undefined}
          unit={t('common.unit.pct')}
          value={numOr(w.guardrailCutPct)}
          min={0}
          max={100}
          step={1}
          disabled={w.strategy !== 'guardrails'}
          onChange={(v) =>
            update((d) => {
              d.withdrawal.guardrailCutPct = v;
            })
          }
        />
      </FieldGrid>
    </div>
  );
}

export function WithdrawalSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const swr = format.pct(numOr(plan.withdrawal.swrPct), 1);
  return (
    <>
      {plan.retirement.mode === 'fixedAge'
        ? t('inputs.withdrawal.summaryFixed', { age: format.num(numOr(plan.retirement.fixedAge)), swr })
        : t('inputs.withdrawal.summaryAuto', { swr })}
    </>
  );
}
