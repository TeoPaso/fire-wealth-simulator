import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { DEFAULT_LANG, translate } from '@/lib/i18n/core';
import { ServiceWorker } from './components/pwa/ServiceWorker';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// Static export: metadata is rendered once, in the default language (the client syncs <html lang> afterwards).
export const metadata: Metadata = {
  title: translate(DEFAULT_LANG, 'common.app.name'),
  description: translate(DEFAULT_LANG, 'common.app.description'),
  applicationName: translate(DEFAULT_LANG, 'common.app.name'),
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/icon-192x192.png', sizes: '192x192' }],
  },
  appleWebApp: { capable: true, title: translate(DEFAULT_LANG, 'common.app.shortName') },
  formatDetection: { telephone: false },
};

// No maximumScale / userScalable: pinch-zoom must stay available (WCAG 1.4.4).
export const viewport: Viewport = {
  themeColor: '#0b1020',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LANG} className={inter.variable}>
      <body className="font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
