'use client';
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario } from '@/lib/store/context';
import { formatCurrency, cn } from '@/lib/utils';
import { CHART_THEME, CustomTooltip, COMPOSITION_COLORS } from './ChartTheme';

export function CompositionBarChart() {
  const { t } = useTranslation();
  const { result } = useActiveScenario();
  const [viewMode, setViewMode] = useState<'net' | 'gross'>('net');

  const data = useMemo(() => {
    if (!result || !result.yearlyProjections) return [];
    return result.yearlyProjections.map((row) => {
      return {
        year: row.year,
        cash: row.cashBalance,
        portfolio: viewMode === 'net' ? row.investmentPortfolioBalanceNet : row.investmentPortfolioBalanceGross,
        pension: viewMode === 'net' ? row.pensionFundBalanceNet : row.pensionFundBalanceGross,
        tfr: viewMode === 'net' ? row.tfrCompanyBalanceNet : row.tfrCompanyBalanceGross,
      };
    });
  }, [result, viewMode]);

  if (data.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl p-6 w-full h-[430px] flex flex-col"
    >
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-100">{t('charts.wealthComposition')}</h3>
        
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('net')}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
              viewMode === 'net'
                ? "bg-cyan-500 text-white shadow-sm font-bold"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            {t('charts.viewNet', 'Vista Netta')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('gross')}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
              viewMode === 'gross'
                ? "bg-cyan-500 text-white shadow-sm font-bold"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            {t('charts.viewGross', 'Vista Lorda')}
          </button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid {...CHART_THEME.grid} vertical={false} />
            <XAxis 
              dataKey="year" 
              {...CHART_THEME.axis}
              tickFormatter={(val) => `${val}`}
            />
            <YAxis 
              {...CHART_THEME.axis}
              tickFormatter={(val) => formatCurrency(val).replace(/,00|€|\s/g, '')}
              width={65}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(val: number) => formatCurrency(val)} labelFormatter={(l: any) => `${t('common.year')} ${l}`} />}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Legend {...CHART_THEME.legend} />
            
            <Bar dataKey="cash" name={t('composition.cash')} stackId="a" fill={COMPOSITION_COLORS.cash} animationDuration={1500} />
            <Bar dataKey="tfr" name={t('composition.tfr')} stackId="a" fill={COMPOSITION_COLORS.tfr} animationDuration={1500} />
            <Bar dataKey="pension" name={t('composition.pension')} stackId="a" fill={COMPOSITION_COLORS.pension} animationDuration={1500} />
            <Bar dataKey="portfolio" name={t('composition.portfolio')} stackId="a" fill={COMPOSITION_COLORS.portfolio} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
