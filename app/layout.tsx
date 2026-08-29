import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SimBadge } from '@/components/SimBadge';
import { BottomNav } from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'वारी साथी — Wari Saathi',
  description: 'Offline pilgrim companion for the Pandharpur Wari',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Wari Saathi',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ea580c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mr">
      <body className="bg-neutral-50 text-neutral-900 min-h-screen flex flex-col">
        <Providers>
          <SimBadge />
          <OfflineBanner />
          <main className="flex-1 pb-20">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
