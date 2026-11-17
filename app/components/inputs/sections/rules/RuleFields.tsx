'use client';

/**
 * Editors for single TaxRules values (number by kind, nullable year, switch, text, optional group). Labels and help
 * come from `inputs.rules.field.<path>` / `inputs.rules.help.<path>`; issues from the plan path `taxRules.<path>`.
 */
import { IT_2026 } from '@/lib/engine';
import { useT } from '@/lib/i18n';
import { Switch } from '../../../ui';
import { numOr, usePlanEditor } from '../../editor';
import { FieldGrid, PlanNumber, PlanSwitch, PlanText } from '../../fields';
import {
  getRuleValue,
  ruleHelpKey,
  ruleLabelKey,
  setRuleValue,
  type RuleItem,
  type RuleNumberKind,
} from '../../model/taxRulesConfig';

interface NumberSpec {
  unitKey?: string;
  integer?: boolean;
  step: number;
  decimals?: number;
  min?: number;
  max?: number;
  grouping?: boolean;
}

/**
 * Input constraints per kind. They only refuse to COMMIT impossible values (the field explains why); every other
 * check is validatePlan's job. Euro amounts are whole numbers by default so "28.000" reads as 28000.
 */
const NUMBER_SPECS: Record<RuleNumberKind, NumberSpec> = {
  eur: { unitKey: 'common.unit.eur', step: 1, min: 0 },
  pct: { unitKey: 'common.unit.pct', step: 0.1, decimals: 3, min: 0, max: 100 },
  years: { unitKey: 'common.unit.years', integer: true, step: 1, min: 0 },
  age: { unitKey: 'common.unit.age', integer: true, step: 1, min: 0 },
  year: { integer: true, step: 1, grouping: false, min: 0 },
  count: { integer: true, step: 1, min: 1 },
  number: { step: 0.5, decimals: 3, min: 0 },
};

/** Plan path of a rules path. */
export const rulePlanPath = (path: string) => `taxRules.${path}`;

export function RuleNumber({ kind, path, decimals, className }: { kind: RuleNumberKind; path: string; decimals?: number; className?: string }) {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const spec = NUMBER_SPECS[kind];
  return (
    <PlanNumber
      path={rulePlanPath(path)}
      className={className}
      label={t(ruleLabelKey(path))}
      help={t(ruleHelpKey(path))}
      unit={spec.unitKey ? t(spec.unitKey) : undefined}
      value={numOr(getRuleValue(plan.taxRules, path))}
      integer={spec.integer}
      step={spec.step}
      decimals={decimals ?? spec.decimals}
      min={spec.min}
      max={spec.max}
      grouping={spec.grouping}
      onChange={(v) =>
        update((d) => {
          setRuleValue(d.taxRules, path, v);
        })
      }
    />
  );
}

/** Calendar year that may be null ("no expiry"), e.g. the end of the reduced productivity-bonus rate. */
export function RuleNullableYear({ path }: { path: string }) {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const value = getRuleValue(plan.taxRules, path);
  const noExpiry = value === null;
  const fallback = getRuleValue(IT_2026, path);
  const referenceYear = numOr(plan.taxRules.referenceYear);
  const defaultYear = typeof fallback === 'number' ? fallback : Number.isFinite(referenceYear) ? referenceYear + 1 : NaN;
  return (
    <div className="min-w-0">
      <PlanNumber
        path={rulePlanPath(path)}
        label={t(ruleLabelKey(path))}
        help={t(ruleHelpKey(path))}
        value={noExpiry ? NaN : numOr(value)}
        integer
        grouping={false}
        min={0}
        step={1}
        disabled={noExpiry}
        onChange={(v) =>
          update((d) => {
            setRuleValue(d.taxRules, path, v);
          })
        }
      />
      <Switch
        className="mt-2"
        label={t('inputs.rules.noExpiry')}
        checked={noExpiry}
        onChange={(on) =>
          update((d) => {
            setRuleValue(d.taxRules, path, on ? null : defaultYear);
          })
        }
      />
    </div>
  );
}

export function RuleBool({ path }: { path: string }) {
  const t = useT();
  const { plan, update } = usePlanEditor();
  return (
    <PlanSwitch
      path={rulePlanPath(path)}
      label={t(ruleLabelKey(path))}
      help={t(ruleHelpKey(path))}
      checked={getRuleValue(plan.taxRules, path) === true}
      onChange={(v) =>
        update((d) => {
          setRuleValue(d.taxRules, path, v);
        })
      }
    />
  );
}

export function RuleText({ path }: { path: string }) {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const value = getRuleValue(plan.taxRules, path);
  return (
    <PlanText
      path={rulePlanPath(path)}
      label={t(ruleLabelKey(path))}
      help={t(ruleHelpKey(path))}
      value={typeof value === 'string' ? value : ''}
      maxLength={120}
      onChange={(v) =>
        update((d) => {
          setRuleValue(d.taxRules, path, v);
        })
      }
    />
  );
}

/**
 * Optional group (absent = not modelled by the engine): a switch turns it on with the 2026 values (or zeros when
 * the defaults have none) and off by removing it.
 */
export function RuleOptional({ item }: { item: Extract<RuleItem, { kind: 'optional' }> }) {
  const t = useT();
  const { plan, update } = usePlanEditor();
  const value = getRuleValue(plan.taxRules, item.path);
  const present = value !== null && typeof value === 'object' && !Array.isArray(value);

  const enable = () => {
    const defaults = getRuleValue(IT_2026, item.path);
    if (defaults !== null && typeof defaults === 'object') return JSON.parse(JSON.stringify(defaults)) as unknown;
    const prefix = `${item.path}.`;
    return Object.fromEntries(item.fields.map((f) => [f.path.slice(prefix.length), 0]));
  };

  return (
    <div className="space-y-3">
      <PlanSwitch
        path={rulePlanPath(item.path)}
        label={t(ruleLabelKey(item.path))}
        help={t(ruleHelpKey(item.path))}
        description={present ? t('inputs.rules.optionalOn') : t('inputs.rules.optionalOff')}
        checked={present}
        onChange={(on) =>
          update((d) => {
            setRuleValue(d.taxRules, item.path, on ? enable() : undefined);
          })
        }
      />
      {present ? (
        <FieldGrid>
          {item.fields.map((f) => (
            <RuleNumber key={f.path} kind={f.kind} path={f.path} decimals={f.decimals} />
          ))}
        </FieldGrid>
      ) : null}
    </div>
  );
}
