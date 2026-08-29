'use client';

import { useApp } from '@/lib/app-context';
import { useLang } from '@/lib/i18n/context';
import { DistanceCard } from '@/components/DistanceCard';
import { LangToggle } from '@/components/LangToggle';

export default function HomePage() {
  const { route, routeLoading, routeError, fix, gpsStatus, rejectedCount, retryGps } = useApp();
  const { t } = useLang();

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-800">{t('app.name')}</h1>
        <LangToggle />
      </header>

      {routeError && !route && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-red-800">
          {routeError}
        </div>
      )}

      {routeLoading && !route && (
        <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center text-neutral-500">
          {t('common.loading')}
        </div>
      )}

      {route && (
        <DistanceCard
          route={route}
          fix={fix}
          gpsStatus={gpsStatus}
          rejectedCount={rejectedCount}
          onRetry={retryGps}
        />
      )}
    </div>
  );
}
