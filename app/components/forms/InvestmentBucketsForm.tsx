'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario, useUpdateScenario } from '@/lib/store/context';
import { NumberInput } from '../ui/NumberInput';
import { PieChart, Plus, Trash2 } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { InvestmentBucket } from '@/lib/engine/types';
import { cn } from '@/lib/utils';

const COLORS = [
  'bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 
  'bg-amber-500', 'bg-rose-500', 'bg-emerald-500'
];

export function InvestmentBucketsForm({ isOpen, onToggle }: { isOpen?: boolean; onToggle?: () => void }) {
  const { t } = useTranslation();
  const scenario = useActiveScenario();
  const updateScenario = useUpdateScenario();

  const buckets = scenario.investmentBuckets;
  const totalAllocation = buckets.reduce((sum, b) => sum + b.allocationPercent, 0);
  const isValidAllocation = Math.abs(totalAllocation - 100) < 0.01;

  const handleUpdateBucket = (index: number, field: keyof InvestmentBucket, value: any) => {
    const newBuckets = [...buckets];
    newBuckets[index] = { ...newBuckets[index], [field]: value };
    updateScenario({ investmentBuckets: newBuckets });
  };

  const handleAddBucket = () => {
    const newBucket: InvestmentBucket = {
      id: `ib-${Date.now()}`,
      name: `New Asset ${buckets.length + 1}`,
      allocationPercent: Math.max(0, 100 - totalAllocation),
      expectedReturnPercent: 5.0,
      terPercent: 0.2,
      taxRatePercent: 26.0
    };
    updateScenario({ investmentBuckets: [...buckets, newBucket] });
  };

  const handleRemoveBucket = (index: number) => {
    if (buckets.length <= 1) return;
    const newBuckets = buckets.filter((_, i) => i !== index);
    updateScenario({ investmentBuckets: newBuckets });
  };

  return (
    <SectionCard 
      title={t('investmentBuckets', 'Investment Portfolio')} 
      icon={PieChart}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-4">
        
        {/* Allocation Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-400">{t('totalAllocation', 'Total Allocation')}</span>
            <span className={cn(isValidAllocation ? "text-emerald-400 font-bold" : "text-red-400 font-bold")}>
              {totalAllocation.toFixed(1)}% {isValidAllocation ? '✓' : '(Must be 100%)'}
            </span>
          </div>
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
            {buckets.map((b, i) => (
              <div 
                key={b.id} 
                className={cn("h-full transition-all duration-300", COLORS[i % COLORS.length])}
                style={{ width: `${b.allocationPercent}%` }}
                title={`${b.name}: ${b.allocationPercent}%`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence>
          {buckets.map((bucket, index) => (
            <motion.div
              key={bucket.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 relative flex flex-col gap-3 shadow-inner"
            >
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn("w-3 h-3 rounded-full shrink-0", COLORS[index % COLORS.length])} />
                  <input
                    type="text"
                    value={bucket.name}
                    onChange={(e) => handleUpdateBucket(index, 'name', e.target.value)}
                    className="bg-transparent border-b border-dashed border-slate-600 focus:border-cyan-400 text-white text-sm font-bold px-1 py-0.5 focus:outline-none w-full truncate"
                    placeholder={t('assetName', 'Asset Name')}
                  />
                </div>
                {buckets.length > 1 && (
                  <button
                    onClick={() => handleRemoveBucket(index)}
                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors shrink-0 ml-2"
                    title={t('delete', 'Delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Row 1: Allocation & Expected Return */}
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label={t('allocation', 'Allocation')}
                  value={bucket.allocationPercent}
                  onChange={(val) => handleUpdateBucket(index, 'allocationPercent', val)}
                  suffix="%"
                  step={1}
                />
                <NumberInput
                  label={t('expectedReturn', 'Expected Return')}
                  value={bucket.expectedReturnPercent}
                  onChange={(val) => handleUpdateBucket(index, 'expectedReturnPercent', val)}
                  suffix="%"
                  step={0.1}
                />
              </div>

              {/* Row 2: TER & Tax Rate */}
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label={t('ter', 'TER (Fees)')}
                  value={bucket.terPercent}
                  onChange={(val) => handleUpdateBucket(index, 'terPercent', val)}
                  suffix="%"
                  step={0.05}
                />
                <NumberInput
                  label={t('taxRate', 'Tax Rate')}
                  value={bucket.taxRatePercent}
                  onChange={(val) => handleUpdateBucket(index, 'taxRatePercent', val)}
                  suffix="%"
                  step={0.5}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={handleAddBucket}
          className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 rounded-xl text-slate-300 hover:text-cyan-400 transition-all text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          {t('addAsset', 'Add Asset Class')}
        </button>
      </div>
    </SectionCard>
  );
}
