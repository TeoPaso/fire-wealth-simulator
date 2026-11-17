'use client';

/** "Panoramica": headline, wealth by age, Monte Carlo fan, success by retirement age, insights. */
import type { TabProps } from '../types';
import { FanChart } from './FanChart';
import { Headline } from './Headline';
import { Insights } from './Insights';
import { SuccessChart } from './SuccessChart';
import { WealthChart } from './WealthChart';

export function OverviewTab({ data }: TabProps) {
  return (
    <div className="space-y-4">
      <Headline data={data} />
      <WealthChart data={data} />
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <FanChart data={data} />
        <SuccessChart data={data} />
      </div>
      <Insights data={data} />
    </div>
  );
}
