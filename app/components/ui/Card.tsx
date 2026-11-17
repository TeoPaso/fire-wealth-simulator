import type { ComponentPropsWithRef } from 'react';
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
