import React from 'react';

// Color palette for scenarios in comparison charts
export const SCENARIO_COLORS = [
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
];

// Color palette for composition segments
export const COMPOSITION_COLORS = {
  cash: '#94a3b8', // slate-400
  portfolio: '#06b6d4', // cyan-500
  pension: '#8b5cf6', // violet-500
  tfr: '#10b981', // emerald-500
};

// Colors for investment buckets (will cycle through these)
export const BUCKET_COLORS = [
  '#0ea5e9', // sky-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#f43f5e', // rose-500
];

// Common styling configurations for Recharts components
export const CHART_THEME = {
  grid: {
    stroke: 'rgba(255, 255, 255, 0.05)',
    strokeDasharray: '3 3',
  },
  axis: {
    tick: { fill: '#94a3b8', fontSize: 12 },
    axisLine: { stroke: 'rgba(255, 255, 255, 0.1)' },
    tickLine: { stroke: 'rgba(255, 255, 255, 0.1)' },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: 'rgba(17, 24, 39, 0.8)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '8px',
      color: '#f1f5f9',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    },
    itemStyle: {
      color: '#f1f5f9',
      fontWeight: 500,
    },
    labelStyle: {
      color: '#94a3b8',
      marginBottom: '4px',
      fontWeight: 600,
    },
  },
  legend: {
    wrapperStyle: {
      paddingTop: '20px',
    },
  },
};

// Custom tooltip component wrapper for generic use
export const CustomTooltip = ({ active, payload, label, formatter, labelFormatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 rounded-lg text-sm shadow-xl border border-white/10">
        <div className="text-slate-400 font-medium mb-2">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color || entry.fill }} 
                />
                <span className="text-slate-300">{entry.name}</span>
              </div>
              <span className="font-semibold text-slate-100">
                {formatter ? formatter(entry.value, entry.name, entry, index, payload) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
