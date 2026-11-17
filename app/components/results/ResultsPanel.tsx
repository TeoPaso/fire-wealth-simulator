'use client';

/**
 * Results of the active plan (docs/SPEC.md §7): deterministic result (runPlan, synchronous and memoised) plus
 * Monte Carlo and sensitivity from the analysis worker, shown in six tabs. A plan with validation errors shows the
 * list of errors instead of charts.
 */
import { useState } from 'react';
import { BookOpen, ChartArea, ChartBar, GitCompareArrows, Table2, Wind } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useActivePlan, usePlanResult, useUiPrefs } from '@/lib/store/hooks';
import { Tabs, type TabItem } from '../ui';
import { AnalysisStatus } from './AnalysisStatus';
import { ResultsErrorState } from './ResultsErrorState';
import { AssumptionsTab } from './assumptions/AssumptionsTab';
import { CompareTab } from './compare/CompareTab';
import { FlowsTab } from './flows/FlowsTab';
import { OverviewTab } from './overview/OverviewTab';
import { SensitivityTab } from './sensitivity/SensitivityTab';
import { YearTableTab } from './table/YearTableTab';
import { useAnalysis } from './useAnalysis';

export type ResultsTabId = 'overview' | 'flows' | 'table' | 'sensitivity' | 'compare' | 'assumptions';

export function ResultsPanel() {
  const t = useT();
  const plan = useActivePlan();
  const { valueMode } = useUiPrefs();
  const { result, error } = usePlanResult(plan);
  const analysis = useAnalysis(plan, result !== null);
  const [tab, setTab] = useState<ResultsTabId>('overview');

  const header = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 className="min-w-0 truncate text-lg font-semibold text-slate-100">{t('results.title', { name: plan.name })}</h2>
      {result ? <AnalysisStatus analysis={analysis} /> : null}
    </div>
  );

  if (!result) {
    return (
      <div>
        {header}
        <ResultsErrorState plan={plan} error={error} />
      </div>
    );
  }

  const data = { plan, result, mode: valueMode, analysis };
  const items: TabItem<ResultsTabId>[] = [
    { value: 'overview', label: t('results.tab.overview'), icon: <ChartArea />, content: <OverviewTab data={data} /> },
    { value: 'flows', label: t('results.tab.flows'), icon: <ChartBar />, content: <FlowsTab data={data} /> },
    { value: 'table', label: t('results.tab.table'), icon: <Table2 />, content: <YearTableTab data={data} /> },
    { value: 'sensitivity', label: t('results.tab.sensitivity'), icon: <Wind />, content: <SensitivityTab data={data} /> },
    { value: 'compare', label: t('results.tab.compare'), icon: <GitCompareArrows />, content: <CompareTab data={data} /> },
    { value: 'assumptions', label: t('results.tab.assumptions'), icon: <BookOpen />, content: <AssumptionsTab data={data} /> },
  ];

  return (
    <div>
      {header}
      <Tabs items={items} value={tab} onValueChange={setTab} label={t('results.tabs.label')} activation="manual" />
    </div>
  );
}
