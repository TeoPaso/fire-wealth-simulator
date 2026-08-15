'use client';

import React, { useState } from 'react';
import { ConfigPanel } from './components/forms/ConfigPanel';
import { Dashboard } from './components/dashboard/Dashboard';
import { AnimatedFlame } from './components/ui/AnimatedFlame';
import { useTranslation } from '@/lib/i18n/context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Globe, 
  Flame, 
  PanelLeftOpen, 
  PanelLeftClose, 
  SlidersHorizontal,
  FolderKanban,
  Settings,
  Wallet,
  Briefcase,
  PieChart,
  ShieldCheck,
  Landmark,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const { t, lang, setLang } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [targetSection, setTargetSection] = useState<string | null>(null);

  const handleOpenSection = (sectionId: string) => {
    setTargetSection(sectionId);
    setIsDrawerOpen(true);
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#060913]">
      {/* 1. SLIM VERTICAL ICON RAIL (Anchored on the left) */}
      <aside 
        className="w-14 h-full shrink-0 bg-[#0b0f19]/95 backdrop-blur-md border-r border-slate-800/80 flex flex-col items-center py-3 z-30 select-none shadow-xl"
      >
        {/* Top Expand Button */}
        <button
          type="button"
          onClick={() => {
            setTargetSection(null);
            setIsDrawerOpen(!isDrawerOpen);
          }}
          className={cn(
            "p-2.5 rounded-xl transition-all shadow-md mb-4 border",
            isDrawerOpen
              ? "bg-cyan-500 text-white border-cyan-400 shadow-cyan-500/30"
              : "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white border-cyan-500/30 shadow-cyan-500/20"
          )}
          title={isDrawerOpen ? t('collapseSidebar', 'Riduci a colonna') : t('expandHalf', 'Apri configuratore (50%)')}
        >
          {isDrawerOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        {/* Vertical quick section jump icons */}
        <div className="flex-1 flex flex-col items-center gap-2.5 w-full px-1">
          {[
            { id: 'scenarios', icon: FolderKanban, label: 'Scenari' },
            { id: 'global', icon: Settings, label: 'Parametri Globali' },
            { id: 'wealth', icon: Wallet, label: 'Patrimonio Iniziale' },
            { id: 'salary', icon: Briefcase, label: 'Carriera & Risparmio' },
            { id: 'investments', icon: PieChart, label: 'Portafoglio ETF' },
            { id: 'pension', icon: ShieldCheck, label: 'Fondo Pensione' },
            { id: 'taxes', icon: Landmark, label: 'Fiscalità & TFR' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenSection(item.id)}
                className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-all group relative"
                title={item.label}
              >
                <Icon className="w-4 h-4" />
                <span className="sr-only">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* 50% expand badge at bottom */}
        <button
          type="button"
          onClick={() => {
            setTargetSection(null);
            setIsDrawerOpen(true);
          }}
          className="mt-auto flex flex-col items-center gap-1 pt-2 border-t border-slate-800/60 text-slate-400 hover:text-cyan-400 transition-colors group cursor-pointer"
          title="Apri configuratore al 50%"
        >
          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/80 group-hover:border-cyan-400 transition-colors">
            50%
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
        </button>
      </aside>

      {/* 2. 50% OVERLAY DRAWER & BACKDROP */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Translucent Backdrop (click to close) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
              onClick={() => setIsDrawerOpen(false)}
            />

            {/* 50% Screen Drawer Overlay (slides from left edge) */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-full sm:w-[500px] lg:w-[50vw] max-w-[100vw] h-full shadow-2xl"
            >
              <ConfigPanel 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                targetSection={targetSection}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. FULL-SCREEN FIRE CALCULATOR & DASHBOARD (Background Section) */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-[#060913]">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[#0b0f19]/85 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 shadow-md shadow-cyan-500/25 flex items-center justify-center">
              <AnimatedFlame className="w-5 h-5" />
            </div>
            <h1 className="text-base sm:text-lg font-extrabold bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent tracking-tight">
              FIRE Simulator
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg border border-slate-700/60 transition-all shadow-sm"
              title="Cambia Lingua / Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="uppercase">{lang}</span>
            </button>
          </div>
        </header>

        {/* Full-width Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <Dashboard />
        </div>
      </main>
    </div>
  );
}
