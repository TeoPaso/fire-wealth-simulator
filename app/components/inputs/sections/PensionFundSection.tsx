'use client';

import { yieldTaxRatePct, type PensionFundAccessMode, type VoluntaryPensionMode } from '@/lib/engine';
import { useFormat, useT, useTranslatedOptions } from '@/lib/i18n';
import { Button } from '../../ui';
import { numOr, usePlanEditor } from '../editor';
import { FieldGrid, Note, PlanNumber, PlanSelect, PlanSwitch, PlanText, SubHeading } from '../fields';

const VOLUNTARY_OPTIONS = [
  { value: 'none', labelKey: 'inputs.pf.voluntary.none' },
  { value: 'fillCap', labelKey: 'inputs.pf.voluntary.fillCap' },
  { value: 'fixed', labelKey: 'inputs.pf.voluntary.fixed' },
] as const satisfies readonly { value: VoluntaryPensionMode; labelKey: string }[];

const ACCESS_MODE_OPTIONS = [
  { value: 'retirement', labelKey: 'inputs.pf.accessMode.retirement' },
  { value: 'rita', labelKey: 'inputs.pf.accessMode.rita' },
  { value: 'redemption', labelKey: 'inputs.pf.accessMode.redemption' },
] as const satisfies readonly { value: PensionFundAccessMode; labelKey: string }[];

/**
 * Fondo pensione e TFR: fund line, access (ordinary benefit / RITA / riscatto per inoccupazione), lump sum vs annuity,
 * voluntary contributions.
 */
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
  const accessModeOptions = useTranslatedOptions(ACCESS_MODE_OPTIONS);
  const accessMode = pf.accessMode;
  const ordinaryBenefit = accessMode === 'retirement';
  // Legal windows derived from the plan's rules (no legal number is hard-coded here).
  const ritaYearsUnemployed = Number.isFinite(numOr(pfr?.ritaMaxYearsEarlyUnemployed))
    ? numOr(pfr?.ritaMaxYearsEarlyUnemployed)
    : 2 * ritaYears;
  const ritaFrom = oldAge - ritaYears;
  const ritaFromUnemployed = oldAge - ritaYearsUnemployed;
  const redemptionAfter = numOr(pfr?.redemptionAfterUnemployedYears);
  const redemptionBlocked = numOr(pfr?.redemptionBlockedYearsBeforeOldAge);
  const age = (x: number) => format.num(x);
  const accessModeDescription =
    accessMode === 'retirement'
      ? t('inputs.pf.accessMode.retirementDesc', { oldAge: age(oldAge), max: n(pfr?.maxCapitalSharePct) })
      : accessMode === 'rita'
        ? t('inputs.pf.accessMode.ritaDesc', {
            oldAge: age(oldAge),
            years: age(ritaYears),
            from: age(ritaFrom),
            yearsUnemployed: age(ritaYearsUnemployed),
            fromUnemployed: age(ritaFromUnemployed),
          })
        : accessMode === 'redemption'
          ? t('inputs.pf.accessMode.redemptionDesc', {
              after: age(redemptionAfter),
              blocked: age(redemptionBlocked),
              oldAge: age(oldAge),
              fallback: age(oldAge - redemptionBlocked),
            })
          : undefined;
  const accessAgeDescription =
    accessMode === 'redemption'
      ? t('inputs.pf.accessAgeRedemption', { after: age(redemptionAfter) })
      : accessMode === 'rita'
        ? t('inputs.pf.accessAgeRita', { from: age(ritaFrom), fromUnemployed: age(ritaFromUnemployed), oldAge: age(oldAge) })
        : t('inputs.pf.accessAgeRetirement', { oldAge: age(oldAge) });

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

      <SubHeading help={t('inputs.pf.accessHelp')} label={t('inputs.pf.accessTitle')}>
        {t('inputs.pf.accessTitle')}
      </SubHeading>
      <FieldGrid>
        <PlanSelect<PensionFundAccessMode>
          path="pensionFund.accessMode"
          className="sm:col-span-2"
          label={t('inputs.pf.accessMode')}
          help={t('inputs.pf.accessModeHelp')}
          value={(accessMode ?? '') as PensionFundAccessMode}
          options={accessModeOptions}
          disabled={!enabled}
          description={accessModeDescription}
          onChange={(v) =>
            update((d) => {
              d.pensionFund.accessMode = v;
            })
          }
        />
        <div className="sm:col-span-2">
          <PlanNumber
            path="pensionFund.accessAge"
            label={t('inputs.pf.accessAge')}
            help={t('inputs.pf.accessAgeHelp', {
              oldAge: format.num(oldAge),
              years: format.num(ritaYears),
              yearsUnemployed: format.num(ritaYearsUnemployed),
              min: format.num(numOr(pfr?.minMembershipYears)),
            })}
            description={accessAgeDescription}
            unit={t('common.unit.age')}
            value={numOr(pf.accessAge)}
            integer
            min={0}
            step={1}
            disabled={!enabled || accessMode === 'redemption'}
            onChange={(v) =>
              update((d) => {
                d.pensionFund.accessAge = v;
              })
            }
          />
          {/* Switching to RITA leaves the ordinary access age (no silent change): offer the earliest RITA age explicitly. */}
          {enabled && accessMode === 'rita' && Number.isFinite(ritaFrom) && numOr(pf.accessAge) >= oldAge ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-7 px-2 text-xs text-cyan-300"
              onClick={() =>
                update((d) => {
                  d.pensionFund.accessAge = ritaFrom;
                })
              }
            >
              {t('inputs.pf.useRitaAge', { age: format.num(ritaFrom) })}
            </Button>
          ) : null}
          {/* Same the other way round: back to the ordinary benefit with an early (RITA) age, offer the old-age age. */}
          {enabled && ordinaryBenefit && Number.isFinite(oldAge) && numOr(pf.accessAge) < oldAge ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-7 px-2 text-xs text-cyan-300"
              onClick={() =>
                update((d) => {
                  d.pensionFund.accessAge = oldAge;
                })
              }
            >
              {t('inputs.pf.useOldAge', { age: format.num(oldAge) })}
            </Button>
          ) : null}
        </div>
        <PlanNumber
          path="pensionFund.capitalSharePct"
          label={t('inputs.pf.capitalSharePct')}
          help={t('inputs.pf.capitalSharePctHelp', { max: n(pfr?.maxCapitalSharePct) })}
          description={
            ordinaryBenefit
              ? t('inputs.pf.capitalSharePctDesc', { max: n(pfr?.maxCapitalSharePct) })
              : t('inputs.pf.onlyRetirementMode')
          }
          unit={t('common.unit.pct')}
          value={numOr(pf.capitalSharePct)}
          min={0}
          max={100}
          step={5}
          disabled={!enabled || !ordinaryBenefit}
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
          description={ordinaryBenefit ? undefined : t('inputs.pf.onlyRetirementMode')}
          unit={t('common.unit.pct')}
          value={numOr(pf.annuityRatePct)}
          min={0}
          step={0.1}
          disabled={!enabled || !ordinaryBenefit}
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
  const ret = format.pct(numOr(pf.expectedReturnPct), 1);
  if (pf.accessMode === 'rita') {
    return <>{t('inputs.pf.summaryRita', { ret, age: format.num(numOr(pf.accessAge)) })}</>;
  }
  if (pf.accessMode === 'redemption') {
    return (
      <>
        {t('inputs.pf.summaryRedemption', {
          ret,
          after: format.num(numOr(plan.taxRules.pensionFund?.redemptionAfterUnemployedYears)),
        })}
      </>
    );
  }
  return (
    <>
      {t('inputs.pf.summaryOn', {
        ret,
        age: format.num(numOr(pf.accessAge)),
        capital: format.pct(numOr(pf.capitalSharePct), 0),
      })}
    </>
  );
}
