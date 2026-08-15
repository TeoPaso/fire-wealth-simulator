'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useComparisonResults } from '@/lib/store/context';
import { KPICards } from '../charts/KPICards';
import { WealthLineChart } from '../charts/WealthLineChart';
import { AllocationDonutChart } from '../charts/AllocationDonutChart';
import { CompositionBarChart } from '../charts/CompositionBarChart';
import { ScenarioComparisonChart } from '../charts/ScenarioComparisonChart';
import { YearlyDetailTable } from '../charts/YearlyDetailTable';
import { MonthlyDisposableCashflow } from '../charts/MonthlyDisposableCashflow';

export function Dashboard() {
  const comparisonResults = useComparisonResults();
  const hasMultipleScenarios = comparisonResults && comparisonResults.length > 1;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full flex flex-col gap-6"
    >
      {/* Top: KPI Cards */}
      <motion.div variants={item}>
        <KPICards />
      </motion.div>
      
      {/* Middle: Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <WealthLineChart />
        </motion.div>
        
        <motion.div variants={item} className="lg:col-span-1">
          <AllocationDonutChart />
        </motion.div>
      </div>

      <motion.div variants={item}>
        <CompositionBarChart />
      </motion.div>

      {hasMultipleScenarios && (
        <motion.div variants={item}>
          <ScenarioComparisonChart />
        </motion.div>
      )}

      {/* Detail Table */}
      <motion.div variants={item}>
        <YearlyDetailTable />
      </motion.div>

      {/* Bottom: Monthly Disposable Cash Flow Breakdown */}
      <motion.div variants={item}>
        <MonthlyDisposableCashflow />
      </motion.div>
    </motion.div>
  );
}
