'use client';

import { useMemo } from 'react';
import { BriefcaseBusiness, Plus } from 'lucide-react';
import { tfrQuota, type BonusRegime, type CareerPhase } from '@/lib/engine';
import { useFormat, useT, useTranslatedOptions } from '@/lib/i18n';
import { uniqueId } from '@/lib/store';
import { Button, EmptyState, cn, type SelectOption } from '../../ui';
import { itemKeys, listOf, numOr, usePlanEditor } from '../editor';
import { FieldGrid, ItemActions, ItemCard, Note, PathIssues, PlanNumber, PlanSelect, PlanText } from '../fields';
import { movePhaseDown, newPhase, phaseStartAge } from '../model/career';
import { takenIds } from '../model/portfolio';
import { CareerTimeline, phaseFill } from './career/CareerTimeline';
import { NetPayPreview } from './career/NetPayPreview';

const MENSILITA_OPTIONS: readonly SelectOption<string>[] = ['12', '13', '14'].map((v) => ({ value: v, label: v }));

const BONUS_REGIMES = [
  { value: 'ordinary', labelKey: 'inputs.career.bonusRegime.ordinary' },
  { value: 'pensionFund', labelKey: 'inputs.career.bonusRegime.pensionFund' },
  { value: 'welfare', labelKey: 'inputs.career.bonusRegime.welfare' },
] as const satisfies readonly { value: BonusRegime; labelKey: string }[];

/** Lavoro e carriera: timeline + one card per phase. */
export function CareerSection() {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const career = listOf(plan.career);
  const keys = itemKeys(career);

  const addPhase = () =>
    update((d) => {
      const id = uniqueId('phase', takenIds(d));
      const phase = newPhase(d, id);
      if (Array.isArray(d.career)) d.career.push(phase);
      else d.career = [phase];
    });

  return (
    <div className="space-y-4">
      <Note>{t('inputs.career.intro')}</Note>
      <CareerTimeline />
      <PathIssues path="career" />
      {career.length === 0 ? (
        <EmptyState icon={<BriefcaseBusiness />} title={t('inputs.career.emptyTitle')} description={t('inputs.career.emptyBody')} />
      ) : (
        career.map((_, i) => <PhaseEditor key={keys[i]} index={i} count={career.length} />)
      )}
      <Button icon={<Plus />} onClick={addPhase}>
        {t('inputs.career.add')}
      </Button>
    </div>
  );
}

function PhaseEditor({ index, count }: { index: number; count: number }) {
  const t = useT();
  const format = useFormat();
  const { plan, update, issuesFor } = usePlanEditor();
  const raw = plan.career[index];
  const phase: Partial<CareerPhase> = raw && typeof raw === 'object' ? raw : {};
  const base = `career[${index}]`;
  const rules = plan.taxRules;
  const name = t('inputs.career.phaseName', { n: index + 1 });
  const title = phase.label ? `${name} · ${phase.label}` : name;
  const from = phaseStartAge(plan, index);
  const fundEnabled = plan.pensionFund.enabled === true;

  const set = (mutate: (p: CareerPhase) => void) =>
    update((d) => {
      const p = d.career?.[index];
      if (p && typeof p === 'object') mutate(p);
    });

  const pb = rules.productivityBonus;
  const regimeOptions = useTranslatedOptions(BONUS_REGIMES);
  const bonusOptions = useMemo<SelectOption<BonusRegime>[]>(
    () => [
      {
        value: 'productivity',
        label: t('inputs.career.bonusRegime.productivity', { rate: format.num(numOr(pb?.ratePct), { decimals: 2 }) }),
      },
      ...regimeOptions,
    ],
    [t, format, pb?.ratePct, regimeOptions],
  );
  const bonusHelp =
    pb?.validUntilYear === null || pb?.validUntilYear === undefined
      ? t('inputs.career.bonusRegimeHelpNoExpiry', {
          rate: format.num(numOr(pb?.ratePct), { decimals: 2 }),
          cap: format.eur(numOr(pb?.cap)),
          limit: format.eur(numOr(pb?.priorYearIncomeLimit)),
        })
      : t('inputs.career.bonusRegimeHelp', {
          rate: format.num(numOr(pb.ratePct), { decimals: 2 }),
          cap: format.eur(numOr(pb.cap)),
          limit: format.eur(numOr(pb.priorYearIncomeLimit)),
          year: pb.validUntilYear,
          afterRate: format.num(numOr(pb.afterRatePct), { decimals: 2 }),
          afterCap: format.eur(numOr(pb.afterCap)),
        });
  const tfrPct = rules.tfr ? tfrQuota(100, rules) : NaN;
  const hasError = issuesFor(base).some((i) => i.level === 'error');

  return (
    <ItemCard
      headingId={`${base}-heading`}
      invalid={hasError}
      title={
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0 rounded-full', phaseFill(index))} />
          <span className="truncate">{title}</span>
        </span>
      }
      subtitle={t('inputs.career.phaseAges', { from: format.num(from), to: format.num(numOr(phase.untilAge)) })}
      actions={
        <ItemActions
          itemName={name}
          moveUpLabel={t('inputs.common.moveUp', { name })}
          moveDownLabel={t('inputs.common.moveDown', { name })}
          onMoveUp={
            index > 0
              ? () =>
                  update((d) => {
                    d.career = movePhaseDown(listOf(d.career), index - 1, d.profile.currentAge);
                  })
              : undefined
          }
          onMoveDown={
            index < count - 1
              ? () =>
                  update((d) => {
                    d.career = movePhaseDown(listOf(d.career), index, d.profile.currentAge);
                  })
              : undefined
          }
          onRemove={() =>
            update((d) => {
              if (Array.isArray(d.career)) d.career.splice(index, 1);
            })
          }
          removeTitle={t('inputs.career.removeTitle', { name })}
          removeBody={t('inputs.career.removeBody', { name: title })}
        />
      }
    >
      <PathIssues path={base} className="mb-3" />
      <FieldGrid>
        <PlanText
          path={`${base}.label`}
          label={t('inputs.career.label')}
          help={t('inputs.career.labelHelp')}
          value={typeof phase.label === 'string' ? phase.label : ''}
          maxLength={40}
          onChange={(v) =>
            set((p) => {
              p.label = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.untilAge`}
          label={t('inputs.career.untilAge')}
          help={t('inputs.career.untilAgeHelp')}
          description={t('inputs.career.untilAgeDesc', { from: format.num(from) })}
          unit={t('common.unit.age')}
          value={numOr(phase.untilAge)}
          integer
          min={0}
          step={1}
          onChange={(v) =>
            set((p) => {
              p.untilAge = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.ralToday`}
          label={t('inputs.career.ralToday')}
          help={t('inputs.career.ralTodayHelp')}
          unit={t('common.unit.eurToday')}
          value={numOr(phase.ralToday)}
          min={0}
          step={100}
          onChange={(v) =>
            set((p) => {
              p.ralToday = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.realRaisePct`}
          label={t('inputs.career.realRaisePct')}
          help={t('inputs.career.realRaisePctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(phase.realRaisePct)}
          step={0.1}
          onChange={(v) =>
            set((p) => {
              p.realRaisePct = v;
            })
          }
        />
        <PlanSelect<string>
          path={`${base}.mensilita`}
          label={t('inputs.career.mensilita')}
          help={t('inputs.career.mensilitaHelp')}
          value={String(phase.mensilita ?? '')}
          options={MENSILITA_OPTIONS}
          onChange={(v) =>
            set((p) => {
              p.mensilita = Number(v);
            })
          }
        />
        <PlanNumber
          path={`${base}.bonusGrossToday`}
          label={t('inputs.career.bonusGrossToday')}
          help={t('inputs.career.bonusGrossTodayHelp')}
          unit={t('common.unit.eurToday')}
          value={numOr(phase.bonusGrossToday)}
          min={0}
          step={100}
          onChange={(v) =>
            set((p) => {
              p.bonusGrossToday = v;
            })
          }
        />
        <PlanSelect<BonusRegime>
          path={`${base}.bonusRegime`}
          className="sm:col-span-2"
          label={t('inputs.career.bonusRegime')}
          help={bonusHelp}
          value={(phase.bonusRegime ?? '') as BonusRegime}
          options={bonusOptions}
          onChange={(v) =>
            set((p) => {
              p.bonusRegime = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.employeePensionPct`}
          label={t('inputs.career.employeePensionPct')}
          help={t('inputs.career.employeePensionPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(phase.employeePensionPct)}
          min={0}
          step={0.1}
          onChange={(v) =>
            set((p) => {
              p.employeePensionPct = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.employerPensionPct`}
          label={t('inputs.career.employerPensionPct')}
          help={t('inputs.career.employerPensionPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(phase.employerPensionPct)}
          min={0}
          step={0.1}
          onChange={(v) =>
            set((p) => {
              p.employerPensionPct = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.tfrToFundPct`}
          className="sm:col-span-2"
          label={t('inputs.career.tfrToFundPct')}
          help={t('inputs.career.tfrToFundPctHelp', {
            pct: format.num(tfrPct, { decimals: 2 }),
            fixed: format.num(numOr(rules.tfr?.revalFixedPct), { decimals: 2 }),
            share: format.num(numOr(rules.tfr?.revalInflationSharePct), { decimals: 2 }),
          })}
          description={t('inputs.career.tfrToFundPctDesc')}
          unit={t('common.unit.pct')}
          value={numOr(phase.tfrToFundPct)}
          min={0}
          max={100}
          step={25}
          onChange={(v) =>
            set((p) => {
              p.tfrToFundPct = v;
            })
          }
        />
      </FieldGrid>
      {!fundEnabled ? <Note className="mt-3 text-xs">{t('inputs.career.fundDisabledNote')}</Note> : null}
      <NetPayPreview index={index} />
    </ItemCard>
  );
}

export function CareerSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const career = listOf(plan.career);
  if (career.length === 0) return <>{t('inputs.career.summaryEmpty')}</>;
  const first = numOr(career[0]?.ralToday);
  const last = numOr(career[career.length - 1]?.ralToday);
  return (
    <>
      {t(career.length === 1 ? 'inputs.career.summaryOne' : 'inputs.career.summaryMany', {
        count: career.length,
        from: format.eur(first),
        to: format.eur(last),
      })}
    </>
  );
}
