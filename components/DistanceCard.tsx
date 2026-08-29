'use client';

import type { RouteIndex } from '@/lib/chainage';
import { formatDistance, formatEta } from '@/lib/chainage';
import type { LocationFix, RouteStage } from '@/lib/types';
import type { GpsStatus } from '@/lib/app-context';

/** route.json carries Marathi place names alongside the English ones. */
type StageWithMr = RouteStage & { fromPlaceMr?: string; toPlaceMr?: string };
import { useLang } from '@/lib/i18n/context';
import { AccuracyChip } from './AccuracyChip';

interface Props {
  route: RouteIndex;
  fix: LocationFix | null;
  gpsStatus: GpsStatus;
  rejectedCount: number;
  onRetry: () => void;
}

export function DistanceCard({ route, fix, gpsStatus, rejectedCount, onRetry }: Props) {
  const { t, lang } = useLang();

  if (gpsStatus === 'denied') {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-red-800">
        <p className="text-lg font-semibold">{t('home.gpsDenied')}</p>
      </div>
    );
  }

  if (gpsStatus === 'stalled' && !fix) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center space-y-3">
        <div className="text-4xl">📡</div>
        <p className="text-lg font-semibold text-amber-800">{t('home.stalled')}</p>
        <p className="text-sm text-amber-700">{t('home.stalledSub')}</p>
        <button
          onClick={onRetry}
          className="tap-target w-full rounded-xl bg-saffron-600 text-white font-semibold px-4"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!fix) {
    const waiting = gpsStatus === 'waiting';
    return (
      <div className="rounded-2xl bg-white border border-neutral-200 p-8 text-center space-y-2">
        <div className="animate-pulse text-4xl">📍</div>
        <p className="text-lg font-medium text-neutral-700">
          {waiting ? t('home.waitingSignal') : t('home.locating')}
        </p>
        {waiting && <p className="text-sm text-neutral-500">{t('home.waitingSignalSub')}</p>}
        {rejectedCount > 0 && (
          <p className="text-xs text-neutral-400">{t('home.rejectedCount', { n: rejectedCount })}</p>
        )}
      </div>
    );
  }

  const d = route.distanceToTemple(fix.lat, fix.lng);
  const stage = route.stageAt(d.position.chainageKm);
  const waiting = gpsStatus === 'waiting';

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white border border-neutral-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-neutral-500">{t('home.title')}</span>
          <AccuracyChip accuracyM={fix.accuracy} />
        </div>

        <div className="text-center py-2">
          <div className="text-hero text-saffron-600">{formatDistance(d.routeKm)}</div>
          <div className="text-sm text-neutral-500 mt-1">{t('home.remaining')}</div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-neutral-700 bg-neutral-50 rounded-xl py-3">
          <span className="text-xl">🚶</span>
          <span className="font-semibold">{formatEta(d.routeKm)}</span>
          <span className="text-xs text-neutral-400">({t('home.paceNote')})</span>
        </div>

        <div className="mt-3 text-center text-sm text-neutral-500">
          {t('home.currentKm')}: {formatDistance(d.position.chainageKm)}
          {stage && (
            <span>
              {' '}
              ·{' '}
              {lang === 'mr'
                ? `${(stage as StageWithMr).fromPlaceMr ?? stage.fromPlace} → ${(stage as StageWithMr).toPlaceMr ?? stage.toPlace}`
                : `${stage.fromPlace} → ${stage.toPlace}`}
            </span>
          )}
        </div>
      </div>

      {!d.onRoute && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1">
          <p className="font-semibold text-amber-800">⚠️ {t('home.offRoute')}</p>
          <p className="text-sm text-amber-700">
            {t('home.joinRouteAt')}: <strong>{formatDistance(d.joinKm)}</strong>
          </p>
          <p className="text-sm text-amber-700">
            {t('home.straightLine')}: <strong>{formatDistance(d.directKm)}</strong>
          </p>
        </div>
      )}

      {waiting && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 text-center">
          {t('home.waitingSignal')}
        </div>
      )}
    </div>
  );
}
