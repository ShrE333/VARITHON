'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * The way back to whichever side of the app sent you here.
 *
 * The location features used to be a standalone PWA whose home screen was the
 * app itself. In the merged app they are opened *from* the VariMitra portal,
 * so without this a pilgrim who taps "Route & Travel" has the four-item bottom
 * nav and no exit — the portal is only reachable by editing the URL.
 *
 * Where "back" points depends on who is signed in: an admin arrived from the
 * command dashboard, a pilgrim from the VariMitra home.
 */
export function PortalReturnBar() {
  const pathname = usePathname();
  const [href, setHref] = useState('/varimitra');
  const [label, setLabel] = useState('VariMitra');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('varimitra_user');
      const role = raw ? (JSON.parse(raw) as { role?: string }).role : null;
      if (role === 'admin') {
        setHref('/command-dashboard');
        setLabel('Command Dashboard');
      }
    } catch {
      // Malformed or unavailable storage — the pilgrim default is the safe one.
    }
  }, []);

  // /demo is presented as a standalone simulation; chrome from the portal
  // would undercut the "this is the live system" framing of the demo script.
  if (pathname.startsWith('/demo')) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur">
      <Link
        href={href}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-base font-semibold text-[#8B1B1B] hover:bg-[#FBF6EE]"
      >
        <span aria-hidden>←</span>
        <span>{label}</span>
      </Link>
      <span className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Live Wari Services
      </span>
    </div>
  );
}
