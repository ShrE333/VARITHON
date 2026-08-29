'use client';

import dynamic from 'next/dynamic';
import { useApp } from '@/lib/app-context';
import { useLang } from '@/lib/i18n/context';
import { StageSchedule } from '@/components/StageSchedule';

// Leaflet touches `window` at import time and is the heaviest dependency in
// the app — dynamic-import it with ssr:false so it only ever loads on this
// page, never in M1's initial bundle.
const RouteMap = dynamic(() => import('@/components/RouteMap').then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl bg-neutral-100 animate-pulse" style={{ height: 420 }} />
  ),
});

export default function RoutePage() {
  const { route, routeLoading, fix, routePos } = useApp();
  const { t } = useLang();

  if (!route) {
    return (
      <div className="max-w-md mx-auto px-4 pt-4 pb-6">
        <h1 className="text-lg font-bold text-neutral-800 mb-4">{t('nav.route')}</h1>
        <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center text-neutral-400">
          {routeLoading ? t('common.loading') : t('common.retry')}
        </div>
      </div>
    );
  }

  const currentStage = routePos ? route.stageAt(routePos.chainageKm) : null;
  const remainingCount = routePos ? route.remainingStages(routePos.chainageKm).length : null;

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-6 space-y-4">
      <h1 className="text-lg font-bold text-neutral-800">{t('nav.route')}</h1>

      <RouteMap route={route} fix={fix} routePos={routePos} />

      <StageSchedule stages={route.bundle.stages} currentStage={currentStage} remainingCount={remainingCount} />
    </div>
  );
}
