'use client';

import { I18nProvider } from '@/lib/i18n';
import { StoreProvider } from '@/lib/store/hooks';
import { AppBoundary } from './AppBoundary';
import { AppShell } from './AppShell';

/** Root of the client-only app: store (localStorage) → i18n (store's language) → shell. */
export default function ClientApp() {
  return (
    <StoreProvider>
      <I18nProvider>
        <AppBoundary>
          <AppShell />
        </AppBoundary>
      </I18nProvider>
    </StoreProvider>
  );
}
