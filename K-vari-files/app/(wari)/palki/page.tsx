'use client';

/**
 * "Where is the Palki?" — the pilgrim-facing screen.
 *
 * Order of the page is deliberate and matches what a walking pilgrim
 * actually needs: the next landmark and a time first, then how far the Palki
 * is from THEM, and only then a map. Coordinates never appear.
 */

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { useLang } from '@/lib/i18n/context';
import { useOnline } from '@/lib/use-online';
import { usePacket, usePalkiRoute } from '@/lib/palki/use-packet';
import { clockFor, formatAge, nextLandmark, viewFor } from '@/lib/palki/client';
import { formatDistance, formatEta } from '@/lib/chainage';
import { PalkiStatusCard } from '@/components/PalkiStatusCard';
import { LangToggle } from '@/components/LangToggle';
import { useAirplaneMode } from '@/lib/palki/airplane';

const PalkiMap = dynamic(() => import('@/components/PalkiMap').then((m) => m.PalkiMap), {
  ssr: false,
  loading: () => <div className="animate-pulse rounded-2xl bg-neutral-100" style={{ height: 320 }} />,
});

export default function PalkiPage() {
  const { t, lang } = useLang();
  const online = useOnline();
  const [airplane] = useAirplaneMode();
  const { packet, fetchedAt, loading, refreshing, staleError } = usePacket(airplane);
  const { routePos, route } = useApp();

  // Recompute the interpolated position on a ticking clock, not just when a
  // new packet arrives — the whole point is that the phone keeps producing a
  // moving answer from a static timeline while offline.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  const now = useMemo(
    () => (packet ? clockFor(packet, fetchedAt) : new Date()),
    // `tick` is the dependency that actually matters: it re-derives "now"
    // every 15s so the position keeps moving while offline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [packet, fetchedAt, tick],
  );

  const coordinates = usePalkiRoute(packet?.routeVersion ?? null);
  const view = packet ? viewFor(packet, now) : null;
  const next = packet && view ? nextLandmark(packet, view.sKm) : null;

  // Bracketing landmark names for the "somewhere between X and Y" state.
  const segmentNames = useMemo(() => {
    if (!packet || !view?.segment) return null;
    const all = packet.landmarks;
    const before = [...all].reverse().find((l) => l.s_km <= view.segment!.fromKm);
    const after = all.find((l) => l.s_km >= view.segment!.toKm);
    const name = (l: { name: string; name_mr: string } | undefined) =>
      l ? (lang === 'en' ? l.name : l.name_mr) : null;
    const from = name(before);
    const to = name(after);
    return from && to ? { from, to } : null;
  }, [packet, view, lang]);

  /**
   * Distance from the pilgrim to the Palki, computed here on the device.
   * Their position is never sent anywhere — the server has no idea where any
   * individual pilgrim is, and does not need to.
   */
  const relative = useMemo(() => {
    if (!routePos || !view?.sKm) return null;
    const deltaKm = view.sKm - routePos.chainageKm;
    return { deltaKm, ahead: deltaKm >= 0 };
  }, [routePos, view]);

  const totalKm = route?.totalKm ?? 285.574;

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6 pt-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-800">{t('palki.title')}</h1>
        <div className="flex items-center gap-2">
          {refreshing && <span className="text-sm text-neutral-600">{t('palki.refreshing')}</span>}
          <LangToggle />
        </div>
      </header>

      {(!online || airplane) && (
        // Amber, not red. Being offline on the Wari is expected, not a fault.
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ✈️ {t('palki.offline')}
        </div>
      )}

      {loading && !packet && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">
          {t('common.loading')}
        </div>
      )}

      {!loading && !packet && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          {t('palki.noData')}
          {staleError && <p className="mt-2 text-sm text-neutral-600">{staleError}</p>}
        </div>
      )}

      {packet && view && (
        <>
          <PalkiStatusCard
            packet={packet}
            view={view}
            next={next}
            segmentNames={segmentNames}
            totalKm={totalKm}
          />

          {/* --- Distance from the pilgrim, computed on-device. --- */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            {relative ? (
              <div className="text-center">
                <p className="text-sm text-neutral-500">{t('palki.yourDistance')}</p>
                <p className="mt-1 text-2xl font-bold text-neutral-800">
                  {formatDistance(Math.abs(relative.deltaKm))}{' '}
                  <span className="text-base font-medium text-neutral-500">
                    {relative.ahead ? t('palki.ahead') : t('palki.behind')}
                  </span>
                </p>
                {relative.ahead && (
                  <p className="mt-1 text-sm text-neutral-500">
                    🚶 {formatEta(Math.abs(relative.deltaKm))}
                  </p>
                )}
                <p className="mt-2 text-sm text-neutral-600">🔒 {t('palki.privacy')}</p>
              </div>
            ) : (
              <p className="text-center text-sm text-neutral-500">{t('palki.needLocation')}</p>
            )}
          </div>

          {coordinates && <PalkiMap coordinates={coordinates} view={view} you={null} />}

          <p className="text-center text-sm text-neutral-600">
            {t('palki.age', { age: formatAge(view.observationAgeMs) })}
          </p>
        </>
      )}
    </div>
  );
}
