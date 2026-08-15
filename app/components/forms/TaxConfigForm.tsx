'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario, useUpdateScenario } from '@/lib/store/context';
import { NumberInput } from '../ui/NumberInput';
import { Landmark, ShieldAlert, Scale, Sparkles } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { TaxConfig } from '@/lib/engine/types';

export function TaxConfigForm({ isOpen, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const { t } = useTranslation();
  const scenario = useActiveScenario();
  const updateScenario = useUpdateScenario();

  const taxes = scenario.taxes;

  const handleUpdate = (field: keyof TaxConfig, value: any) => {
    updateScenario({
      taxes: { ...taxes, [field]: value }
    });
  };

  return (
    <SectionCard 
      title={t('taxConfig', 'Parametri Fiscali & Normativi (100% Trasparenza)')} 
      icon={Landmark}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4">
        <div className="bg-slate-900/60 border border-cyan-900/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p>
            Tutti i parametri fiscali e normativi sono completamente trasparenti e modificabili in base agli aggiornamenti di legge.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Imposta di Bollo */}
          <NumberInput
            label={t('wealthTax', 'Imposta di Bollo (0,20%)')}
            value={taxes.wealthTaxPercent}
            onChange={(val) => handleUpdate('wealthTaxPercent', val)}
            suffix="%"
            step={0.05}
            tooltip={t('wealthTaxTooltip')}
          />

          {/* Aliquota Marginale IRPEF */}
          <NumberInput
            label={t('marginalIrpef', 'Aliquota IRPEF Marginale')}
            value={taxes.marginalIRPEFTaxRate}
            onChange={(val) => handleUpdate('marginalIRPEFTaxRate', val)}
            suffix="%"
            step={1}
            tooltip={t('marginalIrpefTooltip')}
          />

          {/* Cap Deducibilità Pensione */}
          <NumberInput
            label={t('pensionDeductionCap', 'Tetto Deducibilità Pensione')}
            value={taxes.pensionDeductionCap}
            onChange={(val) => handleUpdate('pensionDeductionCap', val)}
            suffix="€"
            step={100}
            tooltip={t('pensionCapTooltip')}
          />

          {/* Tassazione Separata TFR Azienda */}
          <NumberInput
            label={t('tfrCompanyTaxRate', 'Tassazione TFR Azienda')}
            value={taxes.tfrCompanyTaxRatePercent ?? 23.0}
            onChange={(val) => handleUpdate('tfrCompanyTaxRatePercent', val)}
            suffix="%"
            step={0.5}
            tooltip={t('tfrCompanyTaxRateTooltip')}
          />

          {/* Imposta Sostitutiva Premi di Risultato */}
          <NumberInput
            label={t('bonusTaxRateLabel', 'Imposta Premi Risultato')}
            value={taxes.bonusSubstituteTaxRate ?? 5.0}
            onChange={(val) => handleUpdate('bonusSubstituteTaxRate', val)}
            suffix="%"
            step={0.5}
            tooltip={t('bonusTaxRateTooltip')}
          />

          {/* Quota Fondo Garanzia INPS */}
          <NumberInput
            label={t('tfrInpsGuarantee', 'Detrazione INPS TFR')}
            value={taxes.tfrSubtractedPercentage ?? 0.5}
            onChange={(val) => handleUpdate('tfrSubtractedPercentage', val)}
            suffix="%"
            step={0.1}
            tooltip={t('tfrInpsGuaranteeTooltip')}
          />

          {/* Rivalutazione Fissa TFR Azienda */}
          <NumberInput
            label={t('tfrCompanyFixedReval', 'Rivalutazione Fissa TFR')}
            value={taxes.tfrCompanyFixedRevalRate ?? 1.5}
            onChange={(val) => handleUpdate('tfrCompanyFixedRevalRate', val)}
            suffix="%"
            step={0.1}
            tooltip={t('tfrRevalTooltip')}
          />

          {/* Peso Inflazione Rivalutazione TFR */}
          <NumberInput
            label={t('tfrInflationWeight', 'Peso Inflazione TFR')}
            value={taxes.tfrCompanyInflationWeight ?? 75.0}
            onChange={(val) => handleUpdate('tfrCompanyInflationWeight', val)}
            suffix="%"
            step={1}
            tooltip={t('tfrInflationTooltip')}
          />
        </div>
      </div>
    </SectionCard>
  );
}
