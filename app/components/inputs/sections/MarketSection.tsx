'use client';

import { Dices } from 'lucide-react';
import { useFormat, useT } from '@/lib/i18n';
import { Button } from '../../ui';
import { numOr, usePlanEditor } from '../editor';
import { FieldGrid, PlanNumber, SubHeading } from '../fields';

/** Mercato e simulazione: inflation, cash rate, Monte Carlo settings. */
export function MarketSection() {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const m = plan.market;
  const s = plan.simulation;

  return (
    <div>
      <FieldGrid>
        <PlanNumber
          path="market.inflationPct"
          label={t('inputs.market.inflationPct')}
          help={t('inputs.market.inflationPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(m.inflationPct)}
          step={0.1}
          onChange={(v) =>
            update((d) => {
              d.market.inflationPct = v;
            })
          }
        />
        <PlanNumber
          path="market.inflationVolatilityPct"
          label={t('inputs.market.inflationVolatilityPct')}
          help={t('inputs.market.inflationVolatilityPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(m.inflationVolatilityPct)}
          min={0}
          step={0.1}
          onChange={(v) =>
            update((d) => {
              d.market.inflationVolatilityPct = v;
            })
          }
        />
        <PlanNumber
          path="market.cashRatePct"
          label={t('inputs.market.cashRatePct')}
          help={t('inputs.market.cashRatePctHelp', {
            tax: format.num(numOr(plan.taxRules.investments?.cashInterestTaxPct), { decimals: 2 }),
          })}
          unit={t('common.unit.pct')}
          value={numOr(m.cashRatePct)}
          step={0.1}
          onChange={(v) =>
            update((d) => {
              d.market.cashRatePct = v;
            })
          }
        />
      </FieldGrid>

      <SubHeading help={t('inputs.market.monteCarloHelp')} label={t('inputs.market.monteCarloTitle')}>
        {t('inputs.market.monteCarloTitle')}
      </SubHeading>
      <FieldGrid>
        <PlanNumber
          path="simulation.monteCarloRuns"
          label={t('inputs.market.monteCarloRuns')}
          help={t('inputs.market.monteCarloRunsHelp')}
          unit={t('common.unit.runs')}
          value={numOr(s.monteCarloRuns)}
          integer
          min={1}
          step={100}
          onChange={(v) =>
            update((d) => {
              d.simulation.monteCarloRuns = v;
            })
          }
        />
        <PlanNumber
          path="simulation.successTargetPct"
          label={t('inputs.market.successTargetPct')}
          help={t('inputs.market.successTargetPctHelp')}
          unit={t('common.unit.pct')}
          value={numOr(s.successTargetPct)}
          min={0}
          max={100}
          step={1}
          onChange={(v) =>
            update((d) => {
              d.simulation.successTargetPct = v;
            })
          }
        />
        <div className="sm:col-span-2">
          <div className="flex items-end gap-2">
            <PlanNumber
              path="simulation.seed"
              className="flex-1"
              label={t('inputs.market.seed')}
              help={t('inputs.market.seedHelp')}
              value={numOr(s.seed)}
              integer
              grouping={false}
              step={1}
              onChange={(v) =>
                update((d) => {
                  d.simulation.seed = v;
                })
              }
            />
            <Button
              icon={<Dices />}
              onClick={() =>
                update((d) => {
                  d.simulation.seed = Math.floor(Math.random() * 1_000_000_000);
                })
              }
            >
              {t('inputs.market.newSeed')}
            </Button>
          </div>
        </div>
      </FieldGrid>
    </div>
  );
}

export function MarketSummary() {
  const t = useT();
  const format = useFormat();
  const { plan } = usePlanEditor();
  return (
    <>
      {t('inputs.market.summary', {
        inflation: format.pct(numOr(plan.market.inflationPct), 1),
        runs: format.num(numOr(plan.simulation.monteCarloRuns)),
        target: format.pct(numOr(plan.simulation.successTargetPct), 0),
      })}
    </>
  );
}
