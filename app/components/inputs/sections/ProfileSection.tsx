'use client';

import { useFormat, useT } from '@/lib/i18n';
import { numOr, usePlanEditor } from '../editor';
import { FieldGrid, PlanNumber } from '../fields';

/** Profilo: age, plan horizon, start year. */
export function ProfileSection() {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const profile = plan.profile;
  const referenceYear = numOr(plan.taxRules?.referenceYear);
  return (
    <FieldGrid>
      <PlanNumber
        path="profile.currentAge"
        label={t('inputs.profile.currentAge')}
        help={t('inputs.profile.currentAgeHelp')}
        unit={t('common.unit.age')}
        value={numOr(profile.currentAge)}
        integer
        min={0}
        step={1}
        onChange={(v) =>
          update((d) => {
            d.profile.currentAge = v;
          })
        }
      />
      <PlanNumber
        path="profile.lifeExpectancy"
        label={t('inputs.profile.lifeExpectancy')}
        help={t('inputs.profile.lifeExpectancyHelp')}
        unit={t('common.unit.age')}
        value={numOr(profile.lifeExpectancy)}
        integer
        min={0}
        step={1}
        onChange={(v) =>
          update((d) => {
            d.profile.lifeExpectancy = v;
          })
        }
      />
      <PlanNumber
        path="profile.startYear"
        label={t('inputs.profile.startYear')}
        help={t('inputs.profile.startYearHelp', { year: Number.isFinite(referenceYear) ? referenceYear : '—' })}
        value={numOr(profile.startYear)}
        integer
        grouping={false}
        min={0}
        step={1}
        onChange={(v) =>
          update((d) => {
            d.profile.startYear = v;
          })
        }
      />
    </FieldGrid>
  );
}

export function ProfileSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const p = plan.profile;
  return (
    <>
      {t('inputs.profile.summary', {
        age: format.num(numOr(p.currentAge)),
        horizon: format.num(numOr(p.lifeExpectancy)),
        year: Number.isFinite(p.startYear) ? p.startYear : '—',
      })}
    </>
  );
}
