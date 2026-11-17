'use client';

import { useState } from 'react';
import { Copy, EllipsisVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useT, type TFunction } from '@/lib/i18n';
import { shallowEqualArray, usePlanActions, usePlannerState } from '@/lib/store/hooks';
import type { PlannerState } from '@/lib/store/state';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Menu, type MenuEntry } from '../ui/Menu';
import { Select } from '../ui/Select';
import { TextField } from '../ui/TextField';

const EXAMPLE_IDS = ['example-base', 'example-prudent', 'example-optimistic'] as const;
type ExampleId = (typeof EXAMPLE_IDS)[number];

function exampleText(t: TFunction, id: ExampleId): { label: string; hint: string } {
  switch (id) {
    case 'example-base':
      return { label: t('common.example.base'), hint: t('common.example.baseHint') };
    case 'example-prudent':
      return { label: t('common.example.prudent'), hint: t('common.example.prudentHint') };
    case 'example-optimistic':
      return { label: t('common.example.optimistic'), hint: t('common.example.optimisticHint') };
  }
}

interface PlanOption {
  id: string;
  name: string;
}
const selectPlanOptions = (s: PlannerState): PlanOption[] => s.plans.map((p) => ({ id: p.id, name: p.name }));
const planOptionsEqual = (a: PlanOption[], b: PlanOption[]) =>
  shallowEqualArray(
    a.map((o) => `${o.id}\u0000${o.name}`),
    b.map((o) => `${o.id}\u0000${o.name}`),
  );
const selectActiveId = (s: PlannerState) => s.activePlanId;

type DialogState = { kind: 'rename'; id: string; name: string } | { kind: 'delete'; id: string; name: string } | null;

/** Active-plan selector plus "new from example" and duplicate / rename / delete actions. */
export function PlanSelector() {
  const t = useT();
  const actions = usePlanActions();
  const plans = usePlannerState(selectPlanOptions, planOptionsEqual);
  const activeId = usePlannerState(selectActiveId);
  const active = plans.find((p) => p.id === activeId) ?? plans[0];
  const [dialog, setDialog] = useState<DialogState>(null);

  const newItems: MenuEntry[] = EXAMPLE_IDS.map((id) => {
    const text = exampleText(t, id);
    return {
      id,
      label: text.label,
      hint: text.hint,
      icon: <Plus />,
      onSelect: () => actions.createPlan({ exampleId: id, name: text.label }),
    };
  });

  const planItems: MenuEntry[] = [
    {
      id: 'duplicate',
      label: t('common.plan.duplicate'),
      icon: <Copy />,
      onSelect: () => actions.duplicatePlan(active.id, t('common.plan.copyName', { name: active.name })),
    },
    {
      id: 'rename',
      label: t('common.plan.rename'),
      icon: <Pencil />,
      onSelect: () => setDialog({ kind: 'rename', id: active.id, name: active.name }),
    },
    { type: 'separator', id: 'sep' },
    {
      id: 'delete',
      label: t('common.plan.delete'),
      hint: plans.length <= 1 ? t('common.plan.deleteLast') : undefined,
      icon: <Trash2 />,
      tone: 'danger',
      disabled: plans.length <= 1,
      onSelect: () => setDialog({ kind: 'delete', id: active.id, name: active.name }),
    },
  ];

  const renameValue = dialog?.kind === 'rename' ? dialog.name : '';
  const renameEmpty = renameValue.trim() === '';

  return (
    <>
      <Select
        className="min-w-0 flex-1"
        label={t('common.plan.selectLabel')}
        hideLabel
        value={active.id}
        onChange={actions.setActive}
        options={plans.map((p) => ({ value: p.id, label: p.name }))}
        selectClassName="h-10 font-medium"
      />
      <Menu
        label={t('common.plan.newFromExample')}
        icon={<Plus />}
        items={[{ type: 'label', id: 'new-label', label: t('common.plan.newFromExample') }, ...newItems]}
        align="end"
      />
      <Menu label={t('common.plan.actions')} icon={<EllipsisVertical />} items={planItems} align="end" />

      <ConfirmDialog
        open={dialog?.kind === 'rename'}
        title={t('common.plan.renameTitle')}
        confirmLabel={t('common.actions.save')}
        confirmDisabled={renameEmpty}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== 'rename' || renameEmpty) return;
          actions.renamePlan(dialog.id, dialog.name.trim());
          setDialog(null);
        }}
      >
        <TextField
          label={t('common.plan.nameLabel')}
          value={renameValue}
          maxLength={80}
          autoComplete="off"
          onChange={(name) => setDialog((d) => (d?.kind === 'rename' ? { ...d, name } : d))}
          issues={renameEmpty ? [{ level: 'error', message: t('common.plan.nameRequired') }] : []}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        tone="danger"
        title={t('common.plan.deleteTitle')}
        confirmLabel={t('common.plan.delete')}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === 'delete') actions.deletePlan(dialog.id);
          setDialog(null);
        }}
      >
        <p>{t('common.plan.deleteBody', { name: dialog?.kind === 'delete' ? dialog.name : '' })}</p>
      </ConfirmDialog>
    </>
  );
}
