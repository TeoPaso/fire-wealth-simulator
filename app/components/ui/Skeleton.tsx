import { cn } from './cn';

/** Placeholder block shown while content loads (pulses only when motion is allowed). Decorative: aria-hidden. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-xl bg-slate-800/70 motion-safe:animate-pulse', className)} />;
}
