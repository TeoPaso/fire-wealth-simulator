'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario, useUpdateScenario } from '@/lib/store/context';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { Briefcase, Plus, Trash2, Gift, Sparkles } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { SalaryPhase, BonusTaxType } from '@/lib/engine/types';
import { cn } from '@/lib/utils';

const TFR_PRESET_OPTIONS = [
  { value: -1, label: 'Global' },
  { value: 0, label: '0% Azienda' },
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100% Fondo' },
];

export function SalaryPhasesForm({ isOpen, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const { t } = useTranslation();
  const scenario = useActiveScenario();
  const updateScenario = useUpdateScenario();

  const phases = scenario.salaryPhases;

  const handleUpdatePhase = (index: number, field: keyof SalaryPhase, value: any) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    
    // Auto-adjust years to prevent overlaps/gaps
    if (field === 'startYear' || field === 'endYear') {
      newPhases.sort((a, b) => a.startYear - b.startYear);
      newPhases[0].startYear = 1;
      for (let i = 0; i < newPhases.length; i++) {
        if (i > 0) newPhases[i].startYear = newPhases[i - 1].endYear + 1;
        if (newPhases[i].endYear < newPhases[i].startYear) {
          newPhases[i].endYear = newPhases[i].startYear;
        }
      }
      const last = newPhases[newPhases.length - 1];
      if (last.endYear < scenario.timeHorizonYears) {
        last.endYear = scenario.timeHorizonYears;
      }
    }
    
    updateScenario({ salaryPhases: newPhases });
  };

  const handleAddPhase = () => {
    const newPhases = [...phases].sort((a, b) => a.startYear - b.startYear);
    const horizon = scenario.timeHorizonYears;

    if (newPhases.length === 0) {
      const newPhase: SalaryPhase = {
        id: `sp-${Date.now()}`,
        startYear: 1,
        endYear: horizon,
        annualGrossRAL: 37500,
        mensilita: 14,
        monthlyNetSavings: 600,
        extraSavings13th: 500,
        extraSavings14th: 500,
        annualBonusGross: 2500,
        bonusTaxType: 'DETASSAZIONE_5',
        bonusInvestPercent: 100,
        tfrPensionAllocationPercent: 100,
      };
      updateScenario({ salaryPhases: [newPhase] });
      return;
    }

    const last = newPhases[newPhases.length - 1];
    const splitYear = Math.max(last.startYear, Math.floor((last.startYear + horizon) / 2));
    if (splitYear > last.startYear && splitYear < horizon) {
      last.endYear = splitYear;
      const newPhase: SalaryPhase = {
        id: `sp-${Date.now()}`,
        startYear: splitYear + 1,
        endYear: horizon,
        annualGrossRAL: last.annualGrossRAL,
        mensilita: last.mensilita,
        monthlyNetSavings: last.monthlyNetSavings,
        extraSavings13th: last.extraSavings13th ?? 0,
        extraSavings14th: last.extraSavings14th ?? 0,
        annualBonusGross: last.annualBonusGross ?? 0,
        bonusTaxType: last.bonusTaxType ?? 'DETASSAZIONE_5',
        bonusInvestPercent: last.bonusInvestPercent ?? 100,
        tfrPensionAllocationPercent: last.tfrPensionAllocationPercent,
      };
      newPhases.push(newPhase);
    } else {
      const newPhase: SalaryPhase = {
        id: `sp-${Date.now()}`,
        startYear: last.endYear + 1,
        endYear: last.endYear + 5,
        annualGrossRAL: last.annualGrossRAL,
        mensilita: last.mensilita,
        monthlyNetSavings: last.monthlyNetSavings,
        extraSavings13th: last.extraSavings13th ?? 0,
        extraSavings14th: last.extraSavings14th ?? 0,
        annualBonusGross: last.annualBonusGross ?? 0,
        bonusTaxType: last.bonusTaxType ?? 'DETASSAZIONE_5',
        bonusInvestPercent: last.bonusInvestPercent ?? 100,
        tfrPensionAllocationPercent: last.tfrPensionAllocationPercent,
      };
      newPhases.push(newPhase);
    }

    updateScenario({ salaryPhases: newPhases });
  };

  const handleRemovePhase = (index: number) => {
    if (phases.length <= 1) return;
    const newPhases = phases.filter((_, i) => i !== index).sort((a, b) => a.startYear - b.startYear);
    newPhases[0].startYear = 1;
    for (let i = 1; i < newPhases.length; i++) {
      newPhases[i].startYear = newPhases[i - 1].endYear + 1;
      if (newPhases[i].endYear < newPhases[i].startYear) {
        newPhases[i].endYear = newPhases[i].startYear;
      }
    }
    const last = newPhases[newPhases.length - 1];
    if (last.endYear < scenario.timeHorizonYears) {
      last.endYear = scenario.timeHorizonYears;
    }
    updateScenario({ salaryPhases: newPhases });
  };

  const globalTfrAlloc = scenario.pensionFund.tfrPensionAllocationPercent !== undefined 
    ? scenario.pensionFund.tfrPensionAllocationPercent 
    : (scenario.pensionFund.routeTfr ? 100 : 0);
  const globalSavingsAlloc = scenario.pensionFund.savingsToPensionPercent ?? 0;

  return (
    <SectionCard 
      title={t('salaryPhases', 'Career & Salary Phases')} 
      icon={Briefcase}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {phases.map((phase, index) => {
            const currentTfrVal = phase.tfrPensionAllocationPercent !== undefined ? phase.tfrPensionAllocationPercent : -1;
            const currentSavingsVal = phase.savingsToPensionPercent !== undefined ? phase.savingsToPensionPercent : -1;

            return (
              <motion.div
                key={phase.id || index}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col gap-3 relative group"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                      PHASE {index + 1} ({phase.startYear} - {phase.endYear})
                    </span>
                  </div>
                  {phases.length > 1 && (
                    <button
                      onClick={() => handleRemovePhase(index)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="Rimuovi Fase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Row 1: Start Year & End Year */}
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    label={t('startYear', 'Start Yr')}
                    value={phase.startYear}
                    onChange={(val) => handleUpdatePhase(index, 'startYear', val)}
                    min={1}
                    max={phase.endYear}
                  />
                  <NumberInput
                    label={t('endYear', 'End Yr')}
                    value={phase.endYear}
                    onChange={(val) => handleUpdatePhase(index, 'endYear', val)}
                    min={phase.startYear}
                  />
                </div>

                {/* Row 2: Gross RAL & Net Monthly Savings */}
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    label={t('ral', 'Gross RAL')}
                    value={phase.annualGrossRAL}
                    onChange={(val) => handleUpdatePhase(index, 'annualGrossRAL', val)}
                    suffix="€"
                    step={1000}
                  />
                  <NumberInput
                    label={t('savings', 'Monthly Savings')}
                    value={phase.monthlyNetSavings}
                    onChange={(val) => handleUpdatePhase(index, 'monthlyNetSavings', val)}
                    suffix="€"
                    step={50}
                  />
                </div>

                {/* Row 3: Mensilità & Extra Savings (13ª / 14ª) */}
                <div className="grid grid-cols-3 gap-2">
                  <NumberInput
                    label={t('mensilita', 'Mensilità')}
                    value={phase.mensilita}
                    onChange={(val) => handleUpdatePhase(index, 'mensilita', Math.max(12, Math.min(14, val)))}
                    min={12}
                    max={14}
                  />
                  {phase.mensilita >= 13 ? (
                    <NumberInput
                      label={t('savings13th', 'Risp. 13ª')}
                      value={phase.extraSavings13th || 0}
                      onChange={(val) => handleUpdatePhase(index, 'extraSavings13th', val)}
                      suffix="€"
                      step={50}
                      tooltip={t('savings13thTooltip')}
                    />
                  ) : (
                    <div className="opacity-40 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg p-2">
                      No 13ª
                    </div>
                  )}
                  {phase.mensilita >= 14 ? (
                    <NumberInput
                      label={t('savings14th', 'Risp. 14ª')}
                      value={phase.extraSavings14th || 0}
                      onChange={(val) => handleUpdatePhase(index, 'extraSavings14th', val)}
                      suffix="€"
                      step={50}
                      tooltip={t('savings14thTooltip')}
                    />
                  ) : (
                    <div className="opacity-40 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg p-2">
                      No 14ª
                    </div>
                  )}
                </div>

                {/* Row 4: Performance Bonus / Variabile (Collapsible Card) */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <Gift className="w-3.5 h-3.5" />
                    <span>{t('bonusSection', 'Premio di Risultato / Bonus')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <NumberInput
                      label={t('annualBonus', 'Bonus Lordo')}
                      value={phase.annualBonusGross || 0}
                      onChange={(val) => handleUpdatePhase(index, 'annualBonusGross', val)}
                      suffix="€"
                      step={500}
                      tooltip={t('annualBonusTooltip')}
                    />
                    <Select
                      label={t('bonusTaxation', 'Tassazione')}
                      value={phase.bonusTaxType || 'DETASSAZIONE_5'}
                      onChange={(val) => handleUpdatePhase(index, 'bonusTaxType', val as BonusTaxType)}
                      options={[
                        { value: 'DETASSAZIONE_5', label: '5% (Agevolata)' },
                        { value: 'ORDINARIA_IRPEF', label: 'IRPEF Ordinaria' },
                        { value: 'CUSTOM', label: 'Personalizzata' },
                      ]}
                    />
                    <NumberInput
                      label={t('bonusInvestPct', '% Investita')}
                      value={phase.bonusInvestPercent !== undefined ? phase.bonusInvestPercent : 100}
                      onChange={(val) => handleUpdatePhase(index, 'bonusInvestPercent', Math.max(0, Math.min(100, val)))}
                      suffix="%"
                      step={10}
                      tooltip={t('bonusInvestTooltip')}
                    />
                  </div>
                </div>

                {/* Row 5: TFR Percentage Chips */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-medium text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{t('tfrSplitOption', '% TFR a Fondo Pensione')}</span>
                    </span>
                    <span className="text-[11px] text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50 self-start sm:self-auto shrink-0">
                      {currentTfrVal === -1 ? `Eredita Globale (${globalTfrAlloc}%)` : `Override Fase: ${currentTfrVal}%`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TFR_PRESET_OPTIONS.map((opt) => {
                      const isSelected = currentTfrVal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleUpdatePhase(index, 'tfrPensionAllocationPercent', opt.value === -1 ? undefined : opt.value)}
                          className={cn(
                            "py-2 px-2 rounded-lg text-xs font-semibold transition-all border text-center truncate",
                            isSelected
                              ? "bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20 font-bold"
                              : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 6: Savings Allocation Chips (Fondo vs ETF) */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-medium text-slate-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{t('savingsAllocation', 'Allocazione Risparmio (% a Fondo Pensione)')}</span>
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50 self-start sm:self-auto shrink-0">
                      {currentSavingsVal === -1 ? `Eredita Globale (${globalSavingsAlloc}% FP)` : `Override Fase: ${currentSavingsVal}% FP`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: -1, label: 'Global' },
                      { value: 0, label: '100% ETF' },
                      { value: 25, label: '25% FP' },
                      { value: 50, label: '50/50' },
                      { value: 75, label: '75% FP' },
                      { value: 100, label: '100% FP' },
                    ].map((opt) => {
                      const isSelected = currentSavingsVal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleUpdatePhase(index, 'savingsToPensionPercent', opt.value === -1 ? undefined : opt.value)}
                          className={cn(
                            "py-2 px-2 rounded-lg text-xs font-semibold transition-all border text-center truncate",
                            isSelected
                              ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20 font-bold"
                              : "bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <button
          onClick={handleAddPhase}
          className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 rounded-xl text-slate-300 hover:text-cyan-400 transition-all text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          {t('addPhase', 'Add Salary Phase')}
        </button>
      </div>
    </SectionCard>
  );
}
