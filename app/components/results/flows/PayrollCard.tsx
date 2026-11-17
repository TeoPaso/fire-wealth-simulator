'use client';

/**
 * Payroll of a selected working year, straight from rows[t].payroll (computed by the engine's computePayroll):
 * gross → INPS → taxable income → IRPEF → surcharges → net, monthly net by mensilità, pension tax saving, employer
 * contribution and TFR. Nothing is recomputed here: lines are engine fields, shown with their sign.
 */
import { useState } from 'react';
import type { CareerPhase, PayrollBreakdown, Plan, YearRow } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { Card, Select, cn } from '../../ui';
import { flowValue, unitKey } from '../model/values';
import type { TabProps } from '../types';

type Sign = '+' | '−' | '=' | '';

interface Line {
  key: string;
  sign: Sign;
  value: number;
  /** Total line (bold, ruled above). */
  total?: boolean;
  /** Skip the line when the value is zero. */
  optional?: boolean;
}

/** Career phase of an age (first phase whose untilAge is above it, else the last): only for the mensilità label. */
function phaseAt(plan: Plan, age: number): CareerPhase | undefined {
  return plan.career.find((p) => p.untilAge > age) ?? plan.career[plan.career.length - 1];
}

function LineTable({ title, lines, money }: { title: string; lines: Line[]; money: (v: number) => string }) {
  const { t } = useI18n();
  const shown = lines.filter((l) => !(l.optional && Math.abs(l.value) < 0.005));
  return (
    <div className="min-w-0">
      <h4 className="mb-1.5 text-sm font-semibold text-slate-200">{title}</h4>
      <table className="w-full text-sm">
        <tbody>
          {shown.map((l) => (
            <tr key={l.key} className={cn(l.total && 'border-t border-slate-700')}>
              <th scope="row" className={cn('py-1 pr-2 text-left font-normal', l.total ? 'font-semibold text-slate-100' : 'text-slate-300')}>
                <span aria-hidden="true" className="inline-block w-4 text-slate-400">
                  {l.sign}
                </span>
                {t(`results.payroll.line.${l.key}`)}
              </th>
              <td className={cn('tabular whitespace-nowrap py-1 text-right', l.total ? 'font-semibold text-slate-50' : 'text-slate-200')}>
                {money(l.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayrollDetails({ plan, row, p }: { plan: Plan; row: YearRow; p: PayrollBreakdown }) {
  const { t, format } = useI18n();
  const money = (v: number) => format.eur(v);
  const mensilita = phaseAt(plan, row.age)?.mensilita;
  const validMensilita = typeof mensilita === 'number' && Number.isInteger(mensilita) && mensilita > 0 ? mensilita : null;

  const taxable: Line[] = [
    { key: 'gross', sign: '', value: p.gross },
    { key: 'inps', sign: '−', value: p.inps },
    { key: 'deductiblePension', sign: '−', value: p.deductiblePension, optional: true },
    { key: 'employerExcess', sign: '+', value: p.employerExcessTaxable, optional: true },
    { key: 'taxableIncome', sign: '=', value: p.taxableIncome, total: true },
  ];
  const irpef: Line[] = [
    { key: 'irpefGross', sign: '', value: p.irpefGross },
    { key: 'employeeDeduction', sign: '−', value: p.employeeDeduction, optional: true },
    { key: 'cuneoExtraDeduction', sign: '−', value: p.cuneoExtraDeduction, optional: true },
    { key: 'irpefNet', sign: '=', value: p.irpefNet, total: true },
  ];
  const net: Line[] = [
    { key: 'gross', sign: '', value: p.gross },
    { key: 'inps', sign: '−', value: p.inps },
    { key: 'irpefNet', sign: '−', value: p.irpefNet },
    { key: 'regionalSurcharge', sign: '−', value: p.regionalSurcharge },
    { key: 'municipalSurcharge', sign: '−', value: p.municipalSurcharge, optional: true },
    { key: 'productivityBonusTax', sign: '−', value: p.productivityBonusTax, optional: true },
    { key: 'pensionWithheld', sign: '−', value: p.deductiblePension + p.nonDeductiblePension, optional: true },
    { key: 'cuneoExemptSum', sign: '+', value: p.cuneoExemptSum, optional: true },
    { key: 'supplementaryTreatment', sign: '+', value: p.supplementaryTreatment ?? 0, optional: true },
    { key: 'netIncome', sign: '=', value: p.netIncome, total: true },
  ];
  const other: Line[] = [
    { key: 'pensionTaxSaving', sign: '', value: p.pensionTaxSaving },
    { key: 'employerContribution', sign: '', value: row.pfEmployer },
    { key: 'bonusToFund', sign: '', value: row.pfBonus, optional: true },
    { key: 'welfare', sign: '', value: row.welfareBenefit ?? 0, optional: true },
    { key: 'tfrAccrued', sign: '', value: row.tfrAccrued },
    { key: 'tfrToFund', sign: '', value: row.tfrToFund },
    { key: 'tfrToCompany', sign: '', value: row.tfrToCompany },
  ];

  return (
    <>
      <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
        <p className="text-sm text-slate-300">{t('results.payroll.netAnnual')}</p>
        <p className="text-3xl font-semibold tracking-tight text-slate-50">{money(p.netIncome)}</p>
        <p className="mt-1 text-sm text-slate-300">
          {validMensilita
            ? t('results.payroll.netMonthly', { amount: money(p.netIncome / validMensilita), n: String(validMensilita) })
            : t('results.payroll.noMensilita')}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {t('results.payroll.rates', {
            marginal: format.pct(p.marginalRatePct, 1),
            average: format.pct(p.averageRatePct, 1),
          })}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <LineTable title={t('results.payroll.block.net')} lines={net} money={money} />
        <div className="space-y-5">
          <LineTable title={t('results.payroll.block.taxable')} lines={taxable} money={money} />
          <LineTable title={t('results.payroll.block.irpef')} lines={irpef} money={money} />
        </div>
      </div>
      <div className="mt-5">
        <LineTable title={t('results.payroll.block.other')} lines={other} money={money} />
        <p className="mt-2 text-xs text-slate-400">
          {row.tfrToFund > 0 && row.tfrToCompany > 0
            ? t('results.payroll.tfrSplit')
            : row.tfrToFund > 0
              ? t('results.payroll.tfrFund')
              : t('results.payroll.tfrCompany')}
        </p>
      </div>
    </>
  );
}

/** Scales every money field of a payroll (real values: nominal / priceIndex). */
function scalePayroll(p: PayrollBreakdown, factor: number): PayrollBreakdown {
  const out = { ...p };
  for (const key of Object.keys(out) as (keyof PayrollBreakdown)[]) {
    if (key === 'marginalRatePct' || key === 'averageRatePct') continue;
    const value = out[key];
    if (typeof value === 'number') (out as Record<string, number>)[key] = value * factor;
  }
  return out;
}

function scaleRow(row: YearRow, factor: number): YearRow {
  return {
    ...row,
    pfEmployer: row.pfEmployer * factor,
    pfBonus: row.pfBonus * factor,
    welfareBenefit: (row.welfareBenefit ?? 0) * factor,
    tfrAccrued: row.tfrAccrued * factor,
    tfrToFund: row.tfrToFund * factor,
    tfrToCompany: row.tfrToCompany * factor,
  };
}

export function PayrollCard({ data }: TabProps) {
  const { t, format } = useI18n();
  const { plan, result, mode } = data;
  const working = result.rows.filter((r) => r.status === 'working' && r.payroll);
  const [selected, setSelected] = useState<number | null>(null);

  if (working.length === 0) {
    return (
      <Card as="section">
        <h3 className="text-base font-semibold text-slate-100">{t('results.payroll.title')}</h3>
        <p className="mt-2 text-sm text-slate-400">{t('results.payroll.none')}</p>
      </Card>
    );
  }

  const row = working.find((r) => r.age === selected) ?? working[0];
  const factor = flowValue(row, 1, mode);
  const p = scalePayroll(row.payroll as PayrollBreakdown, factor);

  return (
    <Card as="section" aria-labelledby="results-payroll">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="results-payroll" className="text-base font-semibold text-slate-100">
            {t('results.payroll.title')}
          </h3>
          <p className="mt-0.5 text-sm text-slate-400">{t('results.payroll.description')}</p>
        </div>
        <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-xs text-slate-300">{t(unitKey(mode))}</span>
      </div>
      <Select
        className="mt-3 max-w-xs"
        label={t('results.payroll.yearLabel')}
        value={String(row.age)}
        onChange={(v) => setSelected(Number(v))}
        options={working.map((r) => ({
          value: String(r.age),
          label: t('results.payroll.yearOption', { age: format.num(r.age), year: String(r.calendarYear) }),
        }))}
      />
      <PayrollDetails plan={plan} row={scaleRow(row, factor)} p={p} />
    </Card>
  );
}
