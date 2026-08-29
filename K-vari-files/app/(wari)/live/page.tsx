'use client';

import Link from 'next/link';
import { useApp } from '@/lib/app-context';
import { useLang } from '@/lib/i18n/context';
import { DistanceCard } from '@/components/DistanceCard';
import { RouteGlance } from '@/components/RouteGlance';
import { LangToggle } from '@/components/LangToggle';

export default function HomePage() {
  const { route, routeLoading, routeError, fix, routePos, gpsStatus, rejectedCount, retryGps } =
    useApp();
  const { t } = useLang();

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-6 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t('app.name')}</h1>
        <LangToggle />
      </header>

      {routeError && !route && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border-2 border-red-300 p-6 text-center text-lg text-red-900"
        >
          {routeError}
        </div>
      )}

      {routeLoading && !route && (
        <div className="rounded-2xl bg-white border-2 border-neutral-200 p-8 text-center text-lg text-neutral-500">
          {t('common.loading')}
        </div>
      )}

      {route && (
        <>
          <DistanceCard
            route={route}
            fix={fix}
            gpsStatus={gpsStatus}
            rejectedCount={rejectedCount}
            onRetry={retryGps}
          />

          {/* The two things a pilgrim reaches for in a hurry, above the fold
              and thumb-sized, so neither needs the bottom nav to be found. */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/help"
              className="tap-target rounded-2xl bg-red-600 text-white font-bold text-xl flex flex-col items-center justify-center gap-1 py-4 shadow-sm active:bg-red-700"
            >
              <span className="text-3xl leading-none" aria-hidden>
                🆘
              </span>
              {t('nav.help')}
            </Link>
            <Link
              href="/palki"
              className="tap-target rounded-2xl bg-saffron-600 text-white font-bold text-xl flex flex-col items-center justify-center gap-1 py-4 shadow-sm active:bg-saffron-700"
            >
              <span className="text-3xl leading-none" aria-hidden>
                🛕
              </span>
              {t('palki.nav')}
            </Link>
          </div>

          <RouteGlance route={route} fix={fix} routePos={routePos} />
        </>
      )}
    </div>
  );
}
