/** Public engine API. UI code must import from '@/lib/engine' only. */
export * from './types';
export { IT_2026, cloneRules } from './rules/it2026';
export { createDefaultPlan, createExamplePlans } from './defaults';
export type { DefaultPlanOptions } from './defaults';
export { computePayroll } from './tax/payroll';
export { netPensionIncome } from './tax/pensionIncome';
export type { PensionIncomeTax } from './tax/pensionIncome';
export { tfrQuota, tfrRevaluationRatePct, tfrSeparateTaxRatePct } from './tax/tfr';
export { exitTaxRatePct, yieldTaxRatePct } from './tax/pensionFund';
export { validatePlan, hasErrors, ISSUE_CODES, VALIDATION_LIMITS } from './validate';
export type { IssueCode } from './validate';
export { runPlan, fireNumberToday } from './fire';
export { runMonteCarlo } from './montecarlo';
export type { MonteCarloOptions } from './montecarlo';
export { runSensitivity } from './sensitivity';
export { migrateV1State } from './migrate-v1';
export type { MigrateOptions } from './migrate-v1';
