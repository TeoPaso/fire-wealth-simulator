'use client';

/**
 * Editors for the TaxRules collections: rate bands (IRPEF brackets, regional surcharge, cuneo exempt sum) and the
 * transformation coefficients by claim age. Edits never sort or "repair" the lists: validatePlan reports problems.
 */
import { Plus, Trash2 } from 'lucide-react';
import type { Plan, RateBand, TaxRules } from '@/lib/engine';
import { useFormat, useT } from '@/lib/i18n';
import { Button, IconButton, Switch } from '../../../ui';
import { numOr, usePlanEditor } from '../../editor';
import { FieldGroup, PathIssues, PlanNumber } from '../../fields';
import { coefficientEntries, getBands, getRuleValue, ruleHelpKey, ruleLabelKey, setRuleValue } from '../../model/taxRulesConfig';
import { rulePlanPath } from './RuleFields';

/** Gap used to propose the upper bound of a new band (the user edits it right after). */
const NEW_BAND_GAP = 10_000;

/** Draft list of bands at `path`, created when the stored value is not an array. */
function bandsDraft(rules: TaxRules, path: string): Partial<RateBand>[] {
  const value = getRuleValue(rules, path);
  if (Array.isArray(value)) return value as Partial<RateBand>[];
  const list: Partial<RateBand>[] = [];
  setRuleValue(rules, path, list);
  return list;
}

const finite = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Last finite upper bound among the first `count` bands (0 when none). */
function lastFiniteUpTo(bands: readonly Partial<RateBand>[], count: number): number {
  for (let i = Math.min(count, bands.length) - 1; i >= 0; i--) {
    const v = finite(bands[i]?.upTo);
    if (v !== null) return v;
  }
  return 0;
}

export function RuleBands({ path }: { path: string }) {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const bands = getBands(plan.taxRules, path);
  const full = rulePlanPath(path);

  const addBand = () =>
    update((d) => {
      const list = bandsDraft(d.taxRules, path);
      const last = list[list.length - 1];
      const rate = finite(last?.ratePct) ?? 0;
      if (last && last.upTo === null) {
        // Split the open-ended top band: it gets an upper bound and a new open-ended band follows.
        last.upTo = lastFiniteUpTo(list, list.length - 1) + NEW_BAND_GAP;
        list.push({ upTo: null, ratePct: rate });
      } else {
        list.push({ upTo: lastFiniteUpTo(list, list.length) + NEW_BAND_GAP, ratePct: rate });
      }
    });

  return (
    <FieldGroup path={full} label={t(ruleLabelKey(path))} help={t(ruleHelpKey(path))}>
      {bands.length > 0 ? (
        <div aria-hidden="true" className="mb-1 grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 text-xs text-slate-400">
          <span>#</span>
          <span>{t('inputs.rules.band.upToColumn')}</span>
          <span>{t('inputs.rules.band.rateColumn')}</span>
          <span />
        </div>
      ) : (
        <p className="mb-2 text-xs text-slate-400">{t('inputs.rules.band.empty')}</p>
      )}
      <ol className="space-y-2">
        {bands.map((band, i) => (
          <BandRow key={i} path={path} index={i} band={band} isLast={i === bands.length - 1} />
        ))}
      </ol>
      <Button size="sm" className="mt-2" icon={<Plus />} onClick={addBand}>
        {t('inputs.rules.band.add')}
      </Button>
    </FieldGroup>
  );
}

function BandRow({ path, index, band, isLast }: { path: string; index: number; band: Partial<RateBand>; isLast: boolean }) {
  const t = useT();
  const format = useFormat();
  const { update } = usePlanEditor();
  const full = `${rulePlanPath(path)}[${index}]`;
  const n = format.num(index + 1);
  const unlimited = band?.upTo === null;

  const set = (mutate: (b: Partial<RateBand>) => void) =>
    update((d) => {
      const b = bandsDraft(d.taxRules, path)[index];
      if (b && typeof b === 'object') mutate(b);
    });

  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/20 p-2">
      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_2rem] items-start gap-2">
        <span aria-hidden="true" className="pt-2.5 text-center text-xs font-semibold text-slate-400">
          {n}
        </span>
        <PlanNumber
          path={`${full}.upTo`}
          label={t('inputs.rules.band.upTo', { n })}
          hideLabel
          unit={t('common.unit.eur')}
          value={unlimited ? NaN : numOr(band?.upTo)}
          min={0}
          step={1}
          disabled={unlimited}
          description={unlimited ? t('inputs.rules.band.unlimitedShort') : undefined}
          onChange={(v) =>
            set((b) => {
              b.upTo = v;
            })
          }
        />
        <PlanNumber
          path={`${full}.ratePct`}
          label={t('inputs.rules.band.rate', { n })}
          hideLabel
          unit={t('common.unit.pct')}
          value={numOr(band?.ratePct)}
          min={0}
          max={100}
          step={0.1}
          decimals={3}
          onChange={(v) =>
            set((b) => {
              b.ratePct = v;
            })
          }
        />
        <IconButton
          size="sm"
          className="mt-1"
          icon={<Trash2 />}
          label={t('inputs.rules.band.remove', { n })}
          onClick={() =>
            update((d) => {
              bandsDraft(d.taxRules, path).splice(index, 1);
            })
          }
        />
      </div>
      {isLast || unlimited ? (
        <Switch
          className="mt-2 pl-9"
          label={t('inputs.rules.band.noLimit')}
          checked={unlimited}
          onChange={(on) =>
            update((d) => {
              const list = bandsDraft(d.taxRules, path);
              const b = list[index];
              if (!b || typeof b !== 'object') return;
              b.upTo = on ? null : lastFiniteUpTo(list, index) + NEW_BAND_GAP;
            })
          }
        />
      ) : null}
      <PathIssues path={full} className="mt-1 pl-9" />
    </li>
  );
}

/** Transformation coefficients (% of the montante paid each year) by claim age. */
export function RuleCoefficients({ path }: { path: string }) {
  const t = useT();
  const format = useFormat();
  const { plan, update } = usePlanEditor();
  const entries = coefficientEntries(getRuleValue(plan.taxRules, path));
  const full = rulePlanPath(path);
  const ages = entries.map(([age]) => Number(age)).filter(Number.isFinite);
  const minAge = ages.length > 0 ? Math.min(...ages) : NaN;
  const maxAge = ages.length > 0 ? Math.max(...ages) : NaN;
  const oldAge = numOr(plan.taxRules.statePension?.oldAgeAge);

  const draft = (d: Plan): Record<string, number> => {
    const value = getRuleValue(d.taxRules, path);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, number>;
    const fresh: Record<string, number> = {};
    setRuleValue(d.taxRules, path, fresh);
    return fresh;
  };

  const addAge = (age: number, copyFrom: number) =>
    update((d) => {
      const map = draft(d);
      if (map[String(age)] === undefined) {
        const source = map[String(copyFrom)];
        map[String(age)] = typeof source === 'number' && Number.isFinite(source) ? source : 0;
      }
    });

  return (
    <FieldGroup path={full} label={t(ruleLabelKey(path))} help={t(ruleHelpKey(path))}>
      {entries.length === 0 ? <p className="mb-2 text-xs text-slate-400">{t('inputs.rules.coeff.empty')}</p> : null}
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
        {entries.map(([age, value]) => (
          <div key={age} className="flex min-w-0 items-start gap-1">
            <PlanNumber
              path={`${full}[${age}]`}
              className="min-w-0 flex-1"
              label={t('inputs.rules.coeff.age', { age })}
              unit={t('common.unit.pct')}
              value={numOr(value)}
              min={0}
              max={100}
              step={0.01}
              decimals={3}
              onChange={(v) =>
                update((d) => {
                  draft(d)[age] = v;
                })
              }
            />
            <IconButton
              size="sm"
              className="mt-[1.95rem]"
              icon={<Trash2 />}
              label={t('inputs.rules.coeff.remove', { age })}
              onClick={() =>
                update((d) => {
                  delete draft(d)[age];
                })
              }
            />
          </div>
        ))}
      </div>
      {!Number.isFinite(minAge) && Number.isFinite(oldAge) ? (
        <Button size="sm" className="mt-3" icon={<Plus />} onClick={() => addAge(oldAge, oldAge)}>
          {t('inputs.rules.coeff.addAge', { age: format.num(oldAge) })}
        </Button>
      ) : null}
      {Number.isFinite(minAge) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" icon={<Plus />} onClick={() => addAge(minAge - 1, minAge)}>
            {t('inputs.rules.coeff.addAge', { age: format.num(minAge - 1) })}
          </Button>
          <Button size="sm" icon={<Plus />} onClick={() => addAge(maxAge + 1, maxAge)}>
            {t('inputs.rules.coeff.addAge', { age: format.num(maxAge + 1) })}
          </Button>
        </div>
      ) : null}
    </FieldGroup>
  );
}
