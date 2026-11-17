import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from './cn';

export interface CardProps extends ComponentPropsWithRef<'div'> {
  /** Inner padding (default 'md'). */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Render as another landmark/element, e.g. 'section' or 'article'. */
  as?: 'div' | 'section' | 'article' | 'aside';
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' } as const;

/** Glass surface with a 1px slate-800 border and rounded-2xl corners. */
export function Card({ padding = 'md', as: Tag = 'div', className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'glass rounded-2xl border border-slate-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]',
        PADDING[padding],
        className,
      )}
      {...rest}
    />
  );
}

/** Optional card header: title, optional description and trailing actions. */
export function CardHeader({
  title,
  description,
  actions,
  className,
  titleAs: Title = 'h2',
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleAs?: 'h2' | 'h3' | 'h4';
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <Title className="text-base font-semibold text-slate-100">{title}</Title>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
