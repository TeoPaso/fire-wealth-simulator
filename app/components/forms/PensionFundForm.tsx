'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario, useUpdateScenario } from '@/lib/store/context';
import { NumberInput } from '../ui/NumberInput';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { ShieldCheck, Sparkles, PiggyBank, RefreshCw } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { PensionFundConfig } from '@/lib/engine/types';
import { formatCurrency, cn } from '@/lib/utils';

const TFR_OPTIONS = [
  { value: 0, label: '0% Azienda' },
  { value: 25, label: '25% FP' },
  { value: 50, label: '50/50' },
  { value: 75, label: '75% FP' },
  { value: 100, label: '100% Fondo' },
];

const SAVINGS_ALLOC_OPTIONS = [
  { value: 0, label: '100% ETF' },
  { value: 25, label: '25% FP' },
  { value: 50, label: '50/50' },
  { value: 75, label: '75% FP' },
  { value: 100, label: '100% FP' },
];

export function PensionFundForm({ isOpen, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const { t } = useTranslation();
  const scenario = useActiveScenario();
  const updateScenario = useUpdateScenario();

  const pf = scenario.pensionFund;
  const currentTfrAlloc = pf.tfrPensionAllocationPercent !== undefined ? pf.tfrPensionAllocationPercent : (pf.routeTfr ? 100 : 0);
  const currentSavingsAlloc = pf.savingsToPensionPercent ?? 0;
  const reinvestRebate = pf.reinvestTaxRebate !== false;

  const handleUpdate = (field: keyof PensionFundConfig, value: any) => {
    updateScenario({
      pensionFund: { ...pf, [field]: value }
    });
  };

  const handleTfrAllocChange = (pct: number) => {
    updateScenario({
      pensionFund: {
        ...pf,
        tfrPensionAllocationPercent: pct,
        routeTfr: pct > 0,
      }
    });
  };

  const handleSavingsAllocChange = (pct: number) => {
    updateScenario({
      pensionFund: {
        ...pf,
        savingsToPensionPercent: pct,
      }
    });
  };

  return (
    <SectionCard 
      title={t('pensionFund', 'Previdenza Complementare (Fondo Pensione)')} 
      icon={ShieldCheck}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-700/50">
          <ToggleSwitch
            label={t('enablePensionFund', 'Enable Pension Fund Simulation')}
            checked={pf.enabled}
            onChange={(val) => handleUpdate('enabled', val)}
            description={t('enablePensionFundDesc', 'Calculate tax rebates and employer matching')}
          />
        </div>

        {pf.enabled && (
          <div className="flex flex-col gap-4">
            {/* TFR Routing Preset Chips */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{t('tfrPensionAlloc', 'Destinazione TFR Maturando')}</span>
                </span>
                <span className="text-[11px] text-cyan-400 font-bold bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-800/60 self-start sm:self-auto shrink-0">
                  Predefinito: {currentTfrAlloc}% a Fondo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {t('tfrPensionAllocDesc')}
              </p>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {TFR_OPTIONS.map((opt) => {
                  const isSelected = currentTfrAlloc === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTfrAllocChange(opt.value)}
                      className={cn(
                        "py-2 px-2 rounded-lg text-xs font-semibold transition-all border text-center truncate",
                        isSelected
                          ? "bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/25 font-bold"
                          : "bg-slate-800/80 text-slate-400 border-slate-700/80 hover:bg-slate-700 hover:text-white"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personal Savings Allocation Split Chips */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{t('savingsAllocation', 'Allocazione Risparmio Personale')}</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-800/60 self-start sm:self-auto shrink-0">
                  Predefinito: {currentSavingsAlloc}% FP / {100 - currentSavingsAlloc}% ETF
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {t('savingsAllocationDesc')}
              </p>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {SAVINGS_ALLOC_OPTIONS.map((opt) => {
                  const isSelected = currentSavingsAlloc === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSavingsAllocChange(opt.value)}
                      className={cn(
                        "py-2 px-2 rounded-lg text-xs font-semibold transition-all border text-center truncate",
                        isSelected
                          ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/25 font-bold"
                          : "bg-slate-800/80 text-slate-400 border-slate-700/80 hover:bg-slate-700 hover:text-white"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-Max Deductibility Toggle */}
            {(() => {
              const currentRal = scenario.salaryPhases?.[0]?.annualGrossRAL || 37500;
              const currentCap = scenario.taxes?.pensionDeductionCap ?? 5164.57;
              const employerPercent = pf.employerContributionPercent || 0;
              const employerEuro = (currentRal * employerPercent) / 100;
              const optimalHeadroomEuro = Math.max(0, currentCap - employerEuro);
              const optimalEmployeePct = currentRal > 0 ? Number(((optimalHeadroomEuro / currentRal) * 100).toFixed(2)) : 0;

              return (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{t('autoMaxDeductibility', 'Massimizza Tetto Deducibilità')}</span>
                    </span>
                    {pf.autoMaxDeductibility && (
                      <span className="text-[11px] text-amber-400 font-bold bg-amber-950/80 px-2.5 py-0.5 rounded-md border border-amber-800/60 self-start sm:self-auto shrink-0">
                        {optimalEmployeePct}% da RAL ({formatCurrency(currentCap)} / 100%)
                      </span>
                    )}
                  </div>
                  <ToggleSwitch
                    label={t('autoMaxDeductibilityLabel', 'Satura al 100% il Tetto di Deducibilità')}
                    checked={!!pf.autoMaxDeductibility}
                    onChange={(val) => {
                      if (val) {
                        updateScenario({
                          pensionFund: {
                            ...pf,
                            autoMaxDeductibility: true,
                            employeeContributionPercent: optimalEmployeePct,
                          }
                        });
                      } else {
                        handleUpdate('autoMaxDeductibility', false);
                      }
                    }}
                    description={t(
                      'autoMaxDeductibilityDesc', 
                      `Calcola automaticamente la % ottimale (${optimalEmployeePct}% per RAL ${formatCurrency(currentRal)}) affinché il totale deducibile (Dipendente + Datoriale) raggiunga esattamente il cap di ${formatCurrency(currentCap)}.`
                    )}
                  />
                </div>
              );
            })()}

            {/* Reinvest Tax Rebate Toggle */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <ToggleSwitch
                label={t('reinvestTaxRebate', 'Reinvesti Rimborso IRPEF')}
                checked={reinvestRebate}
                onChange={(val) => handleUpdate('reinvestTaxRebate', val)}
                description={t('reinvestTaxRebateDesc', 'Reinveste automaticamente il credito fiscale 730 nel portafoglio investimenti')}
              />
            </div>

            {/* Contribution Inputs */}
            <div className="grid grid-cols-2 gap-3 items-stretch">
              <NumberInput
                label={t('employeeContribution', 'Contributo Dipendente da RAL')}
                value={pf.employeeContributionPercent}
                onChange={(val) => handleUpdate('employeeContributionPercent', val)}
                suffix="%"
                step={0.1}
                tooltip={t('employeeContribTooltip', 'Percentuale della RAL versata volontariamente in busta paga')}
                disabled={!!pf.autoMaxDeductibility}
              />
              <NumberInput
                label={t('employerContribution', 'Contributo Datoriale Match')}
                value={pf.employerContributionPercent}
                onChange={(val) => handleUpdate('employerContributionPercent', val)}
                suffix="%"
                step={0.1}
                tooltip={t('employerContribTooltip', 'Percentuale di match versata dall\'azienda (richiede contributo dipendente > 0)')}
              />
              <NumberInput
                label={t('pfExpectedReturn', 'Rendimento Lordo Atteso')}
                value={pf.expectedReturnPercent}
                onChange={(val) => handleUpdate('expectedReturnPercent', val)}
                suffix="%"
                step={0.1}
              />
              <NumberInput
                label={t('pfTer', 'Costi Gestione (TER)')}
                value={pf.terPercent}
                onChange={(val) => handleUpdate('terPercent', val)}
                suffix="%"
                step={0.05}
              />
              <NumberInput
                label={t('pfTaxRate', 'Aliquota Fiscale Liquidazione')}
                value={pf.taxRatePercent}
                onChange={(val) => handleUpdate('taxRatePercent', val)}
                suffix="%"
                step={0.5}
                tooltip={t('pfTaxRateTooltip', 'Aliquota agevolata alla pensione (tra 9% e 15%)')}
              />
              <NumberInput
                label={t('pfYieldTax', 'Imposta Rendimenti Interni')}
                value={pf.annualYieldTaxRatePercent ?? 20.0}
                onChange={(val) => handleUpdate('annualYieldTaxRatePercent', val)}
                suffix="%"
                step={1}
                tooltip={t('pfYieldTaxTooltip')}
              />
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
