'use client';

/** "Flussi": where the money goes in working years, where it comes from in retirement, payroll, lifetime totals. */
import type { TabProps } from '../types';
import { RetiredFlowsChart, WorkingFlowsChart } from './FlowsCharts';
import { LifetimeTotals } from './LifetimeTotals';
import { PayrollCard } from './PayrollCard';

export function FlowsTab({ data }: TabProps) {
  return (
    <div className="space-y-4">
      <WorkingFlowsChart data={data} />
      <RetiredFlowsChart data={data} />
      <PayrollCard data={data} />
      <LifetimeTotals data={data} />
    </div>
  );
}
