'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { usePlanActions } from '@/lib/store/hooks';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { downloadTextFile, exportFileName } from './download';

interface BoundaryState {
  error: unknown;
}

/**
 * Error boundary around each panel: a rendering bug in one panel must not blank the whole app, and the user can
 * always export their data.
 */
export class PanelBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[PanelBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) return <PanelError onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}

function PanelError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  const actions = usePlanActions();
  return (
    <Banner
      tone="error"
      title={t('common.error.title')}
      actions={
        <>
          <Button size="sm" icon={<RefreshCw />} onClick={onRetry}>
            {t('common.actions.retry')}
          </Button>
          <Button size="sm" icon={<Download />} onClick={() => downloadTextFile(exportFileName(), actions.exportJson())}>
            {t('common.error.export')}
          </Button>
        </>
      }
    >
      {t('common.error.body')}
    </Banner>
  );
}
