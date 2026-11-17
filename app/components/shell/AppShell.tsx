'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n, useT } from '@/lib/i18n';
import { PlanValidationError } from '@/lib/engine';
import { useActivePlan, usePlanResult } from '@/lib/store/hooks';
import { InputsPanel } from '../inputs/InputsPanel';
import dynamic from 'next/dynamic';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../ui/cn';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileTabBar, type MobilePanel, type ResultsBadge } from './MobileTabBar';
import { NoticesArea } from './NoticesArea';
import { PanelBoundary } from './PanelBoundary';

// The results (charts: recharts and its dependencies) load as a separate chunk, so the inputs panel — the first
// thing shown on phones — does not wait for the chart code (ROB-14).
const ResultsPanel = dynamic(() => import('../results/ResultsPanel').then((m) => m.ResultsPanel), {
  ssr: false,
  loading: () => (
    <div aria-busy="true" className="space-y-3">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  ),
});

export const INPUTS_PANEL_ID = 'panel-inputs';
export const RESULTS_PANEL_ID = 'panel-results';

/**
 * Page layout. ≥1024px: inputs column (440px) and results side by side, each scrolling independently.
 * <1024px: one panel at a time, switched by the bottom tab bar; both stay mounted so drafts are kept, and each
 * keeps its own scroll position. The header, notices and both panels have their own error boundary (reset when the
 * active plan changes); ClientApp adds a last-resort boundary around everything.
 */
/** The FI age of the active plan for the mobile tab bar (same cached runPlan as the results panel). */
function useResultsBadge(): ResultsBadge {
  const { t, tp } = useI18n();
  const plan = useActivePlan();
  const { result, error } = usePlanResult(plan);
  if (!result) {
    const count = error instanceof PlanValidationError ? Math.max(1, error.issues.filter((i) => i.level === 'error').length) : 1;
    return { text: '!', label: tp('common.nav.badgeErrors', count), tone: 'error' };
  }
  const { fiAge } = result.summary;
  if (fiAge === null) return { text: '—', label: t('common.nav.badgeNone'), tone: 'warning' };
  return { text: String(fiAge), label: t('common.nav.badgeAge', { age: fiAge }), tone: 'ok' };
}

/**
 * < 1024px: after focus moves (Tab, the virtual keyboard's "next"), scroll the focused control out from under the
 * fixed bottom tab bar if the browser left it there (globals.css also sets scroll-padding-bottom). WCAG 2.4.11.
 */
function keepFocusClearOfTabBar(): () => void {
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || window.innerWidth >= 1024) return;
    requestAnimationFrame(() => {
      const bar = document.querySelector<HTMLElement>('[data-mobile-tabbar]');
      if (!bar || bar.contains(target)) return;
      const barTop = bar.getBoundingClientRect().top;
      const rect = target.getBoundingClientRect();
      if (rect.bottom > barTop - 8) window.scrollBy({ top: rect.bottom - barTop + 16 });
    });
  };
  document.addEventListener('focusin', onFocusIn);
  return () => document.removeEventListener('focusin', onFocusIn);
}

export function AppShell() {
  const t = useT();
  const planId = useActivePlan().id;
  const resultsBadge = useResultsBadge();
  const [panel, setPanel] = useState<MobilePanel>('inputs');
  // <1024px the page itself scrolls: remember where each panel was, so checking a result and coming back to the
  // form lands on the field being edited (first visit of a panel: top).
  const scrollByPanel = useRef<Record<MobilePanel, number>>({ inputs: 0, results: 0 });
  const restore = useRef<number | null>(null);

  const switchPanel = (next: MobilePanel) => {
    if (next === panel) {
      window.scrollTo({ top: 0 });
      return;
    }
    scrollByPanel.current[panel] = window.scrollY;
    restore.current = scrollByPanel.current[next];
    setPanel(next);
  };

  useLayoutEffect(() => {
    if (restore.current === null) return;
    window.scrollTo({ top: restore.current });
    restore.current = null;
  }, [panel]);

  useEffect(() => keepFocusClearOfTabBar(), []);

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4rem_+_env(safe-area-inset-bottom))] lg:h-dvh lg:pb-0">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-cyan-400 px-4 py-2 font-medium text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('common.skipToContent')}
      </a>
      <PanelBoundary resetKey={planId}>
        <Header />
      </PanelBoundary>
      <PanelBoundary resetKey={planId}>
        <NoticesArea />
      </PanelBoundary>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-app flex-1 focus:outline-none lg:grid lg:min-h-0 lg:grid-cols-shell"
      >
        <section
          id={INPUTS_PANEL_ID}
          aria-label={t('common.panel.inputs')}
          className={cn(
            'scroll-thin px-4 py-4 lg:block lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-slate-800/80',
            panel !== 'inputs' && 'hidden',
          )}
        >
          <PanelBoundary resetKey={planId}>
            <InputsPanel />
          </PanelBoundary>
        </section>
        <section
          id={RESULTS_PANEL_ID}
          aria-label={t('common.panel.results')}
          className={cn(
            'scroll-thin min-w-0 px-4 py-4 lg:block lg:min-h-0 lg:overflow-y-auto lg:px-6',
            panel !== 'results' && 'hidden',
          )}
        >
          <PanelBoundary resetKey={planId}>
            <ResultsPanel />
          </PanelBoundary>
        </section>
      </main>
      <Footer />
      <MobileTabBar
        value={panel}
        onChange={switchPanel}
        inputsId={INPUTS_PANEL_ID}
        resultsId={RESULTS_PANEL_ID}
        resultsBadge={resultsBadge}
      />
    </div>
  );
}
