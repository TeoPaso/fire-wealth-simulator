'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario, useUpdateScenario } from '@/lib/store/context';
import { NumberInput } from '../ui/NumberInput';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { Settings } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';

export function GlobalParamsForm({ isOpen, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const { t } = useTranslation();
  const scenario = useActiveScenario();
  const updateScenario = useUpdateScenario();

  const isInflationOn = scenario.inflationEnabled !== false;

  return (
    <SectionCard 
      title={t('globalParams', 'Global Parameters')} 
      icon={Settings}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4">
        {/* Time Horizon & TFR Divisor */}
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label={t('timeHorizon', 'Time Horizon')}
            value={scenario.timeHorizonYears}
            onChange={(val) => {
              const newHorizon = Math.max(1, Math.min(50, val));
              const phases = (scenario.salaryPhases && scenario.salaryPhases.length > 0)
                ? [...scenario.salaryPhases].sort((a, b) => a.startYear - b.startYear)
                : [];
              if (phases.length > 0) {
                const lastPhase = { ...phases[phases.length - 1] };
                lastPhase.endYear = newHorizon;
                phases[phases.length - 1] = lastPhase;
              }
              updateScenario({ timeHorizonYears: newHorizon, salaryPhases: phases });
            }}
            suffix={t('years', 'years')}
            min={1}
            max={50}
            tooltip={t('timeHorizonTooltip', 'Number of years to simulate into the future (1-50)')}
          />
          <NumberInput
            label={t('tfrDivisor', 'TFR Divisor')}
            value={scenario.tfrDivisor}
            onChange={(val) => updateScenario({ tfrDivisor: Math.max(1, val) })}
            step={0.1}
            tooltip={t('tfrDivisorTooltip', 'Divisor used to calculate annual TFR accrual from RAL. Legally usually 13.5.')}
          />
        </div>

        {/* Inflation Simulation Toggle & Rate */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3">
          <ToggleSwitch
            label={t('inflationToggle', 'Simulazione Inflazione')}
            checked={isInflationOn}
            onChange={(val) => updateScenario({ inflationEnabled: val })}
            description={t('inflationToggleDesc', 'Applica l\'inflazione per rivalutazione TFR e potere d\'acquisto reale')}
          />

          {isInflationOn && (
            <div className="pt-1">
              <NumberInput
                label={t('inflationRate', 'Tasso di Inflazione Atteso')}
                value={scenario.inflationRatePercent ?? 2.0}
                onChange={(val) => updateScenario({ inflationRatePercent: val })}
                suffix="%"
                step={0.1}
                tooltip={t('inflationTooltip', 'Tasso di inflazione annuo medio (default 2,0% BCE, liberamente modificabile)')}
              />
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
