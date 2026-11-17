'use client';

import dynamic from 'next/dynamic';
import { AppSkeleton } from './AppSkeleton';

/**
 * The planner is client-only (state lives in localStorage): rendering it on the server would show default data
 * and then swap it after hydration. The static HTML therefore contains only the skeleton.
 */
const ClientApp = dynamic(() => import('./ClientApp'), { ssr: false, loading: () => <AppSkeleton /> });

export function ClientAppLoader() {
  return <ClientApp />;
}
