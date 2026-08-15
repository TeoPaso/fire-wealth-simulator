'use client';
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario } from '@/lib/store/context';
import { formatPercent } from '@/lib/utils';
import { BUCKET_COLORS } from './ChartTheme';

export function AllocationDonutChart() {
  const { t } = useTranslation();
  const scenario = useActiveScenario();

  if (!scenario || !scenario.investmentBuckets) return null;

  const data = scenario.investmentBuckets.map((bucket) => ({
    name: bucket.name,
    value: bucket.allocationPercent,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, payload: itemPayload } = payload[0];
      return (
        <div className="glass-card p-3 rounded-lg text-sm shadow-xl border border-white/10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: itemPayload.fill }} />
            <span className="text-slate-300 font-medium">{name}</span>
          </div>
          <span className="font-semibold text-slate-100 pl-4">{formatPercent(value)}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-2xl p-6 w-full h-[400px] flex flex-col relative"
    >
      <div className="mb-2">
        <h3 className="text-xl font-semibold text-slate-100">{t('charts.assetAllocation')}</h3>
      </div>
      
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
          <span className="text-sm text-slate-400">{t('charts.total')}</span>
          <span className="text-xl font-bold text-slate-100">100%</span>
        </div>
        
        <ResponsiveContainer width="100%" height="100%" className="z-10">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ paddingTop: '20px', fontSize: '13px', color: '#94a3b8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
