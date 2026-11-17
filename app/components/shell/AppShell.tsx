'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { InputsPanel } from '../inputs/InputsPanel';
import { ResultsPanel } from '../results/ResultsPanel';
import { cn } from '../ui/cn';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileTabBar, type MobilePanel } from './MobileTabBar';
import { NoticesArea } from './NoticesArea';
import { PanelBoundary } from './PanelBoundary';

export const INPUTS_PANEL_ID = 'panel-inputs';
export const RESULTS_PANEL_ID = 'panel-results';

/**
 * Page layout. ≥1024px: inputs column (440px) and results side by side, each scrolling independently.
 * <1024px: one panel at a time, switched by the bottom tab bar; both stay mounted so drafts are kept.
 */
export function AppShell() {
  const t = useT();
  const [panel, setPanel] = useState<MobilePanel>('inputs');

  const switchPanel = (next: MobilePanel) => {
    setPanel(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4rem_+_env(safe-area-inset-bottom))] lg:h-dvh lg:pb-0">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-cyan-400 px-4 py-2 font-medium text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('common.skipToContent')}
      </a>
      <Header />
      <NoticesArea />
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
          <PanelBoundary>
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
          <PanelBoundary>
            <ResultsPanel />
          </PanelBoundary>
        </section>
      </main>
      <Footer />
      <MobileTabBar value={panel} onChange={switchPanel} inputsId={INPUTS_PANEL_ID} resultsId={RESULTS_PANEL_ID} />
    </div>
  );
}
