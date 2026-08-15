'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario } from '@/lib/store/context';
import { formatCurrency } from '@/lib/utils';
import { CHART_THEME, CustomTooltip, SCENARIO_COLORS } from './ChartTheme';

export function WealthLineChart() {
  const { t } = useTranslation();
  const { result } = useActiveScenario();

  if (!result || !result.yearlyProjections) return null;

  const data = result.yearlyProjections;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card rounded-2xl p-6 w-full h-[400px] flex flex-col"
    >
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-100">{t('charts.wealthGrowth')}</h3>
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
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
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            <Legend {...CHART_THEME.legend} />
            
            <Line 
              type="monotone" 
              dataKey="totalWealthNominal" 
              name={t('charts.nominalWealth')} 
              stroke={SCENARIO_COLORS[0]} 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: SCENARIO_COLORS[0], stroke: '#0b0f19', strokeWidth: 2 }}
              animationDuration={1500}
            />
            <Line 
              type="monotone" 
              dataKey="totalWealthReal" 
              name={t('charts.realWealth')} 
              stroke={SCENARIO_COLORS[2]} 
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6, fill: SCENARIO_COLORS[2], stroke: '#0b0f19', strokeWidth: 2 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
