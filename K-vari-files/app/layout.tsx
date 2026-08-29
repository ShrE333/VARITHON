import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * Root layout for the merged app. Deliberately thin.
 *
 * Two very different products live under this shell:
 *
 *   (portal) — the VariMitra pilgrim portal and Temple Command Dashboard,
 *              styled by hand-written CSS scoped to .vm-* wrappers.
 *   (wari)   — the Wari Saathi location features (live distance, route,
 *              Palki, SOS), styled with Tailwind inside .wari-scope.
 *
 * Neither one's chrome, providers, or resets belong here — each group layout
 * brings its own, so the two never style each other. See styles/portal/ for
 * how the portal CSS was scoped.
 */

export const metadata: Metadata = {
  title: 'VariMitra — One Platform. Safer Pilgrimage. Preserved Heritage.',
  description:
    'Pilgrim portal, temple command dashboard and live Wari location services for the Pandharpur Wari.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VariMitra',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8B1B1B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The portal markup is Font Awesome throughout; loading it here keeps
            the icon set from flashing in on every client-side navigation. */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
