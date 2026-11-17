'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Download, Menu as MenuIcon, RotateCcw, Upload } from 'lucide-react';
import { hasErrors, validatePlan, type Plan } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { usePlanActions } from '@/lib/store/hooks';
import type { ImportPreview } from '@/lib/store/store';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Menu } from '../ui/Menu';
import { cn } from '../ui/cn';
import { downloadTextFile, exportFileName } from './download';

interface PendingImport {
  fileName: string;
  preview: ImportPreview;
}

const MESSAGE_TONE = { error: 'text-rose-300', warning: 'text-amber-200', info: 'text-sky-200' } as const;

/** Application menu: export JSON, import JSON (preview → confirm, always adds), reset to examples (confirm). */
export function AppMenu() {
  const { t } = useI18n();
  const actions = usePlanActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setPending({ fileName: file.name, preview: { plans: [], errors: [{ level: 'error', key: 'common.import.error.readFailed' }] } });
      return;
    }
    setPending({ fileName: file.name, preview: actions.importJson(text) });
  };

  return (
    <>
      <Menu
        label={t('common.menu.open')}
        icon={<MenuIcon />}
        align="end"
        items={[
          {
            id: 'export',
            label: t('common.menu.export'),
            icon: <Download />,
            onSelect: () => downloadTextFile(exportFileName(), actions.exportJson()),
          },
          { id: 'import', label: t('common.menu.import'), icon: <Upload />, onSelect: () => fileRef.current?.click() },
          { type: 'separator', id: 'sep' },
          {
            id: 'reset',
            label: t('common.menu.reset'),
            icon: <RotateCcw />,
            tone: 'danger',
            onSelect: () => setConfirmReset(true),
          },
        ]}
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFile}
      />

      <ImportDialog
        pending={pending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) actions.applyImport(pending.preview.plans);
          setPending(null);
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        tone="danger"
        title={t('common.reset.title')}
        confirmLabel={t('common.reset.confirm')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.resetToExamples();
          setConfirmReset(false);
        }}
      >
        <p>{t('common.reset.body')}</p>
      </ConfirmDialog>
    </>
  );
}

function planNeedsFixes(plan: Plan): boolean {
  try {
    return hasErrors(validatePlan(plan));
  } catch {
    return true;
  }
}

function ImportDialog({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingImport | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t, tp } = useI18n();
  const plans = useMemo(() => pending?.preview.plans ?? [], [pending]);
  const needsFixes = useMemo(() => plans.map(planNeedsFixes), [plans]);
  const messages = pending?.preview.errors ?? [];

  return (
    <ConfirmDialog
      open={pending !== null}
      title={t('common.import.title')}
      confirmLabel={t('common.import.confirm')}
      confirmDisabled={plans.length === 0}
      hideConfirm={plans.length === 0}
      cancelLabel={plans.length === 0 ? t('common.actions.close') : undefined}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {plans.length > 0 ? (
        <>
          <p>{tp('common.import.planCount', plans.length, { file: pending?.fileName ?? '' })}</p>
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-2">
            {plans.map((p, i) => (
              <li key={`${p.id}-${i}`} className="flex items-center justify-between gap-3 px-1 py-0.5">
                <span className="truncate text-slate-100">{p.name}</span>
                {needsFixes[i] ? (
                  <span className="shrink-0 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-xs text-amber-200">
                    {t('common.import.needsFixes')}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3">{t('common.import.explain')}</p>
        </>
      ) : null}
      {messages.length > 0 ? (
        <div className="mt-3">
          {plans.length > 0 ? <p className="font-medium text-slate-200">{t('common.import.messagesTitle')}</p> : null}
          <ul className="mt-1 space-y-1">
            {messages.map((m, i) => (
              <li key={`${m.key}-${i}`} className={cn('text-sm', MESSAGE_TONE[m.level])}>
                {t(m.key, m.params)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
