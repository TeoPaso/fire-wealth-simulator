'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario, useUpdateScenario } from '@/lib/store/context';
import { NumberInput } from '../ui/NumberInput';
import { Wallet } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';

export function InitialWealthForm({ isOpen, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const { t } = useTranslation();
  const scenario = useActiveScenario();
  const updateScenario = useUpdateScenario();

  const handleUpdate = (field: keyof typeof scenario.initialWealth, val: number) => {
    updateScenario({
      initialWealth: {
        ...scenario.initialWealth,
        [field]: Math.max(0, val)
      }
    });
  };

  return (
    <SectionCard 
      title={t('initialWealth', 'Initial Wealth')} 
      icon={Wallet}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label={t('investedCapital', 'Invested Capital')}
          value={scenario.initialWealth.investedCapital}
          onChange={(val) => handleUpdate('investedCapital', val)}
          suffix="€"
          tooltip={t('investedCapitalTooltip', 'Starting balance of your current investment portfolio')}
        />
        <NumberInput
          label={t('cashLiquidity', 'Cash & Liquidity')}
          value={scenario.initialWealth.cashLiquidity}
          onChange={(val) => handleUpdate('cashLiquidity', val)}
          suffix="€"
          tooltip={t('cashTooltip', 'Cash sitting in checking or savings accounts (emergency fund)')}
        />
        <NumberInput
          label={t('pensionBalance', 'Pension Fund Balance')}
          value={scenario.initialWealth.pensionBalance}
          onChange={(val) => handleUpdate('pensionBalance', val)}
          suffix="€"
          tooltip={t('pensionBalanceTooltip', 'Current amount accumulated in your complementary pension fund')}
        />
        <NumberInput
          label={t('accumulatedTfr', 'Accumulated TFR')}
          value={scenario.initialWealth.accumulatedTfr}
          onChange={(val) => handleUpdate('accumulatedTfr', val)}
          suffix="€"
          tooltip={t('accumulatedTfrTooltip', 'TFR currently retained in the company or INPS')}
        />
      </div>
    </SectionCard>
  );
}
