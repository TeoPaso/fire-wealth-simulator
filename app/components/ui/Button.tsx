import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 active:bg-cyan-500',
  secondary: 'border border-slate-700 bg-slate-800/60 text-slate-100 hover:border-slate-600 hover:bg-slate-700/60',
  ghost: 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100',
  danger: 'bg-rose-400 text-slate-950 hover:bg-rose-300 active:bg-rose-500',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
};

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon rendered before the label (decorative). */
  icon?: ReactNode;
}

/** Text button. Defaults to type="button" so it never submits a form by accident. */
export function Button({ variant = 'secondary', size = 'md', icon, className, children, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="-ml-0.5 inline-flex [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Accessible name (also shown as native tooltip). Required: icon-only buttons need a label. */
  label: string;
  icon: ReactNode;
  variant?: Exclude<ButtonVariant, 'primary'> | 'primary';
  size?: ButtonSize;
}

/** Square icon-only button with a mandatory accessible label. */
export function IconButton({ label, icon, variant = 'ghost', size = 'md', className, type, title, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={title ?? label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        size === 'sm' ? 'h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4' : 'h-10 w-10 rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]',
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </button>
  );
}
