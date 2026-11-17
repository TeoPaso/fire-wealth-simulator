'use client';

import { useMemo } from 'react';
import { Layers, Plus } from 'lucide-react';
import type { AssetClass, AssetKind, RebalancingMode } from '@/lib/engine';
import { useFormat, useT, useTranslatedOptions } from '@/lib/i18n';
import { uniqueId } from '@/lib/store';
import { EmptyState, Menu, SegmentedControl, cn, type MenuEntry } from '../../ui';
import { itemKeys, listOf, numOr, usePlanEditor } from '../editor';
import { FieldGrid, FieldGroup, ItemActions, ItemCard, Note, PathIssues, PlanNumber, PlanSelect, PlanText, SubHeading } from '../fields';
import { ASSET_TEMPLATES, allocationSum, assetFromTemplate, takenIds, templateTaxRatePct } from '../model/portfolio';

const KIND_OPTIONS = [
  { value: 'equity', labelKey: 'inputs.portfolio.kind.equity' },
  { value: 'bond', labelKey: 'inputs.portfolio.kind.bond' },
  { value: 'cash', labelKey: 'inputs.portfolio.kind.cash' },
  { value: 'other', labelKey: 'inputs.portfolio.kind.other' },
] as const satisfies readonly { value: AssetKind; labelKey: string }[];

/** Allocation colours (cycled), shared by the meter and the asset cards. */
const ASSET_FILLS = ['bg-cyan-400', 'bg-violet-400', 'bg-emerald-400', 'bg-amber-400', 'bg-sky-400', 'bg-rose-400', 'bg-lime-400'];
const assetFill = (i: number) => ASSET_FILLS[i % ASSET_FILLS.length];

/** Investimenti: emergency fund, asset classes, allocation meter, rebalancing, correlation. */
export function PortfolioSection() {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const assets = listOf(plan.portfolio.assets);
  const keys = itemKeys(assets);
  const rules = plan.taxRules;

  const templateItems = useMemo<MenuEntry[]>(
    () =>
      ASSET_TEMPLATES.map((tpl) => ({
        id: tpl.id,
        label: t(tpl.nameKey),
        hint:
          tpl.id === 'custom'
            ? t('inputs.portfolio.template.customHint')
            : t('inputs.portfolio.template.hint', {
                ret: format.pct(tpl.expectedReturnPct, 1),
                vol: format.pct(tpl.volatilityPct, 1),
                ter: format.pct(tpl.terPct, 2),
                tax: format.pct(rules.investments ? templateTaxRatePct(tpl, rules) : NaN, 1),
              }),
        onSelect: () =>
          update((d) => {
            const asset = assetFromTemplate(tpl, d.taxRules, uniqueId('asset', takenIds(d)), t(tpl.nameKey));
            if (Array.isArray(d.portfolio.assets)) d.portfolio.assets.push(asset);
            else d.portfolio.assets = [asset];
          }),
      })),
    [t, format, rules, update],
  );

  const rebalancing = plan.portfolio.rebalancing;

  return (
    <div>
      <Note className="mb-4">{t('inputs.portfolio.intro')}</Note>
      <FieldGrid>
        <PlanNumber
          path="savingsPolicy.emergencyFundMonths"
          label={t('inputs.portfolio.emergencyFundMonths')}
          help={t('inputs.portfolio.emergencyFundMonthsHelp')}
          unit={t('common.unit.months')}
          value={numOr(plan.savingsPolicy.emergencyFundMonths)}
          min={0}
          step={1}
          onChange={(v) =>
            update((d) => {
              d.savingsPolicy.emergencyFundMonths = v;
            })
          }
        />
      </FieldGrid>

      <SubHeading help={t('inputs.portfolio.assetsHelp')} label={t('inputs.portfolio.assetsTitle')}>
        {t('inputs.portfolio.assetsTitle')}
      </SubHeading>
      <AllocationMeter />
      <div className="mt-3 space-y-3">
        {assets.length === 0 ? (
          <EmptyState icon={<Layers />} title={t('inputs.portfolio.emptyTitle')} description={t('inputs.portfolio.emptyBody')} className="py-6" />
        ) : (
          assets.map((_, i) => <AssetEditor key={keys[i]} index={i} />)
        )}
        <Menu
          label={t('inputs.portfolio.add')}
          text={t('inputs.portfolio.add')}
          icon={<Plus />}
          align="start"
          items={templateItems}
          triggerClassName="border border-slate-700 bg-slate-800/60 text-slate-100 hover:border-slate-600"
        />
      </div>

      <SubHeading>{t('inputs.portfolio.policyTitle')}</SubHeading>
      <div className="space-y-4">
        <FieldGroup
          path="portfolio.rebalancing"
          label={t('inputs.portfolio.rebalancing')}
          help={t('inputs.portfolio.rebalancingHelp')}
          description={
            rebalancing === 'annual'
              ? t('inputs.portfolio.rebalancingAnnualDesc')
              : rebalancing === 'flows'
                ? t('inputs.portfolio.rebalancingFlowsDesc')
                : undefined
          }
        >
          <SegmentedControl<RebalancingMode>
            label={t('inputs.portfolio.rebalancing')}
            value={rebalancing}
            onChange={(v) =>
              update((d) => {
                d.portfolio.rebalancing = v;
              })
            }
            options={[
              { value: 'flows', label: t('inputs.portfolio.rebalancingFlows') },
              { value: 'annual', label: t('inputs.portfolio.rebalancingAnnual') },
            ]}
          />
        </FieldGroup>
        <FieldGrid>
          <PlanNumber
            path="portfolio.equityBondCorrelation"
            label={t('inputs.portfolio.equityBondCorrelation')}
            help={t('inputs.portfolio.equityBondCorrelationHelp')}
            value={numOr(plan.portfolio.equityBondCorrelation)}
            min={-1}
            max={1}
            step={0.05}
            onChange={(v) =>
              update((d) => {
                d.portfolio.equityBondCorrelation = v;
              })
            }
          />
        </FieldGrid>
      </div>
    </div>
  );
}

/** Allocation-sum meter: stacked bar of the target weights and what is left (or exceeds) to reach 100%. */
function AllocationMeter() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const assets = listOf(plan.portfolio.assets);
  const sum = allocationSum(assets);
  const scale = sum > 100 ? 100 / sum : 1;
  const diff = Math.round((100 - sum) * 1e6) / 1e6;
  const status = diff === 0 ? 'complete' : diff > 0 ? 'missing' : 'excess';
  const text =
    status === 'complete'
      ? t('inputs.portfolio.allocationComplete')
      : status === 'missing'
        ? t('inputs.portfolio.allocationMissing', { sum: format.num(sum, { decimals: 2 }), left: format.num(diff, { decimals: 2 }) })
        : t('inputs.portfolio.allocationExcess', { sum: format.num(sum, { decimals: 2 }), excess: format.num(-diff, { decimals: 2 }) });

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
      <div aria-hidden="true" className="flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
        {assets.map((a, i) => {
          const pct = numOr(a?.allocationPct);
          if (!(pct > 0)) return null;
          return <div key={i} className={cn('h-full border-r border-slate-950/70', assetFill(i))} style={{ width: `${pct * scale}%` }} />;
        })}
      </div>
      <p
        className={cn(
          'mt-2 text-sm font-medium',
          status === 'complete' ? 'text-emerald-300' : status === 'missing' ? 'text-amber-200' : 'text-rose-300',
        )}
      >
        {text}
      </p>
      <PathIssues path="portfolio.assets" className="mt-1" />
    </div>
  );
}

function AssetEditor({ index }: { index: number }) {
  const t = useT();
  const format = useFormat();
  const { plan, update, issuesFor } = usePlanEditor();
  const raw = plan.portfolio.assets[index];
  const asset: Partial<AssetClass> = raw && typeof raw === 'object' ? raw : {};
  const base = `portfolio.assets[${index}]`;
  const name = asset.name?.trim() ? asset.name : t('inputs.portfolio.assetUntitled', { n: index + 1 });
  const kindOptions = useTranslatedOptions(KIND_OPTIONS);
  const kindLabel = kindOptions.find((o) => o.value === asset.kind)?.label ?? String(asset.kind ?? '');
  const holdingValue = listOf(plan.assets.holdings)
    .filter((h) => h?.assetId === asset.id)
    .reduce((s, h) => s + (Number.isFinite(h?.value) ? h.value : 0), 0);
  const inv = plan.taxRules.investments;

  const set = (mutate: (a: AssetClass) => void) =>
    update((d) => {
      const a = d.portfolio.assets?.[index];
      if (a && typeof a === 'object') mutate(a);
    });

  return (
    <ItemCard
      headingId={`${base}-heading`}
      invalid={issuesFor(base).some((i) => i.level === 'error')}
      title={
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0 rounded-full', assetFill(index))} />
          <span className="truncate">{name}</span>
        </span>
      }
      subtitle={t('inputs.portfolio.assetSubtitle', { kind: kindLabel, pct: format.pct(numOr(asset.allocationPct), 1) })}
      actions={
        <ItemActions
          itemName={name ?? ''}
          onRemove={() =>
            update((d) => {
              const removed = d.portfolio.assets?.[index];
              if (Array.isArray(d.portfolio.assets)) d.portfolio.assets.splice(index, 1);
              if (removed && Array.isArray(d.assets.holdings)) {
                d.assets.holdings = d.assets.holdings.filter((h) => h?.assetId !== removed.id);
              }
            })
          }
          removeTitle={t('inputs.portfolio.removeTitle', { name: name ?? '' })}
          removeBody={
            holdingValue > 0
              ? t('inputs.portfolio.removeBodyHolding', { name: name ?? '', value: format.eur(holdingValue) })
              : t('inputs.portfolio.removeBody', { name: name ?? '' })
          }
        />
      }
    >
      <PathIssues path={base} className="mb-3" />
      <PathIssues path={`${base}.id`} className="mb-3" />
      <FieldGrid>
        <PlanText
          path={`${base}.name`}
          label={t('inputs.portfolio.name')}
          value={typeof asset.name === 'string' ? asset.name : ''}
          maxLength={60}
          onChange={(v) =>
            set((a) => {
              a.name = v;
            })
          }
        />
        <PlanSelect<AssetKind>
          path={`${base}.kind`}
          label={t('inputs.portfolio.kindLabel')}
          help={t('inputs.portfolio.kindHelp')}
          value={(asset.kind ?? '') as AssetKind}
          options={kindOptions}
          onChange={(v) =>
            set((a) => {
              a.kind = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.allocationPct`}
          label={t('inputs.portfolio.allocationPct')}
          help={t('inputs.portfolio.allocationPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(asset.allocationPct)}
          min={0}
          max={100}
          step={1}
          onChange={(v) =>
            set((a) => {
              a.allocationPct = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.expectedReturnPct`}
          label={t('inputs.portfolio.expectedReturnPct')}
          help={t('inputs.portfolio.expectedReturnPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(asset.expectedReturnPct)}
          step={0.1}
          onChange={(v) =>
            set((a) => {
              a.expectedReturnPct = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.volatilityPct`}
          label={t('inputs.portfolio.volatilityPct')}
          help={t('inputs.portfolio.volatilityPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(asset.volatilityPct)}
          min={0}
          step={0.5}
          onChange={(v) =>
            set((a) => {
              a.volatilityPct = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.terPct`}
          label={t('inputs.portfolio.terPct')}
          help={t('inputs.portfolio.terPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(asset.terPct)}
          min={0}
          step={0.01}
          onChange={(v) =>
            set((a) => {
              a.terPct = v;
            })
          }
        />
        <PlanNumber
          path={`${base}.taxRatePct`}
          className="sm:col-span-2"
          label={t('inputs.portfolio.taxRatePct')}
          help={t('inputs.portfolio.taxRatePctHelp', {
            cg: format.num(numOr(inv?.capitalGainsPct), { decimals: 2 }),
            gov: format.num(numOr(inv?.govBondPct), { decimals: 2 }),
          })}
          unit={t('common.unit.pct')}
          value={numOr(asset.taxRatePct)}
          min={0}
          max={100}
          step={0.5}
          onChange={(v) =>
            set((a) => {
              a.taxRatePct = v;
            })
          }
        />
      </FieldGrid>
    </ItemCard>
  );
}

export function PortfolioSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  const assets = listOf(plan.portfolio.assets);
  return (
    <>
      {t('inputs.portfolio.summary', {
        count: format.num(assets.length),
        alloc: assets.map((a) => format.num(numOr(a?.allocationPct), { decimals: 1 })).join('/'),
      })}
    </>
  );
}
