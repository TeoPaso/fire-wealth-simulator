'use client';

import { useMemo } from 'react';
import { Wallet } from 'lucide-react';
import { useFormat, useT } from '@/lib/i18n';
import { useUiPrefs } from '@/lib/store/hooks';
import { HelpTooltip } from '../../../ui';
import { usePlanEditor } from '../../editor';
import { phasePayPreview } from '../../model/career';

/**
 * Read-only preview of the net pay at the start of a phase, computed by the engine (computePayroll) with the
 * plan's tax rules. Shown in today's euros or nominal euros following the header toggle.
 */
export function NetPayPreview({ index }: { index: number }) {
  const t = useT();
  const format = useFormat();
  const { valueMode } = useUiPrefs();
  const { plan } = usePlanEditor();
  const preview = useMemo(() => phasePayPreview(plan, index), [plan, index]);

  if (!preview) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-400">
        {t('inputs.career.netPay.unavailable')}
      </p>
    );
  }

  const divisor = valueMode === 'real' ? preview.priceIndex : 1;
  const mensilita = Number.isInteger(preview.mensilita) && preview.mensilita > 0 ? preview.mensilita : null;
  const monthly = mensilita ? preview.salary.netIncome / divisor / mensilita : NaN;
  const annual = preview.withBonus.netIncome / divisor;
  const title = t('inputs.career.netPay.title', { age: format.num(preview.age), year: preview.calendarYear });

  return (
    <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
        <Wallet aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" />
        <span>{title}</span>
        <HelpTooltip content={t('inputs.career.netPay.help')} label={title} />
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="tabular text-xl font-semibold text-emerald-300">{mensilita ? format.eur(monthly) : '—'}</span>
        <span className="text-xs text-slate-400">
          {mensilita ? t('inputs.career.netPay.perMonth', { n: mensilita }) : t('inputs.career.netPay.noMensilita')}
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {t('inputs.career.netPay.annual', { amount: format.eur(annual) })}
        {' · '}
        {t('inputs.career.netPay.marginal', { pct: format.pct(preview.withBonus.marginalRatePct, 0) })}
      </p>
      {preview.bonusOutsidePayroll ? (
        <p className="mt-1 text-xs text-slate-400">
          {preview.bonusOutsidePayroll === 'pensionFund'
            ? t('inputs.career.netPay.bonusToFund')
            : t('inputs.career.netPay.bonusWelfare')}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-slate-400">
        {valueMode === 'real'
          ? t('inputs.career.netPay.realNote')
          : t('inputs.career.netPay.nominalNote', { year: preview.calendarYear })}
      </p>
    </div>
  );
}
