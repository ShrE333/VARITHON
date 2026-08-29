'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/i18n/context';

// '/live' rather than '/', because '/' is the merged app's sign-in page —
// the location features now hang off the portal instead of being the app.
// '/live', not '/': in the merged app '/' is the sign-in page. The location
// features hang off the VariMitra portal now instead of being the whole app.
const ITEMS = [
  { href: '/live', key: 'nav.home', icon: '🏠' },
  { href: '/palki', key: 'palki.nav', icon: '🛕' },
  { href: '/route', key: 'nav.route', icon: '🗺️' },
  { href: '/help', key: 'nav.help', icon: '🆘' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/route') ||
    pathname.startsWith('/palki') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/live')
  ) {
    return null;
  }

  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-neutral-300 flex safe-bottom z-40"
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            // Read out by a screen reader as "current page", and the only cue
            // besides colour — colour alone fails for the red/green colour
            // blindness that ~8% of men have.
            aria-current={active ? 'page' : undefined}
            className={`flex-1 tap-target flex flex-col items-center justify-center gap-0.5 py-2 text-base font-semibold border-t-4 ${
              active
                ? 'text-saffron-700 border-saffron-600 bg-saffron-50'
                : 'text-neutral-600 border-transparent'
            }`}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {item.icon}
            </span>
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
