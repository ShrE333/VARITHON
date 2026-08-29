import { Providers } from '@/components/Providers';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SimBadge } from '@/components/SimBadge';
import { BottomNav } from '@/components/BottomNav';
import { PortalReturnBar } from '@/components/PortalReturnBar';

/**
 * Everything the Wari Saathi location features need, and nothing the portal
 * pages would be harmed by.
 *
 * `.wari-scope` is what re-applies Tailwind's preflight here (see
 * app/globals.css) — without it every `border` utility in these pages renders
 * with no border, because preflight is disabled globally so it cannot reach
 * the hand-styled portal.
 *
 * PortalReturnBar is the way back: these pages are reached from the portal
 * dashboard now, so the bottom nav alone would strand a pilgrim inside the
 * location features with no route home.
 */
export default function WariLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wari-scope bg-neutral-50 text-neutral-900 min-h-screen flex flex-col">
      <Providers>
        <PortalReturnBar />
        <SimBadge />
        <OfflineBanner />
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </Providers>
    </div>
  );
}
