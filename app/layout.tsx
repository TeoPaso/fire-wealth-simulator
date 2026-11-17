import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'FIRE Planner Italia',
  description: 'Quando posso smettere di lavorare? Pianificatore FIRE con fiscalità italiana 2026.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0b1020',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
