'use client';

import { yieldTaxRatePct, type VoluntaryPensionMode } from '@/lib/engine';
import { useFormat, useT, useTranslatedOptions } from '@/lib/i18n';
import { numOr, usePlanEditor } from '../editor';
import { FieldGrid, Note, PlanNumber, PlanSelect, PlanSwitch, PlanText, SubHeading } from '../fields';

const VOLUNTARY_OPTIONS = [
  { value: 'none', labelKey: 'inputs.pf.voluntary.none' },
  { value: 'fillCap', labelKey: 'inputs.pf.voluntary.fillCap' },
  { value: 'fixed', labelKey: 'inputs.pf.voluntary.fixed' },
] as const satisfies readonly { value: VoluntaryPensionMode; labelKey: string }[];

/** Fondo pensione e TFR: fund line, access (RITA / ordinary benefit), lump sum vs annuity, voluntary contributions. */
export function PensionFundSection() {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const pf = plan.pensionFund;
  const rules = plan.taxRules;
  const pfr = rules.pensionFund;
  const enabled = pf.enabled === true;
  const voluntaryOptions = useTranslatedOptions(VOLUNTARY_OPTIONS);
  const n = (x: unknown, decimals = 2) => format.num(numOr(x), { decimals });
  const oldAge = numOr(rules.statePension?.oldAgeAge);
  const ritaYears = numOr(pfr?.ritaMaxYearsEarly);
  const govShare = numOr(pf.govBondSharePct);
  const yieldTax = pfr && Number.isFinite(govShare) ? yieldTaxRatePct(govShare, rules) : NaN;
  const cap = format.eur(numOr(pfr?.deductionCap));
  const voluntary = plan.savingsPolicy.voluntaryPension;

  return (
    <div>
      <Note className="mb-4">{t('inputs.pf.intro', { cap })}</Note>
      <PlanSwitch
        path="pensionFund.enabled"
        label={t('inputs.pf.enabled')}
        description={enabled ? t('inputs.pf.enabledDesc') : t('inputs.pf.disabledDesc')}
        checked={enabled}
        onChange={(v) =>
          update((d) => {
            d.pensionFund.enabled = v;
          })
        }
      />

      <SubHeading>{t('inputs.pf.lineTitle')}</SubHeading>
      <FieldGrid>
        <PlanText
          path="pensionFund.name"
          className="sm:col-span-2"
          label={t('inputs.pf.name')}
          value={typeof pf.name === 'string' ? pf.name : ''}
          maxLength={80}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.name = v;
            })
          }
        />
        <PlanNumber
          path="pensionFund.expectedReturnPct"
          label={t('inputs.pf.expectedReturnPct')}
          help={t('inputs.pf.expectedReturnPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(pf.expectedReturnPct)}
          step={0.1}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.expectedReturnPct = v;
            })
          }
        />
        <PlanNumber
          path="pensionFund.volatilityPct"
          label={t('inputs.pf.volatilityPct')}
          help={t('inputs.pf.volatilityPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(pf.volatilityPct)}
          min={0}
          step={0.5}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.volatilityPct = v;
            })
          }
        />
        <PlanNumber
          path="pensionFund.costPct"
          label={t('inputs.pf.costPct')}
          help={t('inputs.pf.costPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(pf.costPct)}
          min={0}
          step={0.01}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.costPct = v;
            })
          }
        />
        <PlanNumber
          path="pensionFund.govBondSharePct"
          label={t('inputs.pf.govBondSharePct')}
          help={t('inputs.pf.govBondSharePctHelp', { yield: n(pfr?.yieldTaxPct), gov: n(pfr?.govBondYieldTaxPct) })}
          description={Number.isFinite(yieldTax) ? t('inputs.pf.govBondSharePctDesc', { pct: format.num(yieldTax, { decimals: 2 }) }) : undefined}
          unit={t('common.unit.pct')}
          value={govShare}
          min={0}
          max={100}
          step={5}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.govBondSharePct = v;
            })
          }
        />
        <PlanNumber
          path="pensionFund.equityCorrelation"
          label={t('inputs.pf.equityCorrelation')}
          help={t('inputs.pf.equityCorrelationHelp')}
          value={numOr(pf.equityCorrelation)}
          min={-1}
          max={1}
          step={0.05}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.equityCorrelation = v;
            })
          }
        />
      </FieldGrid>

      <SubHeading>{t('inputs.pf.accessTitle')}</SubHeading>
      <FieldGrid>
        <PlanNumber
          path="pensionFund.accessAge"
          className="sm:col-span-2"
          label={t('inputs.pf.accessAge')}
          help={t('inputs.pf.accessAgeHelp', {
            oldAge: format.num(oldAge),
            years: format.num(ritaYears),
            min: format.num(numOr(pfr?.minMembershipYears)),
          })}
          description={
            Number.isFinite(oldAge) && Number.isFinite(ritaYears)
              ? t('inputs.pf.accessAgeDesc', { rita: format.num(oldAge - ritaYears), oldAge: format.num(oldAge) })
              : undefined
          }
          unit={t('common.unit.age')}
          value={numOr(pf.accessAge)}
          integer
          min={0}
          step={1}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.accessAge = v;
            })
          }
        />
        <PlanNumber
          path="pensionFund.capitalSharePct"
          label={t('inputs.pf.capitalSharePct')}
          help={t('inputs.pf.capitalSharePctHelp', { max: n(pfr?.maxCapitalSharePct) })}
          description={t('inputs.pf.capitalSharePctDesc', { max: n(pfr?.maxCapitalSharePct) })}
          unit={t('common.unit.pct')}
          value={numOr(pf.capitalSharePct)}
          min={0}
          max={100}
          step={5}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.capitalSharePct = v;
            })
          }
        />
        <PlanNumber
          path="pensionFund.annuityRatePct"
          label={t('inputs.pf.annuityRatePct')}
          help={t('inputs.pf.annuityRatePctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(pf.annuityRatePct)}
          min={0}
          step={0.1}
          disabled={!enabled}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.annuityRatePct = v;
            })
          }
        />
      </FieldGrid>
      <Note className="mt-3 text-xs">
        {t('inputs.pf.exitTaxNote', {
          max: n(pfr?.exitTaxMaxPct),
          min: n(pfr?.exitTaxMinPct),
          step: n(pfr?.exitTaxReductionPerYearPct),
          after: format.num(numOr(pfr?.exitTaxReductionAfterYears)),
        })}
      </Note>

      <SubHeading help={t('inputs.pf.voluntaryHelp', { cap })} label={t('inputs.pf.voluntaryTitle')}>
        {t('inputs.pf.voluntaryTitle')}
      </SubHeading>
      <FieldGrid>
        <PlanSelect<VoluntaryPensionMode>
          path="savingsPolicy.voluntaryPension"
          label={t('inputs.pf.voluntaryPension')}
          value={(voluntary ?? '') as VoluntaryPensionMode}
          options={voluntaryOptions}
          disabled={!enabled}
          description={
            voluntary === 'fillCap'
              ? t('inputs.pf.voluntary.fillCapDesc', { cap })
              : voluntary === 'fixed'
                ? t('inputs.pf.voluntary.fixedDesc')
                : t('inputs.pf.voluntary.noneDesc')
          }
          onChange={(v) =>
            update((d) => {
              d.savingsPolicy.voluntaryPension = v;
            })
          }
        />
        <PlanNumber
          path="savingsPolicy.voluntaryPensionFixedToday"
          label={t('inputs.pf.voluntaryPensionFixedToday')}
          help={t('inputs.pf.voluntaryPensionFixedTodayHelp')}
          unit={t('common.unit.eurTodayPerYear')}
          value={numOr(plan.savingsPolicy.voluntaryPensionFixedToday)}
          min={0}
          step={100}
          disabled={!enabled || voluntary !== 'fixed'}
          onChange={(v) =>
            update((d) => {
              d.savingsPolicy.voluntaryPensionFixedToday = v;
            })
          }
        />
      </FieldGrid>
      <Note className="mt-3 text-xs">{t('inputs.pf.tfrNote')}</Note>
    </div>
  );
}

export function PensionFundSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const pf = plan.pensionFund;
  if (pf.enabled !== true) return <>{t('inputs.pf.summaryOff')}</>;
  return (
    <>
      {t('inputs.pf.summaryOn', {
        ret: format.pct(numOr(pf.expectedReturnPct), 1),
        age: format.num(numOr(pf.accessAge)),
        capital: format.pct(numOr(pf.capitalSharePct), 0),
      })}
    </>
  );
}
