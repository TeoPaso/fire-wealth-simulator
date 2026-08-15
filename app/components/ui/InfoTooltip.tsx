'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface InfoTooltipProps {
  content: React.ReactNode;
  label?: string;
  className?: string;
}

export function InfoTooltip({
  content,
  label,
  className,
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    tooltipWidth: number;
    isTop: boolean;
  }>({
    top: 0,
    left: 0,
    arrowLeft: 0,
    tooltipWidth: 240,
    isTop: true,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(250, window.innerWidth - 24);
    const triggerCenter = rect.left + rect.width / 2;

    // Clamp horizontal position within viewport
    let left = triggerCenter - tooltipWidth / 2;
    left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left));

    // Arrow relative to the tooltip box
    let arrowLeft = triggerCenter - left;
    arrowLeft = Math.max(12, Math.min(tooltipWidth - 12, arrowLeft));

    // Vertical positioning: if enough space above (>= 110px), show above; else show below
    const isTop = rect.top >= 110;
    const top = isTop ? rect.top - 8 : rect.bottom + 8;

    setCoords({
      top,
      left,
      arrowLeft,
      tooltipWidth,
      isTop,
    });
  }, []);

  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updateCoords();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      handleOpen();
    } else {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      setIsOpen(false);
    }
  };

  // Keep coords updated on scroll or window resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  // Close on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label ? `Info: ${label}` : 'Information'}
        aria-expanded={isOpen}
        onClick={handleToggle}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        className={cn(
          'p-0.5 rounded-full text-slate-400 hover:text-cyan-400 focus:text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors shrink-0',
          isOpen && 'text-cyan-400',
          className
        )}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={tooltipRef}
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  y: coords.isTop ? 4 : -4,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  y: coords.isTop ? 4 : -4,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onMouseEnter={handleOpen}
                onMouseLeave={handleClose}
                role="tooltip"
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  width: coords.tooltipWidth,
                  transform: coords.isTop ? 'translateY(-100%)' : 'none',
                  zIndex: 9999,
                }}
                className="p-2.5 bg-slate-900/95 backdrop-blur-md text-xs font-normal text-slate-200 rounded-lg shadow-2xl border border-slate-700/80 text-left normal-case tracking-normal leading-relaxed pointer-events-auto select-text"
              >
                {content}
                {/* Tooltip arrow */}
                <div
                  style={{ left: coords.arrowLeft }}
                  className={cn(
                    'absolute w-0 h-0 -translate-x-1/2 border-x-4 border-x-transparent',
                    coords.isTop
                      ? 'top-full border-t-4 border-t-slate-900'
                      : 'bottom-full border-b-4 border-b-slate-900'
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
