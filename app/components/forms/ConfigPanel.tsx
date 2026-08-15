'use client';

import React, { useState, useRef } from 'react';
import { ScenarioManager } from '../scenario/ScenarioManager';
import { GlobalParamsForm } from './GlobalParamsForm';
import { InitialWealthForm } from './InitialWealthForm';
import { SalaryPhasesForm } from './SalaryPhasesForm';
import { InvestmentBucketsForm } from './InvestmentBucketsForm';
import { PensionFundForm } from './PensionFundForm';
import { TaxConfigForm } from './TaxConfigForm';
import { useActiveScenario } from '@/lib/store/context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Columns2, 
  PanelLeftClose, 
  PanelLeftOpen,
  FolderKanban,
  Settings, 
  Wallet, 
  Briefcase, 
  PieChart, 
  ShieldCheck, 
  Landmark,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

export type SidebarState = 'collapsed' | 'expanded';

interface ConfigPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenSection?: (sectionId: string) => void;
}

export function ConfigPanel({ 
  isOpen, 
  onClose,
  targetSection
}: { 
  isOpen: boolean; 
  onClose: () => void;
  targetSection?: string | null;
}) {
  const scenario = useActiveScenario();
  const { t } = useTranslation();

  const [activeSection, setActiveSection] = useState<string | null>('global');

  const toggleSection = (sectionId: string) => {
    setActiveSection((prev) => (prev === sectionId ? null : sectionId));
  };

  const scenariosRef = useRef<HTMLDivElement>(null);
  const globalRef = useRef<HTMLDivElement>(null);
  const wealthRef = useRef<HTMLDivElement>(null);
  const salaryRef = useRef<HTMLDivElement>(null);
  const investmentsRef = useRef<HTMLDivElement>(null);
  const pensionRef = useRef<HTMLDivElement>(null);
  const taxesRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    if (targetSection) {
      setActiveSection(targetSection);
      const refMap: Record<string, React.RefObject<HTMLDivElement>> = {
        scenarios: scenariosRef,
        global: globalRef,
        wealth: wealthRef,
        salary: salaryRef,
        investments: investmentsRef,
        pension: pensionRef,
        taxes: taxesRef,
      };
      const targetRef = refMap[targetSection];
      if (targetRef?.current) {
        setTimeout(() => {
          targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, [isOpen, targetSection]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f19] border-r border-slate-800 shadow-2xl">
      {/* Sticky Header with Collapse/Close Button */}
      <div className="sticky top-0 z-20 px-4 sm:px-6 py-3.5 bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
              {t('simulatorConfig', 'Simulator Configuration')}
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Pannello di controllo parametri e scenari
            </p>
          </div>
        </div>

        {/* Collapse button -> brings back to slim icon rail */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700/80 transition-all text-xs font-semibold shadow-sm shrink-0"
          title={t('collapseSidebar', 'Riduci a colonna stretta')}
        >
          <PanelLeftClose className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Riduci</span>
        </button>
      </div>
      
      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-4 custom-scrollbar">
        <div ref={scenariosRef}>
          <ScenarioManager />
        </div>
        
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          <div ref={globalRef}>
            <GlobalParamsForm 
              isOpen={activeSection === 'global'} 
              onToggle={() => toggleSection('global')} 
            />
          </div>
          <div ref={wealthRef}>
            <InitialWealthForm 
              isOpen={activeSection === 'wealth'} 
              onToggle={() => toggleSection('wealth')} 
            />
          </div>
          <div ref={salaryRef}>
            <SalaryPhasesForm 
              isOpen={activeSection === 'salary'} 
              onToggle={() => toggleSection('salary')} 
            />
          </div>
          <div ref={investmentsRef}>
            <InvestmentBucketsForm 
              isOpen={activeSection === 'investments'} 
              onToggle={() => toggleSection('investments')} 
            />
          </div>
          <div ref={pensionRef}>
            <PensionFundForm 
              isOpen={activeSection === 'pension'} 
              onToggle={() => toggleSection('pension')} 
            />
          </div>
          <div ref={taxesRef}>
            <TaxConfigForm 
              isOpen={activeSection === 'taxes'} 
              onToggle={() => toggleSection('taxes')} 
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
