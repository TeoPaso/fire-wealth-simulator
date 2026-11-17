'use client';

import { useState } from 'react';
import type { CareerPhase } from '@/lib/engine';
import { useFormat, useI18n, useT } from '@/lib/i18n';
import { Banner, Button } from '../../ui';
import { listOf, numOr, usePlanEditor } from '../editor';
import { FieldGrid, PlanNumber } from '../fields';
import { shiftCareerAges } from '../model/career';

type AgeChange = { from: number; to: number; undo: CareerPhase[] | null };

/** Profilo: age, plan horizon, start year. */
export function ProfileSection() {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const profile = plan.profile;
  const referenceYear = numOr(plan.taxRules?.referenceYear);
  // Career phases are absolute ages: after an age change, offer to move them by the same number of years (UX-02).
  const [ageChange, setAgeChange] = useState<AgeChange | null>(null);
  return (
    <>
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
          onChange={(v) => {
            const from = ageChange && ageChange.undo === null ? ageChange.from : numOr(profile.currentAge);
            update((d) => {
              d.profile.currentAge = v;
            });
            setAgeChange(Number.isFinite(from) && from !== v && listOf(plan.career).length > 0 ? { from, to: v, undo: null } : null);
          }}
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
      {ageChange ? <CareerShiftOffer change={ageChange} onChange={setAgeChange} /> : null}
    </>
  );
}

/** "Your career phases end at 35, 45, 67: move them by +8 years?" — with undo once applied. */
function CareerShiftOffer({ change, onChange }: { change: AgeChange; onChange: (next: AgeChange | null) => void }) {
  const { t, tp, format } = useI18n();
  const { plan, update } = usePlanEditor();
  const career = listOf(plan.career);
  const ends = (list: readonly CareerPhase[]) => format.list(list.map((p) => format.num(numOr(p.untilAge))));

  if (change.undo) {
    return (
      <Banner
        tone="success"
        live="status"
        className="mt-4"
        onDismiss={() => onChange(null)}
        actions={
          <Button
            size="sm"
            onClick={() => {
              const previous = change.undo as CareerPhase[];
              update((d) => {
                d.career = previous.map((p) => ({ ...p }));
              });
              onChange({ ...change, undo: null });
            }}
          >
            {t('inputs.profile.shift.undo')}
          </Button>
        }
      >
        {t('inputs.profile.shift.done', { ages: ends(career) })}
      </Banner>
    );
  }

  const delta = change.to - change.from;
  const shifted = shiftCareerAges(career, delta, change.to);
  if (shifted.every((p, i) => p.untilAge === career[i]?.untilAge)) return null;
  return (
    <Banner
      tone="info"
      live="status"
      className="mt-4"
      onDismiss={() => onChange(null)}
      actions={
        <>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              update((d) => {
                d.career = shifted;
              });
              onChange({ ...change, undo: career.map((p) => ({ ...p })) });
            }}
          >
            {tp('inputs.profile.shift.apply', Math.abs(delta), { sign: delta > 0 ? '+' : '−' })}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            {t('inputs.profile.shift.keep')}
          </Button>
        </>
      }
    >
      {t('inputs.profile.shift.body', { ages: ends(career), shifted: ends(shifted) })}
    </Banner>
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
