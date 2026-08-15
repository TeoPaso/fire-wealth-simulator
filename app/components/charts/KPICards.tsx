'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveScenario } from '@/lib/store/context';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { 
  Banknote, 
  TrendingUp, 
  PiggyBank, 
  LineChart, 
  Receipt,
  Scale
} from 'lucide-react';

export function KPICards() {
  const { t } = useTranslation();
  const { result } = useActiveScenario();

  if (!result || !result.kpiSummary) return null;

  const {
    finalTotalWealthNominal,
    finalTotalWealthNominalGross,
    finalTotalWealthReal,
    irrAnnualPercent,
    totalContributions,
    totalInvestmentGains,
    totalGrossGains,
    totalFeesPaid,
  } = result.kpiSummary;

  const kpis = [
    {
      id: 'wealth-nominal',
      label: t('kpi.finalWealthNominal', 'Patrimonio Netto'),
      value: formatCurrency(finalTotalWealthNominal),
      grossSub: `Lordo: ${formatCurrency(finalTotalWealthNominalGross)}`,
      icon: <Banknote className="w-5 h-5 text-cyan-400" />,
      colorClass: 'text-cyan-400',
      bgClass: 'bg-cyan-400/10',
    },
    {
      id: 'wealth-real',
      label: t('kpi.finalWealthReal', 'Patrimonio Reale (Inflaz.)'),
      value: formatCurrency(finalTotalWealthReal),
      icon: <Scale className="w-5 h-5 text-blue-400" />,
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-400/10',
    },
    {
      id: 'irr',
      label: t('kpi.irr', 'Rendimento TIR / IRR'),
      value: formatPercent(irrAnnualPercent),
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-400/10',
    },
    {
      id: 'contributions',
      label: t('kpi.totalContributions', 'Capitale Versato'),
      value: formatCurrency(totalContributions),
      icon: <PiggyBank className="w-5 h-5 text-amber-400" />,
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-400/10',
    },
    {
      id: 'gains',
      label: t('kpi.totalGains', 'Rendimento Netto'),
      value: formatCurrency(totalInvestmentGains),
      grossSub: `Lordo: ${formatCurrency(totalGrossGains)}`,
      icon: <LineChart className="w-5 h-5 text-emerald-400" />,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-400/10',
    },
    {
      id: 'fees',
      label: t('kpi.totalFees', 'Costi TER & Imposte'),
      value: `-${formatCurrency(totalFeesPaid)}`,
      icon: <Receipt className="w-5 h-5 text-rose-400" />,
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-400/10',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full"
    >
      {kpis.map((kpi) => (
        <motion.div 
          key={kpi.id} 
          variants={item}
          className="glass-card rounded-2xl p-4 flex flex-col gap-3 glass-card-hover"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${kpi.bgClass}`}>
              {kpi.icon}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">{kpi.label}</div>
            <div className={`text-lg font-bold ${kpi.colorClass} leading-tight`}>
              {kpi.value}
            </div>
            {kpi.grossSub && (
              <div className="text-[11px] font-medium text-slate-500 mt-1">
                {kpi.grossSub}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
