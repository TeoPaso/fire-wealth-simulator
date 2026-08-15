'use client';
import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/context';
import { useComparisonResults } from '@/lib/store/context';
import { formatCurrency } from '@/lib/utils';
import { CHART_THEME, CustomTooltip, SCENARIO_COLORS } from './ChartTheme';

export function ScenarioComparisonChart() {
  const { t } = useTranslation();
  const results = useComparisonResults();
  const [useReal, setUseReal] = useState(false);

  const data = useMemo(() => {
    if (!results || results.length <= 1) return [];
    
    // Find max horizon
    const maxYears = Math.max(...results.map(r => r.parameters.timeHorizonYears));
    const mergedData = [];

    for (let i = 1; i <= maxYears; i++) {
      const yearRow: any = { year: i };
      results.forEach(res => {
        const proj = res.yearlyProjections.find(p => p.year === i);
        if (proj) {
          yearRow[res.scenarioId] = useReal ? proj.totalWealthReal : proj.totalWealthNominal;
        }
      });
      mergedData.push(yearRow);
    }
    return mergedData;
  }, [results, useReal]);

  if (!results || results.length <= 1) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-2xl p-6 w-full h-[500px] flex flex-col"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl font-semibold text-slate-100">{t('charts.scenarioComparison')}</h3>
        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setUseReal(false)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${!useReal ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t('charts.nominal')}
          </button>
          <button 
            onClick={() => setUseReal(true)}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${useReal ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t('charts.real')}
          </button>
        </div>
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
            
            {results.map((res, index) => (
              <Line 
                key={res.scenarioId}
                type="monotone" 
                dataKey={res.scenarioId} 
                name={res.parameters.name} 
                stroke={SCENARIO_COLORS[index % SCENARIO_COLORS.length]} 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: SCENARIO_COLORS[index % SCENARIO_COLORS.length], stroke: '#0b0f19', strokeWidth: 2 }}
                animationDuration={1500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
