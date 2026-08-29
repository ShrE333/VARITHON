'use client';

import { useState } from 'react';
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
  const [showSchedule, setShowSchedule] = useState(false);

  if (!route) {
    return (
      <div className="max-w-md mx-auto px-4 pt-4 pb-6">
        <h1 className="text-lg font-bold text-neutral-800 mb-4">{t('nav.route')}</h1>
        <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center text-neutral-600">
          {routeLoading ? t('common.loading') : t('common.retry')}
        </div>
      </div>
    );
  }

  const currentStage = routePos ? route.stageAt(routePos.chainageKm) : null;
  const remainingCount = routePos ? route.remainingStages(routePos.chainageKm).length : null;

  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col bg-neutral-100">
      <div className="relative flex-1">
        <RouteMap route={route} fix={fix} routePos={routePos} height="100%" className="absolute inset-0 z-0" />

        {/* Floating Toggle Button */}
        <div
          className="absolute top-4 left-4 z-[1000]"
          onMouseEnter={() => setShowSchedule(true)}
          onMouseLeave={() => setShowSchedule(false)}
        >
          <button
            className="bg-white border-2 border-neutral-300 text-neutral-800 font-bold px-4 py-2 rounded-lg shadow-md hover:bg-neutral-50 transition-colors flex items-center gap-2"
            onClick={() => setShowSchedule(!showSchedule)}
          >
            <span className="text-lg">🗺️</span> {t('nav.route')}
          </button>
        </div>

        {/* Sliding Panel Overlay for Mobile (optional, but good for closing) */}
        {showSchedule && (
          <div
            className="absolute inset-0 bg-black/20 z-[1050] md:hidden"
            onClick={() => setShowSchedule(false)}
          />
        )}

        {/* Sliding Panel */}
        <div
          className={`absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-neutral-50 z-[1100] shadow-2xl transition-transform duration-300 ease-in-out transform ${showSchedule ? 'translate-x-0' : '-translate-x-full'}`}
          onMouseEnter={() => setShowSchedule(true)}
          onMouseLeave={() => setShowSchedule(false)}
        >
          <div className="h-full overflow-y-auto p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-bold text-neutral-800">{t('nav.route')} Schedule</h1>
              <button
                onClick={() => setShowSchedule(false)}
                className="text-neutral-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-200 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <StageSchedule stages={route.bundle.stages} currentStage={currentStage} remainingCount={remainingCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
