/**
 * Server-side render of the header and the import dialog with odd stored/imported plan names (ROB-01, ROB-15):
 * whatever the data, these must render (they sit outside the panel boundaries).
 */
import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { StoreProvider } from '@/lib/store/hooks';
import { STORAGE_KEY } from '@/lib/store/persistence';
import { createPlannerStore, parseImport, type PlannerStore } from '@/lib/store/store';
import { MemoryStorage } from '@/lib/store/__tests__/memoryStorage';
import { Header } from '@/app/components/shell/Header';
import { ImportDialog } from '@/app/components/shell/AppMenu';

const NOW = new Date('2026-11-17T10:00:00.000Z');

function storeWith(plans: unknown[]): PlannerStore {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, plans, activePlanId: 'p1' }));
  return createPlannerStore({ storage, now: () => NOW });
}

function render(store: PlannerStore, node: ReactNode): string {
  const inner = createElement(I18nProvider, { children: node } as { children: ReactNode });
  return renderToString(createElement(StoreProvider, { store, children: inner } as { store: PlannerStore; children: ReactNode }));
}

describe('header and import dialog with odd plan names', () => {
  it('the header renders stored plans whose names are not text', () => {
    const store = storeWith([
      { id: 'p1', name: { x: 1 } },
      { id: 'p2', name: 42 },
      { id: 'p3', name: ['a'], career: [{ id: 'c', label: {} }] },
    ]);
    const html = render(store, createElement(Header));
    expect(html).toContain('42');
    expect(html).not.toContain('[object Object]');
    expect(store.getNotices().map((n) => n.messageKey)).toContain('common.notice.coercedFields');
  });

  it('the import preview renders plans whose names are not text', () => {
    const store = storeWith([{ id: 'p1', name: 'Mio' }]);
    const preview = parseImport(JSON.stringify({ plans: [{ name: { x: 1 } }, { name: 7 }] }), NOW.toISOString());
    const html = render(
      store,
      createElement(ImportDialog, { pending: { fileName: 'odd.json', preview }, onCancel: () => {}, onConfirm: () => {} }),
    );
    expect(html).toContain('odd.json');
    expect(html).toContain('>7<');
  });
});
