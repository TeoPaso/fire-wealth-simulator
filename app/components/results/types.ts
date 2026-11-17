/** Data shared by every results tab. */
import type { Plan, PlanResult } from '@/lib/engine';
import type { ValueMode } from './model/values';
import type { AnalysisView } from './useAnalysis';

export interface ResultsData {
  plan: Plan;
  /** Deterministic result of the active plan (runPlan). */
  result: PlanResult;
  /** Unit of money values: today's € ('real', default) or nominal €. */
  mode: ValueMode;
  /** Monte Carlo + sensitivity (worker). */
  analysis: AnalysisView;
}

export interface TabProps {
  data: ResultsData;
}
