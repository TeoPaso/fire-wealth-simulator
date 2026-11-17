'use client';

import type { AssetClass, Holding, Plan } from '@/lib/engine';
import { useFormat, useT } from '@/lib/i18n';
import { Button, type SelectOption } from '../../ui';
import { listOf, numOr, usePlanEditor } from '../editor';
import { FieldGrid, ItemActions, ItemCard, Note, PathIssues, PlanNumber, PlanSelect, SubHeading } from '../fields';
import { layoutHoldings } from '../model/portfolio';

/** Patrimonio attuale: cash, current holdings per asset, pension fund, company TFR, INPS. */
export function WealthSection() {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const a = plan.assets;
  const assets = listOf(plan.portfolio.assets);
  const layout = layoutHoldings(plan);
  const pf = a.pensionFund;
  const pfRules = plan.taxRules.pensionFund;

  return (
    <div>
      <Note className="mb-4">{t('inputs.wealth.intro')}</Note>

      <SubHeading>{t('inputs.wealth.accessibleTitle')}</SubHeading>
      <FieldGrid>
        <PlanNumber
          path="assets.cash"
          label={t('inputs.wealth.cash')}
          help={t('inputs.wealth.cashHelp')}
          unit={t('common.unit.eur')}
          value={numOr(a.cash)}
          min={0}
          step={100}
          onChange={(v) =>
            update((d) => {
              d.assets.cash = v;
            })
          }
        />
      </FieldGrid>

      <SubHeading help={t('inputs.wealth.holdingsHelp')} label={t('inputs.wealth.holdingsTitle')}>
        {t('inputs.wealth.holdingsTitle')}
      </SubHeading>
      <PathIssues path="assets.holdings" className="mb-3" />
      {assets.length === 0 ? <Note>{t('inputs.wealth.noAssets')}</Note> : null}
      <div className="space-y-3">
        {assets.map((asset, i) => (
          <AssetHolding key={`${asset?.id ?? ''}#${i}`} asset={asset} assetIndex={i} holdingIndex={layout.byAsset.get(asset?.id)} />
        ))}
        {layout.others.map((h) => (
          <OtherHolding key={`other#${h}`} holdingIndex={h} />
        ))}
      </div>

      <SubHeading help={t('inputs.wealth.pfHelp')} label={t('inputs.wealth.pfTitle')}>
        {t('inputs.wealth.pfTitle')}
      </SubHeading>
      <FieldGrid>
        <PlanNumber
          path="assets.pensionFund.balance"
          label={t('inputs.wealth.pfBalance')}
          help={t('inputs.wealth.pfBalanceHelp')}
          unit={t('common.unit.eur')}
          value={numOr(pf.balance)}
          min={0}
          step={100}
          onChange={(v) =>
            update((d) => {
              d.assets.pensionFund.balance = v;
            })
          }
        />
        <div>
          <PlanNumber
            path="assets.pensionFund.taxableBasis"
            label={t('inputs.wealth.pfTaxableBasis')}
            help={t('inputs.wealth.pfTaxableBasisHelp')}
            unit={t('common.unit.eur')}
            value={numOr(pf.taxableBasis)}
            min={0}
            step={100}
            onChange={(v) =>
              update((d) => {
                d.assets.pensionFund.taxableBasis = v;
              })
            }
          />
          {numOr(pf.taxableBasis) === 0 && numOr(pf.balance) > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 h-7 px-2 text-xs text-cyan-300"
              onClick={() =>
                update((d) => {
                  d.assets.pensionFund.taxableBasis = d.assets.pensionFund.balance;
                })
              }
            >
              {t('inputs.wealth.useBalance', { value: format.eur(numOr(pf.balance)) })}
            </Button>
          ) : null}
        </div>
        <PlanNumber
          path="assets.pensionFund.membershipStartYear"
          label={t('inputs.wealth.pfMembershipStartYear')}
          help={t('inputs.wealth.pfMembershipStartYearHelp', {
            after: format.num(numOr(pfRules?.exitTaxReductionAfterYears)),
            max: format.num(numOr(pfRules?.exitTaxMaxPct), { decimals: 2 }),
            min: format.num(numOr(pfRules?.exitTaxMinPct), { decimals: 2 }),
            step: format.num(numOr(pfRules?.exitTaxReductionPerYearPct), { decimals: 2 }),
          })}
          value={numOr(pf.membershipStartYear)}
          integer
          grouping={false}
          min={0}
          step={1}
          onChange={(v) =>
            update((d) => {
              d.assets.pensionFund.membershipStartYear = v;
            })
          }
        />
      </FieldGrid>

      <SubHeading help={t('inputs.wealth.tfrHelp')} label={t('inputs.wealth.tfrTitle')}>
        {t('inputs.wealth.tfrTitle')}
      </SubHeading>
      <FieldGrid>
        <PlanNumber
          path="assets.companyTfr"
          label={t('inputs.wealth.companyTfr')}
          help={t('inputs.wealth.companyTfrHelp')}
          unit={t('common.unit.eur')}
          value={numOr(a.companyTfr)}
          min={0}
          step={100}
          onChange={(v) =>
            update((d) => {
              d.assets.companyTfr = v;
            })
          }
        />
        <PlanNumber
          path="assets.companyTfrYears"
          label={t('inputs.wealth.companyTfrYears')}
          help={t('inputs.wealth.companyTfrYearsHelp')}
          unit={t('common.unit.years')}
          value={numOr(a.companyTfrYears)}
          min={0}
          step={1}
          onChange={(v) =>
            update((d) => {
              d.assets.companyTfrYears = v;
            })
          }
        />
      </FieldGrid>

      <SubHeading help={t('inputs.wealth.inpsHelp')} label={t('inputs.wealth.inpsTitle')}>
        {t('inputs.wealth.inpsTitle')}
      </SubHeading>
      <FieldGrid>
        <PlanNumber
          path="assets.inps.contributionYears"
          label={t('inputs.wealth.contributionYears')}
          help={t('inputs.wealth.contributionYearsHelp')}
          unit={t('common.unit.years')}
          value={numOr(a.inps.contributionYears)}
          min={0}
          step={1}
          onChange={(v) =>
            update((d) => {
              d.assets.inps.contributionYears = v;
            })
          }
        />
        <PlanNumber
          path="assets.inps.montante"
          label={t('inputs.wealth.montante')}
          help={t('inputs.wealth.montanteHelp')}
          description={t('inputs.wealth.montanteDesc', {
            rate: format.num(numOr(plan.taxRules.inps?.pensionAccrualRatePct), { decimals: 2 }),
          })}
          unit={t('common.unit.eur')}
          value={numOr(a.inps.montante)}
          min={0}
          step={100}
          onChange={(v) =>
            update((d) => {
              d.assets.inps.montante = v;
            })
          }
        />
      </FieldGrid>
    </div>
  );
}

/** Ensures `d.assets.holdings` is an array and returns it. */
function holdingsDraft(d: Plan): Holding[] {
  if (!Array.isArray(d.assets.holdings)) d.assets.holdings = [];
  return d.assets.holdings;
}

/** Value and cost basis of the (first) holding of a portfolio asset; typing a value creates the holding. */
function AssetHolding({ asset, assetIndex, holdingIndex }: { asset: Partial<AssetClass> | undefined; assetIndex: number; holdingIndex: number | undefined }) {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const holding: Partial<Holding> | undefined = holdingIndex !== undefined ? plan.assets.holdings[holdingIndex] : undefined;
  const base = holdingIndex !== undefined ? `assets.holdings[${holdingIndex}]` : `assets.holdingOf[${assetIndex}]`;
  const name = asset?.name?.trim() ? asset.name : t('inputs.portfolio.assetUntitled', { n: assetIndex + 1 });
  const value = holding ? numOr(holding.value) : 0;
  const basis = holding ? numOr(holding.costBasis) : 0;

  const set = (field: 'value' | 'costBasis', v: number) =>
    update((d) => {
      const list = holdingsDraft(d);
      const current = holdingIndex !== undefined ? list[holdingIndex] : undefined;
      if (current && typeof current === 'object') current[field] = v;
      else if (typeof asset?.id === 'string') list.push({ assetId: asset.id, value: field === 'value' ? v : 0, costBasis: field === 'costBasis' ? v : 0 });
    });

  return (
    <ItemCard title={name} headingId={`${base}-heading`} className="p-3 sm:p-3">
      <PathIssues path={base} className="mb-2" />
      <FieldGrid>
        <PlanNumber
          path={`${base}.value`}
          label={t('inputs.wealth.holdingValue')}
          unit={t('common.unit.eur')}
          value={value}
          min={0}
          step={100}
          onChange={(v) => set('value', v)}
        />
        <div>
          <PlanNumber
            path={`${base}.costBasis`}
            label={t('inputs.wealth.holdingCostBasis')}
            help={t('inputs.wealth.holdingCostBasisHelp')}
            unit={t('common.unit.eur')}
            value={basis}
            min={0}
            step={100}
            onChange={(v) => set('costBasis', v)}
          />
          {basis === 0 && value > 0 ? (
            <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs text-cyan-300" onClick={() => set('costBasis', value)}>
              {t('inputs.wealth.useValue', { value: format.eur(value) })}
            </Button>
          ) : null}
        </div>
      </FieldGrid>
    </ItemCard>
  );
}

/** A holding whose asset is unknown (or a second holding of the same asset): reassign, edit or remove it. */
function OtherHolding({ holdingIndex }: { holdingIndex: number }) {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const raw = plan.assets.holdings[holdingIndex];
  const holding: Partial<Holding> = raw && typeof raw === 'object' ? raw : {};
  const base = `assets.holdings[${holdingIndex}]`;
  const options: SelectOption<string>[] = listOf(plan.portfolio.assets)
    .filter((a) => typeof a?.id === 'string')
    .map((a, i) => ({ value: a.id, label: a.name?.trim() ? a.name : t('inputs.portfolio.assetUntitled', { n: i + 1 }) }));
  const title = t('inputs.wealth.otherHolding', { n: holdingIndex + 1 });

  const set = (mutate: (h: Holding) => void) =>
    update((d) => {
      const h = holdingsDraft(d)[holdingIndex];
      if (h && typeof h === 'object') mutate(h);
    });

  return (
    <ItemCard
      title={title}
      subtitle={t('inputs.wealth.otherHoldingNote')}
      headingId={`${base}-heading`}
      invalid
      actions={
        <ItemActions
          itemName={title}
          onRemove={() =>
            update((d) => {
              holdingsDraft(d).splice(holdingIndex, 1);
            })
          }
          removeTitle={t('inputs.wealth.removeHoldingTitle')}
          removeBody={t('inputs.wealth.removeHoldingBody', { value: format.eur(numOr(holding.value)) })}
        />
      }
    >
      <PathIssues path={base} className="mb-2" />
      <FieldGrid>
        <PlanSelect<string>
          path={`${base}.assetId`}
          className="sm:col-span-2"
          label={t('inputs.wealth.holdingAsset')}
          value={typeof holding.assetId === 'string' ? holding.assetId : ''}
          options={options}
          onChange={(v) =>
            set((h) => {
              h.assetId = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.value`}
          label={t('inputs.wealth.holdingValue')}
          unit={t('common.unit.eur')}
          value={numOr(holding.value)}
          min={0}
          step={100}
          onChange={(v) =>
            set((h) => {
              h.value = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.costBasis`}
          label={t('inputs.wealth.holdingCostBasis')}
          help={t('inputs.wealth.holdingCostBasisHelp')}
          unit={t('common.unit.eur')}
          value={numOr(holding.costBasis)}
          min={0}
          step={100}
          onChange={(v) =>
            set((h) => {
              h.costBasis = v;
            })
          }
        />
      </FieldGrid>
    </ItemCard>
  );
}

export function WealthSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const a = plan.assets;
  const sum = (xs: number[]) => xs.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);
  const liquid = sum([numOr(a.cash), ...listOf(a.holdings).map((h) => numOr(h?.value))]);
  const locked = sum([numOr(a.pensionFund.balance), numOr(a.companyTfr)]);
  return <>{t('inputs.wealth.summary', { liquid: format.eur(liquid), locked: format.eur(locked) })}</>;
}
