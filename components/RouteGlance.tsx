'use client';

/**
 * The route, on the home screen.
 *
 * M2 lives at /route and shows the whole 15-day schedule. But the first
 * question a pilgrim actually has after "how far to Pandharpur" is "where am
 * I on the line, and which stage is today" — and making them find a tab for
 * that is a tab too many for the audience this app is for.
 *
 * So this is the glance version: a short map, today's stage, and how far
 * through it they are. The full schedule stays one tap away.
 *
 * Leaflet is dynamic-imported here exactly as it is on /route, so it stays
 * out of the server bundle and out of the initial JS payload — the home
 * screen renders its distance number first and the map fills in after.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { RouteIndex } from '@/lib/chainage';
import { formatDistance } from '@/lib/chainage';
import type { LocationFix, RoutePosition, RouteStage } from '@/lib/types';
import { useLang } from '@/lib/i18n/context';

/** route.json carries Marathi place names alongside the English ones. */
type LocalisedStage = RouteStage & { fromPlaceMr?: string; toPlaceMr?: string };

const MAP_HEIGHT = 260;

const RouteMap = dynamic(() => import('@/components/RouteMap').then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl bg-neutral-100 animate-pulse"
      style={{ height: MAP_HEIGHT }}
      aria-hidden
    />
  ),
});

interface Props {
  route: RouteIndex;
  fix: LocationFix | null;
  routePos: RoutePosition | null;
}

export function RouteGlance({ route, fix, routePos }: Props) {
  const { t, lang } = useLang();

  const stages = route.bundle.stages as LocalisedStage[];
  const stage = routePos ? (route.stageAt(routePos.chainageKm) as LocalisedStage | null) : null;

  const names = (s: LocalisedStage) =>
    lang === 'mr'
      ? { from: s.fromPlaceMr ?? s.fromPlace, to: s.toPlaceMr ?? s.toPlace }
      : { from: s.fromPlace, to: s.toPlace };

  // How far through today's stage they are. Guard the zero-length stage that
  // a hand-edited route.json could produce rather than dividing by it.
  const span = stage ? stage.endKm - stage.startKm : 0;
  const throughKm = stage && routePos ? routePos.chainageKm - stage.startKm : 0;
  const pct = span > 0 ? Math.min(100, Math.max(0, (throughKm / span) * 100)) : 0;

  return (
    <section className="space-y-3" aria-labelledby="route-glance-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="route-glance-heading" className="text-xl font-bold text-neutral-800">
          {t('home.routeTitle')}
        </h2>
        <span className="text-base text-neutral-500">{t('home.mapHint')}</span>
      </div>

      <RouteMap route={route} fix={fix} routePos={routePos} height={MAP_HEIGHT} />

      <div className="rounded-2xl bg-white border-2 border-neutral-200 p-4">
        {stage ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0 bg-saffron-600 text-white">
                {stage.dayNumber}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-neutral-800 truncate">
                  {names(stage).from} → {names(stage).to}
                </p>
                <p className="text-base text-neutral-500">
                  {t('home.stageOf', { n: stage.dayNumber, total: stages.length })}
                </p>
              </div>
            </div>

            <div
              className="h-3 rounded-full bg-neutral-200 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${names(stage).from} → ${names(stage).to}`}
            >
              <div className="h-full bg-saffron-600" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-base text-neutral-600">
              {formatDistance(Math.max(0, throughKm))} / {formatDistance(span)}
            </p>
          </>
        ) : (
          <p className="text-base text-neutral-500">{t('schedule.notLocated')}</p>
        )}

        <Link
          href="/route"
          className="mt-3 tap-target w-full rounded-xl bg-neutral-100 text-neutral-800 font-semibold text-lg flex items-center justify-center gap-2 active:bg-neutral-200"
        >
          🗺️ {t('home.fullRoute')}
        </Link>
      </div>
    </section>
  );
}
