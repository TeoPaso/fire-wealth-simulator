'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function SectionCard({ 
  title, 
  icon: Icon, 
  description, 
  children, 
  defaultOpen = true, 
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  className 
}: SectionCardProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  const handleToggle = () => {
    if (isControlled) {
      controlledOnToggle?.();
    } else {
      setUncontrolledIsOpen(!uncontrolledIsOpen);
    }
  };

  return (
    <div className={cn("glass-card rounded-xl relative overflow-hidden", className)}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/30 transition-colors rounded-xl",
          isOpen && "rounded-b-none"
        )}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-slate-800/50 rounded-lg text-cyan-400">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-100">{title}</h3>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
        </div>
        <div className="text-slate-400 p-1">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-4 pt-0 border-t border-slate-700/30 mt-2">
              <div className="pt-4">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
