'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { ScenarioStore, StorageSchemaV1 } from './scenario-store';
import { ScenarioParameters, ScenarioProjectionResult } from '../engine/types';
import { calculateProjection, sanitizeScenarioParameters } from '../engine/calculator';

interface StoreContextType {
  store: ScenarioStore;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [store] = useState<ScenarioStore>(() => new ScenarioStore());

  useEffect(() => {
    store.rehydrateFromLocalStorage();
  }, [store]);

  return <StoreContext.Provider value={{ store }}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context.store;
};

export const useStoreState = (): StorageSchemaV1 => {
  const store = useStore();
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getState(),
    () => store.getState()
  );
};

type ActiveScenarioReturn = ScenarioParameters & {
  result: ScenarioProjectionResult;
};

export const useActiveScenario = (): ActiveScenarioReturn => {
  const state = useStoreState();

  const activeScenario = useMemo(() => {
    return (
      state.scenarios.find((s) => s.id === state.activeScenarioId) ||
      state.scenarios[0]
    );
  }, [state]);

  const projectionResult = useMemo(() => {
    try {
      return calculateProjection(activeScenario);
    } catch {
      try {
        const sanitized = sanitizeScenarioParameters(activeScenario);
        return calculateProjection(sanitized);
      } catch {
        return {
          scenarioId: activeScenario.id,
          parameters: activeScenario,
          yearlyProjections: [],
          kpiSummary: {
            finalTotalWealthNominal: 0,
            finalTotalWealthNominalGross: 0,
            finalTotalWealthReal: 0,
            irrAnnualPercent: 0,
            averageAnnualReturnPercent: 0,
            totalContributions: 0,
            totalInvestmentGains: 0,
            totalGrossGains: 0,
            totalFeesPaid: 0,
            totalTaxesPaid: 0,
          },
        } as ScenarioProjectionResult;
      }
    }
  }, [activeScenario]);

  return useMemo(() => {
    return Object.assign({}, activeScenario, { result: projectionResult });
  }, [activeScenario, projectionResult]);
};

export const useComparisonResults = (): ScenarioProjectionResult[] => {
  const state = useStoreState();

  const comparisonScenarios = useMemo(() => {
    return state.scenarios.filter((s) => state.comparisonScenarioIds.includes(s.id));
  }, [state]);

  const comparisonResults = useMemo(() => {
    return comparisonScenarios.map((scen) => {
      try {
        return calculateProjection(scen);
      } catch {
        try {
          const sanitized = sanitizeScenarioParameters(scen);
          return calculateProjection(sanitized);
        } catch {
          return {
            scenarioId: scen.id,
            parameters: scen,
            yearlyProjections: [],
            kpiSummary: {
              finalTotalWealthNominal: 0,
              finalTotalWealthNominalGross: 0,
              finalTotalWealthReal: 0,
              irrAnnualPercent: 0,
              averageAnnualReturnPercent: 0,
              totalContributions: 0,
              totalInvestmentGains: 0,
              totalGrossGains: 0,
              totalFeesPaid: 0,
              totalTaxesPaid: 0,
            },
          } as ScenarioProjectionResult;
        }
      }
    });
  }, [comparisonScenarios]);

  return comparisonResults;
};

export const useUpdateScenario = () => {
  const store = useStore();

  return (updates: Partial<ScenarioParameters>) => {
    const activeId = store.getActiveScenario().id;
    store.updateScenario(activeId, updates);
  };
};
