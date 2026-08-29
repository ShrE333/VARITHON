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
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-8 space-y-6">
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



          <RouteGlance route={route} fix={fix} routePos={routePos} />
        </>
      )}
    </div>
  );
}
