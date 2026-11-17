// Only the small 'common' dictionary: importing lib/i18n/core here would put every dictionary of both languages in
// the eager chunk that has to load before anything (ROB-14).
import { common } from '@/lib/i18n/messages/common';
import { Skeleton } from '../ui/Skeleton';

/**
 * Pre-rendered placeholder shown until the client-only app (store + i18n) is loaded. It mirrors the shell layout
 * to avoid layout shift and shows no plan data (no default-data flash).
 */
export function AppSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh" aria-busy="true">
      <p role="status" className="sr-only">
        {common.it['common.loading']}
      </p>
      <div className="border-b border-slate-800/80 px-4 py-2.5">
        <div className="mx-auto flex max-w-app flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-9 sm:w-40" />
          <Skeleton className="ml-auto h-8 w-36" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-full md:hidden" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-app flex-1 lg:grid lg:grid-cols-shell">
        <div className="space-y-3 p-4 lg:border-r lg:border-slate-800">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <div className="hidden space-y-4 p-6 lg:block">
          <Skeleton className="h-11 w-full max-w-2xl" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </div>
  );
}
