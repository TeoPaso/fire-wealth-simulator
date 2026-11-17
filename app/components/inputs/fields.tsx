'use client';

/**
 * Inputs-panel building blocks on top of the UI kit: fields bound to an issue path, layout helpers and list-item
 * chrome. They add the field id (so issues can focus it) and the validation messages of that exact path.
 */
import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  ConfirmDialog,
  FieldMessages,
  HelpTooltip,
  IconButton,
  NumberField,
  Select,
  Switch,
  TextField,
  cn,
  type FieldIssue,
  type NumberFieldProps,
  type SelectProps,
  type SwitchProps,
  type TextFieldProps,
} from '../ui';
import { usePlanEditor } from './editor';

type WithPath<P> = Omit<P, 'issues' | 'id'> & {
  /** Plan path of the value (issues for this path are shown under the field). */
  path: string;
  /** Extra UI-only messages (already translated). */
  extraIssues?: readonly FieldIssue[];
};

export function PlanNumber({ path, extraIssues, ...props }: WithPath<NumberFieldProps>) {
  const { fieldIssues, fieldId } = usePlanEditor();
  return <NumberField id={fieldId(path)} issues={[...fieldIssues(path), ...(extraIssues ?? [])]} {...props} />;
}

export function PlanText({ path, extraIssues, ...props }: WithPath<TextFieldProps>) {
  const { fieldIssues, fieldId } = usePlanEditor();
  return <TextField id={fieldId(path)} issues={[...fieldIssues(path), ...(extraIssues ?? [])]} {...props} />;
}

export function PlanSelect<V extends string>({ path, extraIssues, ...props }: WithPath<SelectProps<V>>) {
  const { fieldIssues, fieldId } = usePlanEditor();
  return <Select<V> id={fieldId(path)} issues={[...fieldIssues(path), ...(extraIssues ?? [])]} {...props} />;
}

/** Switch with the issues of its path listed underneath. */
export function PlanSwitch({ path, className, ...props }: Omit<SwitchProps, 'id'> & { path: string }) {
  const { fieldIssues, fieldId } = usePlanEditor();
  const id = fieldId(path);
  return (
    <div className={className}>
      <Switch id={id} {...props} />
      <FieldMessages id={`${id}-msg`} issues={fieldIssues(path)} />
    </div>
  );
}

/**
 * A labelled group of controls that are not a single input (segmented control, list): label + help, content,
 * and the issues of `path`. `anchorId` is focusable so an issue link can move focus here.
 */
export function FieldGroup({
  path,
  label,
  help,
  description,
  children,
  className,
}: {
  path: string;
  label: string;
  help?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { fieldIssues, fieldId } = usePlanEditor();
  const id = fieldId(path);
  return (
    <div
      id={id}
      data-field
      tabIndex={-1}
      role="group"
      aria-labelledby={`${id}-label`}
      className={cn('min-w-0 focus:outline-none', className)}
    >
      <div className="mb-1.5 flex min-h-6 items-center gap-1">
        <span id={`${id}-label`} className="text-sm font-medium text-slate-200">
          {label}
        </span>
        {help ? <HelpTooltip content={help} label={label} /> : null}
      </div>
      <div className="min-w-0">
        {children}
        {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
        <FieldMessages id={`${id}-msg`} issues={fieldIssues(path)} />
      </div>
    </div>
  );
}

/**
 * Responsive grid of fields: one column on phones, two from 640px. In two columns every child spans two rows and
 * fields ([data-field]: label + body) use them as a subgrid, so the inputs of a row line up even when only one of
 * the two labels wraps onto a second line.
 */
export function FieldGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2',
        'sm:[&>*]:row-span-2 sm:[&>[data-field]]:grid sm:[&>[data-field]]:grid-rows-subgrid sm:[&>[data-field]]:gap-y-0',
        // The body is always the second row, even when the label is visually hidden (sr-only = out of flow).
        'sm:[&>[data-field]>:last-child]:row-start-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Sub-heading inside a section, with optional help. */
export function SubHeading({ children, help, label, actions }: { children: ReactNode; help?: ReactNode; label?: string; actions?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 first:mt-0">
      <h3 className="min-w-0 flex-1 text-sm font-semibold uppercase tracking-wide text-slate-300">
        <span className="inline-flex items-center gap-1 align-middle">
          {children}
          {help ? <HelpTooltip content={help} label={label} /> : null}
        </span>
      </h3>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}

/** Explanatory paragraph (teaches a concept in plain words). */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm leading-relaxed text-slate-400', className)}>{children}</p>;
}

/** Bordered box for one item of a list (career phase, event, asset). */
export function ItemCard({
  title,
  subtitle,
  actions,
  children,
  invalid,
  className,
  headingId,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  invalid?: boolean;
  className?: string;
  headingId?: string;
}) {
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={cn(
        'rounded-xl border bg-slate-950/30 p-3 sm:p-4',
        invalid ? 'border-rose-400/50' : 'border-slate-800',
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 id={headingId} className="truncate text-sm font-semibold text-slate-100">
            {title}
          </h4>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {actions ? <div className="-mr-1 -mt-1 flex shrink-0 items-center">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Move up / move down / remove buttons for a list item. Removal asks for confirmation. */
export function ItemActions({
  itemName,
  onMoveUp,
  onMoveDown,
  onRemove,
  removeTitle,
  removeBody,
  moveUpLabel,
  moveDownLabel,
  removeLabel,
}: {
  /** Name of the item for the accessible labels, e.g. "Fase 2". */
  itemName: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  removeTitle: string;
  removeBody: ReactNode;
  moveUpLabel?: string;
  moveDownLabel?: string;
  removeLabel?: string;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      {moveUpLabel !== undefined ? (
        <IconButton size="sm" icon={<ArrowUp />} label={moveUpLabel} disabled={!onMoveUp} onClick={onMoveUp} />
      ) : null}
      {moveDownLabel !== undefined ? (
        <IconButton size="sm" icon={<ArrowDown />} label={moveDownLabel} disabled={!onMoveDown} onClick={onMoveDown} />
      ) : null}
      <IconButton
        size="sm"
        icon={<Trash2 />}
        label={removeLabel ?? t('inputs.common.removeItem', { name: itemName })}
        disabled={!onRemove}
        onClick={() => setConfirming(true)}
        className="hover:text-rose-300"
      />
      <ConfirmDialog
        open={confirming}
        title={removeTitle}
        tone="danger"
        confirmLabel={t('inputs.common.remove')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onRemove?.();
        }}
      >
        {removeBody}
      </ConfirmDialog>
    </>
  );
}

/** Issues of a path that has no input of its own (list containers, whole items). */
export function PathIssues({ path, className }: { path: string; className?: string }) {
  const { fieldIssues, fieldId } = usePlanEditor();
  const issues = fieldIssues(path);
  if (issues.length === 0) return null;
  return (
    <div id={fieldId(path)} tabIndex={-1} className={cn('focus:outline-none', className)}>
      <FieldMessages id={`${fieldId(path)}-msg`} issues={issues} />
    </div>
  );
}
