'use client';

import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { Download, RefreshCw, RotateCcw } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { usePlanActions } from '@/lib/store/hooks';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { downloadTextFile, exportFileName } from './download';

interface BoundaryState {
  error: unknown;
}

/**
 * Last-resort error boundary around the whole shell (inside the store and i18n providers, which do not render
 * user data). Whatever crashes, the user can still export the plans and, if a stored value keeps breaking the
 * page, reset to the examples (after a backup, or after an explicit choice when the backup fails).
 */
export class AppBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[AppBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) return <AppError onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}

export function AppError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  const actions = usePlanActions();
  const [backupFailed, setBackupFailed] = useState(false);

  const reset = (force: boolean) => {
    if (actions.resetToExamples({ force })) onRetry();
    else setBackupFailed(true);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4 py-10">
      <Banner
        tone="error"
        title={t('common.appError.title')}
        className="w-full"
        actions={
          <>
            <Button size="sm" icon={<RefreshCw />} onClick={onRetry}>
              {t('common.actions.retry')}
            </Button>
            <Button size="sm" icon={<Download />} onClick={() => downloadTextFile(exportFileName(), actions.exportJson())}>
              {t('common.error.export')}
            </Button>
            <Button size="sm" variant="danger" icon={<RotateCcw />} onClick={() => reset(backupFailed)}>
              {backupFailed ? t('common.reset.forceConfirm') : t('common.appError.reset')}
            </Button>
          </>
        }
      >
        <p>{t('common.appError.body')}</p>
        {backupFailed ? <p className="mt-2 font-medium">{t('common.reset.backupFailed')}</p> : null}
      </Banner>
    </main>
  );
}
