'use client';

/**
 * The pilgrim-facing answer to "where is the Palki?".
 *
 * The rule this component exists to enforce: a prediction must never look
 * like a measurement. Every number carries its uncertainty and its age, and
 * as the data gets older the UI claims progressively less — down to claiming
 * nothing at all rather than showing a stale dot on a map.
 *
 *   under 5 min   solid dot, "Live"
 *   5 min - 3 h   hollow dot, dashed ring, "Estimated - synced HH:MM - +/- X km"
 *   3 h - 8 h     no dot at all; name the stretch of road instead
 *   past valid    no position; last known, with its timestamp
 */

import { formatAge, formatClock, type PalkiView } from '@/lib/palki/client';
import { formatDistance } from '@/lib/chainage';
import { useLang } from '@/lib/i18n/context';
import type { LandmarkEta, Packet } from '@/lib/palki/types';

interface Props {
  packet: Packet;
  view: PalkiView;
  next: LandmarkEta | null;
  /** Names of the landmarks bracketing the Palki, for the segment state. */
  segmentNames: { from: string; to: string } | null;
  totalKm: number;
}

function Badge({ view }: { view: PalkiView }) {
  const { t } = useLang();

  if (view.freshness === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
        <span className="h-2 w-2 rounded-full bg-green-600" />
        {t('palki.live')}
      </span>
    );
  }
  if (view.freshness === 'expired') {
    return (
      <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-bold text-neutral-600">
        {t('palki.noData')}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
      {t('palki.estimated')}
    </span>
  );
}

export function PalkiStatusCard({ packet, view, next, segmentNames, totalKm }: Props) {
  const { t, lang } = useLang();

  const placeName = (l: LandmarkEta) => (lang === 'mr' || lang === 'hi' ? l.name_mr : l.name);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-500">{t('palki.title')}</span>
          <Badge view={view} />
        </div>

        {/* --- The lead line: a landmark and a time, never coordinates. --- */}
        {view.freshness === 'expired' ? (
          <div className="py-3 text-center">
            <p className="text-lg font-semibold text-neutral-700">{t('palki.unavailable')}</p>
            <p className="mt-2 text-sm text-neutral-500">
              {t('palki.lastKnown', { time: formatClock(packet.current.observedAt) })}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {formatDistance(packet.current.sKm)} · {t('palki.kmToGo', {
                km: Math.round(totalKm - packet.current.sKm),
              })}
            </p>
          </div>
        ) : view.freshness === 'segment' ? (
          <div className="py-2 text-center">
            {/* Deliberately no single position: at this age a dot would be a
                lie. A stretch of road is the honest unit. */}
            <div className="text-2xl font-bold leading-tight text-saffron-700">
              {segmentNames
                ? t('palki.between', { from: segmentNames.from, to: segmentNames.to })
                : `${formatDistance(view.segment?.fromKm ?? 0)} – ${formatDistance(view.segment?.toKm ?? 0)}`}
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              {t('palki.age', { age: formatAge(view.observationAgeMs) })}
            </p>
          </div>
        ) : next && next.eta ? (
          <div className="py-2 text-center">
            <div className="text-2xl font-bold leading-snug text-saffron-700">
              {t('palki.reaches', {
                place: placeName(next),
                time: `${next.beyondForecast ? '~' : ''}${formatClock(next.eta)}`,
              })}
            </div>
            {next.beyondForecast && (
              // Past the 8h forecast window this is an extrapolation of the
              // schedule, not a forecast we stand behind to the minute.
              <p className="mt-1 text-xs text-amber-700">{t('palki.roughEta')}</p>
            )}
            <p className="mt-2 text-sm text-neutral-500">
              {t('palki.kmToGo', { km: Math.round(totalKm - (view.sKm ?? 0)) })}
            </p>
          </div>
        ) : (
          <div className="py-2 text-center">
            <div className="text-hero text-saffron-600">{formatDistance(view.sKm ?? 0)}</div>
            <p className="mt-1 text-sm text-neutral-500">
              {t('palki.kmToGo', { km: Math.round(totalKm - (view.sKm ?? 0)) })}
            </p>
          </div>
        )}

        {/* --- Age and uncertainty, always, on every state. --- */}
        {view.freshness !== 'expired' && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
            <span>{t('palki.lastSynced', { time: formatClock(packet.current.observedAt) })}</span>
            {view.freshness !== 'live' && (
              <span className="font-semibold text-amber-700">
                {t('palki.plusMinus', { km: view.sigmaKm.toFixed(1) })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* --- Upcoming landmarks with ETAs. --- */}
      {view.freshness !== 'expired' && packet.landmarks.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <ol className="space-y-1">
            {packet.landmarks.slice(0, 4).map((l) => (
              <li
                key={l.name}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm"
              >
                <span className="font-medium text-neutral-700">{placeName(l)}</span>
                <span
                  className={`tabular-nums ${l.beyondForecast ? 'text-neutral-500' : 'text-neutral-800'}`}
                >
                  {l.eta ? `${l.beyondForecast ? '~' : ''}${formatClock(l.eta)}` : '—'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
