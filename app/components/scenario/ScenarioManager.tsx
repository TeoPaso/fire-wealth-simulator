'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useStore, useActiveScenario, useStoreState } from '@/lib/store/context';
import { Plus, Copy, Trash2, Edit2, Check, X, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function ScenarioManager() {
  const { t } = useTranslation();
  const store = useStore();
  const activeScenario = useActiveScenario();
  const state = useStoreState();
  
  const scenarios = state.scenarios;
  const comparisonIds = state.comparisonScenarioIds;
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => store.createScenario();
  const handleDuplicate = (id: string) => store.duplicateScenario(id);
  const handleDelete = (id: string) => {
    if (confirm(t('confirmDeleteScenario', 'Are you sure you want to delete this scenario?'))) {
      store.deleteScenario(id);
    }
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      store.updateScenario(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="w-full glass-card p-4 rounded-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{t('scenarios', 'Scenarios')}</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('new', 'New')}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {scenarios.map((scenario) => {
            const isActive = scenario.id === activeScenario.id;
            const isCompared = comparisonIds.includes(scenario.id);
            const isEditing = editingId === scenario.id;

            return (
              <motion.div
                key={scenario.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  isActive 
                    ? "bg-slate-800/80 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                    : "bg-slate-900/40 border-slate-700/30 hover:border-slate-600/50"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => store.toggleComparisonScenario(scenario.id)}
                    className="text-slate-400 hover:text-cyan-400 shrink-0 transition-colors"
                    title={t('toggleCompare', 'Toggle comparison')}
                  >
                    {isCompared ? <CheckSquare className="w-5 h-5 text-cyan-500" /> : <Square className="w-5 h-5" />}
                  </button>

                  <div className="flex-1 truncate cursor-pointer" onClick={() => !isActive && !isEditing && store.selectActiveScenario(scenario.id)}>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(scenario.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                          autoFocus
                        />
                        <button onClick={() => saveEdit(scenario.id)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <span className={cn("text-sm font-medium", isActive ? "text-cyan-100" : "text-slate-300")}>
                        {scenario.name}
                      </span>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0 ml-4 opacity-40 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(scenario.id, scenario.name)}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded"
                      title={t('rename', 'Rename')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(scenario.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded"
                      title={t('duplicate', 'Duplicate')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id)}
                      disabled={scenarios.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                      title={t('delete', 'Delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
