'use client';

import dynamic from 'next/dynamic';
import { formatDistance, formatEta } from '@/lib/chainage';
import { useLang } from '@/lib/i18n/context';
import type { NearestResult } from '@/lib/types';

const FacilityMap = dynamic(() => import('./FacilityMap').then((m) => m.FacilityMap), {
  ssr: false,
  loading: () => <div className="animate-pulse rounded-2xl bg-neutral-100" style={{ height: 280 }} />,
});

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  full: 'bg-amber-100 text-amber-800',
  closed: 'bg-neutral-200 text-neutral-600',
};

interface Props {
  facility: NearestResult;
  routeCoordinates: [number, number][];
  you: { lat: number; lng: number } | null;
  onBack: () => void;
}

export function FacilityDetail({ facility, routeCoordinates, you, onBack }: Props) {
  const { t } = useLang();

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="tap-target text-sm font-semibold text-neutral-500">
        ← {t('nearby.back')}
      </button>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-neutral-800">{facility.name}</h2>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[facility.status] ?? ''}`}
          >
            {t(`nearby.status.${facility.status}`)}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-neutral-600">
          <span className="text-2xl font-bold text-saffron-700">
            {formatDistance(facility.totalWalkKm)}
          </span>
          <span>🚶 {formatEta(facility.totalWalkKm)}</span>
        </div>
        {!facility.isAhead && (
          <p className="mt-1 text-xs text-neutral-400">{t('nearby.behind')}</p>
        )}

        {facility.contactPhone && (
          <a
            href={`tel:${facility.contactPhone}`}
            className="tap-target mt-4 flex items-center justify-center gap-2 rounded-xl bg-saffron-600 font-semibold text-white"
          >
            📞 {t('nearby.call')} — {facility.contactPhone}
          </a>
        )}
      </div>

      <FacilityMap coordinates={routeCoordinates} you={you} facility={facility} />
    </div>
  );
}
