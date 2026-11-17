import type { ReactNode } from 'react';
import { cn } from './cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Centered message for empty or not-yet-available content, with an optional call to action. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <div aria-hidden="true" className="mb-3 inline-flex rounded-2xl bg-slate-800/70 p-3 text-cyan-300 [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-slate-100">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
