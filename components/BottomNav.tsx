'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/i18n/context';

const ITEMS = [
  { href: '/', key: 'nav.home', icon: '🏠' },
  { href: '/palki', key: 'palki.nav', icon: '🛕' },
  { href: '/route', key: 'nav.route', icon: '🗺️' },
  { href: '/help', key: 'nav.help', icon: '🆘' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();

  if (pathname.startsWith('/admin') || pathname.startsWith('/demo')) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 flex safe-bottom z-40">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 tap-target flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
              active ? 'text-saffron-600' : 'text-neutral-500'
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
