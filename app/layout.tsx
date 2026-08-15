import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/context';
import { StoreProvider } from '@/lib/store/context';

import { ServiceWorkerRegistration } from './components/ServiceWorkerRegistration';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FIRE Simulator — Wealth Projection & Financial Planning',
  description: 'Personal financial projection and wealth simulation PWA. Model salary, TFR, pension funds, and investments over time.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FIRE Simulator',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <head>
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} font-sans bg-[#0b0f19] text-slate-100 antialiased`}>
        <ServiceWorkerRegistration />
        <LanguageProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
