'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArchiveRestore, Download, Menu as MenuIcon, RotateCcw, Trash2, Upload } from 'lucide-react';
import { hasErrors, validatePlan, type Plan } from '@/lib/engine';
import { useI18n } from '@/lib/i18n';
import { usePlanActions } from '@/lib/store/hooks';
import type { BackupInfo } from '@/lib/store/persistence';
import { MAX_IMPORT_BYTES, type ImportPreview } from '@/lib/store/store';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Menu } from '../ui/Menu';
import { cn } from '../ui/cn';
import { downloadTextFile, exportFileName } from './download';

interface PendingImport {
  fileName: string;
  preview: ImportPreview;
}

const MESSAGE_TONE = { error: 'text-rose-300', warning: 'text-amber-200', info: 'text-sky-200' } as const;

const errorPreview = (key: string, params?: Record<string, string | number>): ImportPreview => ({
  plans: [],
  errors: [{ level: 'error', key, params }],
});

/**
 * Application menu: export JSON, import JSON (preview → confirm, always adds), backups (restore as new plans,
 * download, delete), reset to examples (confirm; refused without a backup unless the user chooses so).
 */
export function AppMenu() {
  const { t } = useI18n();
  const actions = usePlanActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetBlocked, setResetBlocked] = useState(false);
  const [backupsOpen, setBackupsOpen] = useState(false);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setPending({ fileName: file.name, preview: errorPreview('common.import.error.tooLarge', { max: MAX_IMPORT_BYTES / 1024 / 1024 }) });
      return;
    }
    let preview: ImportPreview;
    try {
      preview = actions.importJson(await file.text());
    } catch {
      preview = errorPreview('common.import.error.readFailed');
    }
    setPending({ fileName: file.name, preview });
  };

  const exportAll = () => downloadTextFile(exportFileName(), actions.exportJson());

  return (
    <>
      <Menu
        label={t('common.menu.open')}
        icon={<MenuIcon />}
        align="end"
        items={[
          { id: 'export', label: t('common.menu.export'), icon: <Download />, onSelect: exportAll },
          { id: 'import', label: t('common.menu.import'), icon: <Upload />, onSelect: () => fileRef.current?.click() },
          { id: 'backups', label: t('common.menu.backups'), icon: <ArchiveRestore />, onSelect: () => setBackupsOpen(true) },
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
          const done = actions.resetToExamples();
          setConfirmReset(false);
          if (!done) setResetBlocked(true);
        }}
      >
        <p>{t('common.reset.body')}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={resetBlocked}
        tone="danger"
        title={t('common.reset.title')}
        confirmLabel={t('common.reset.forceConfirm')}
        onCancel={() => setResetBlocked(false)}
        onConfirm={() => {
          actions.resetToExamples({ force: true });
          setResetBlocked(false);
        }}
      >
        <p>{t('common.reset.backupFailed')}</p>
        <Button className="mt-3" size="sm" icon={<Download />} onClick={exportAll}>
          {t('common.reset.exportFirst')}
        </Button>
      </ConfirmDialog>

      <BackupsDialog
        open={backupsOpen}
        onClose={() => setBackupsOpen(false)}
        onRestore={(backup, raw) => {
          setBackupsOpen(false);
          setPending({ fileName: backup.key, preview: actions.importJson(raw) });
        }}
      />
    </>
  );
}

/** Backups written by the app (before a reset, or when saved data could not be read): restore, download, delete. */
function BackupsDialog({
  open,
  onClose,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  onRestore: (backup: BackupInfo, raw: string) => void;
}) {
  const { t, format, lang } = useI18n();
  const actions = usePlanActions();
  // Backups are not part of the planner state: they are read on every render of the open dialog, and a deletion
  // bumps this counter to render again.
  const [, setDeletions] = useState(0);
  const backups = open ? actions.listBackups() : [];
  const date = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <ConfirmDialog open={open} title={t('common.backups.title')} hideConfirm cancelLabel={t('common.actions.close')} onCancel={onClose} onConfirm={onClose}>
      <p>{t('common.backups.intro')}</p>
      {backups.length === 0 ? (
        <p className="mt-3 text-slate-400">{t('common.backups.empty')}</p>
      ) : (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {backups.map((b) => {
            const raw = () => actions.readBackup(b.key);
            return (
              <li key={b.key} className="rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
                <p className="text-slate-100">{date(b.createdAt)}</p>
                <p className="text-xs text-slate-400">{t('common.backups.size', { size: format.num(Math.max(1, Math.round(b.size / 1024))) })}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    icon={<ArchiveRestore />}
                    aria-label={t('common.backups.restoreFor', { date: date(b.createdAt) })}
                    onClick={() => {
                      const text = raw();
                      if (text !== null) onRestore(b, text);
                    }}
                  >
                    {t('common.backups.restore')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Download />}
                    aria-label={t('common.backups.downloadFor', { date: date(b.createdAt) })}
                    onClick={() => {
                      const text = raw();
                      if (text !== null) downloadTextFile(`${b.key.replace(/[^\w.-]+/g, '-')}.json`, text);
                    }}
                  >
                    {t('common.backups.download')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 />}
                    aria-label={t('common.backups.deleteFor', { date: date(b.createdAt) })}
                    onClick={() => {
                      actions.deleteBackup(b.key);
                      setDeletions((v) => v + 1);
                    }}
                  >
                    {t('common.backups.delete')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ConfirmDialog>
  );
}

function planNeedsFixes(plan: Plan): boolean {
  try {
    return hasErrors(validatePlan(plan));
  } catch {
    return true;
  }
}

/** Preview of an import (exported for render tests). */
export function ImportDialog({
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
                <span className="truncate text-slate-100">{String(p.name)}</span>
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
