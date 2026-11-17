'use client';

import type { StatePensionMode } from '@/lib/engine';
import { useFormat, useT } from '@/lib/i18n';
import { SegmentedControl } from '../../ui';
import { numOr, usePlanEditor } from '../editor';
import { FieldGrid, FieldGroup, Note, PlanNumber } from '../fields';

/** Pensione INPS: estimate vs contributivo calculation, claim age, revaluation and indexation. */
export function StatePensionSection() {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const sp = plan.statePension;
  const r = plan.taxRules.statePension;
  const mode = sp.mode;
  const n = (x: unknown) => format.num(numOr(x));

  return (
    <div className="space-y-4">
      <FieldGroup
        path="statePension.mode"
        label={t('inputs.sp.mode')}
        help={t('inputs.sp.modeHelp')}
        description={
          mode === 'estimate'
            ? t('inputs.sp.modeEstimateDesc')
            : mode === 'contributivo'
              ? t('inputs.sp.modeContributivoDesc', {
                  rate: format.num(numOr(plan.taxRules.inps?.pensionAccrualRatePct), { decimals: 2 }),
                })
              : undefined
        }
      >
        <SegmentedControl<StatePensionMode>
          label={t('inputs.sp.mode')}
          value={mode}
          onChange={(v) =>
            update((d) => {
              d.statePension.mode = v;
            })
          }
          options={[
            { value: 'contributivo', label: t('inputs.sp.modeContributivo') },
            { value: 'estimate', label: t('inputs.sp.modeEstimate') },
          ]}
        />
      </FieldGroup>
      <FieldGrid>
        <PlanNumber
          path="statePension.monthlyNetToday"
          label={t('inputs.sp.monthlyNetToday')}
          help={t('inputs.sp.monthlyNetTodayHelp', { n: n(r?.installmentsPerYear) })}
          description={mode !== 'estimate' ? t('inputs.sp.onlyEstimate') : undefined}
          unit={t('common.unit.eurTodayPerMonth')}
          value={numOr(sp.monthlyNetToday)}
          min={0}
          step={50}
          disabled={mode !== 'estimate'}
          onChange={(v) =>
            update((d) => {
              d.statePension.monthlyNetToday = v;
            })
          }
        />
        <PlanNumber
          path="statePension.claimAge"
          label={t('inputs.sp.claimAge')}
          help={t('inputs.sp.claimAgeHelp', {
            age: n(r?.oldAgeAge),
            years: n(r?.oldAgeMinYears),
            fbAge: n(r?.fallbackAge),
            fbYears: n(r?.fallbackMinYears),
          })}
          unit={t('common.unit.age')}
          value={numOr(sp.claimAge)}
          integer
          min={0}
          step={1}
          onChange={(v) =>
            update((d) => {
              d.statePension.claimAge = v;
            })
          }
        />
        <PlanNumber
          path="statePension.realGdpGrowthPct"
          label={t('inputs.sp.realGdpGrowthPct')}
          help={t('inputs.sp.realGdpGrowthPctHelp')}
          description={mode !== 'contributivo' ? t('inputs.sp.onlyContributivo') : undefined}
          unit={t('common.unit.pct')}
          value={numOr(sp.realGdpGrowthPct)}
          step={0.1}
          disabled={mode !== 'contributivo'}
          onChange={(v) =>
            update((d) => {
              d.statePension.realGdpGrowthPct = v;
            })
          }
        />
        <PlanNumber
          path="statePension.indexationPct"
          label={t('inputs.sp.indexationPct')}
          help={t('inputs.sp.indexationPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(sp.indexationPct)}
          min={0}
          step={5}
          onChange={(v) =>
            update((d) => {
              d.statePension.indexationPct = v;
            })
          }
        />
      </FieldGrid>
      <Note className="text-xs">{t('inputs.sp.wealthNote')}</Note>
    </div>
  );
}

export function StatePensionSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const sp = plan.statePension;
  const age = format.num(numOr(sp.claimAge));
  return (
    <>
      {sp.mode === 'estimate'
        ? t('inputs.sp.summaryEstimate', { amount: format.eur(numOr(sp.monthlyNetToday)), age })
        : t('inputs.sp.summaryContributivo', { age })}
    </>
  );
}
