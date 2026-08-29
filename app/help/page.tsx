'use client';

/**
 * M3 — "Where can I get help?" The SOS / nearby-facility finder.
 *
 * Three states on one page, no extra routes needed:
 *   categories -> a ranked list for the tapped category -> a detail view.
 * The SOS button skips straight from categories to detail, using
 * findNearestEmergency() instead of findNearestAhead() — in an emergency,
 * direction of travel stops mattering, so the search widens instead of
 * biasing "ahead" (see lib/chainage.ts).
 */

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { useFacilities } from '@/lib/facilities-data';
import { useLang } from '@/lib/i18n/context';
import { findNearestAhead, findNearestEmergency } from '@/lib/chainage';
import { KIND_GROUPS } from '@/lib/types';
import { FacilityCard } from '@/components/FacilityCard';
import { FacilityDetail } from '@/components/FacilityDetail';
import type { NearestResult } from '@/lib/types';

type Category = keyof typeof KIND_GROUPS;

const CATEGORY_ICON: Record<Category, string> = {
  medical: '⚕️',
  food: '🍲',
  rest: '🪑',
  stay: '🏨',
};

export default function HelpPage() {
  const { t, lang } = useLang();
  const { route, routePos, fix } = useApp();
  const { facilities, loading, error, cachedAt } = useFacilities();

  const [category, setCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<NearestResult | null>(null);

  const chainageKm = routePos?.chainageKm ?? null;

  const list = useMemo<NearestResult[]>(() => {
    if (!category || chainageKm === null) return [];
    return findNearestAhead(facilities, chainageKm, KIND_GROUPS[category]);
  }, [category, chainageKm, facilities]);

  function handleSos() {
    if (chainageKm === null) return;
    const results = findNearestEmergency(facilities, chainageKm, KIND_GROUPS.medical, 1);
    if (results[0]) setSelected(results[0]);
  }

  const you = fix ? { lat: fix.lat, lng: fix.lng } : null;
  const routeCoordinates = route?.bundle.coordinates ?? [];

  // --- Detail view ---
  if (selected) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 pb-6 pt-4">
        <FacilityDetail
          facility={selected}
          routeCoordinates={routeCoordinates}
          you={you}
          onBack={() => setSelected(null)}
        />
      </div>
    );
  }

  // --- List view ---
  if (category) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-4 pb-6 pt-4">
        <button
          onClick={() => setCategory(null)}
          className="tap-target text-sm font-semibold text-neutral-500"
        >
          ← {t('nearby.back')}
        </button>
        <h1 className="text-2xl font-bold text-neutral-900">
          {CATEGORY_ICON[category]} {t(`nearby.category.${category}`)}
        </h1>

        {chainageKm === null ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">
            {t('nearby.needLocation')}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">
            {t('nearby.empty')}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((f) => (
              <FacilityCard key={f.id} facility={f} onSelect={() => setSelected(f)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Categories view ---
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6 pt-4">
      <h1 className="text-2xl font-bold text-neutral-900">{t('nearby.title')}</h1>

      {error && !facilities.length && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {t('nearby.offline')}
        </div>
      )}

      <button
        onClick={handleSos}
        disabled={chainageKm === null}
        className="tap-target w-full rounded-2xl bg-red-600 py-7 text-2xl font-bold text-white shadow-md active:bg-red-700 disabled:opacity-60"
      >
        🆘 {t('nearby.sos')}
      </button>
      <p className="text-center text-sm text-neutral-600">{t('nearby.sosSubtitle')}</p>

      <div className="grid grid-cols-2 gap-3 pt-2">
        {(Object.keys(KIND_GROUPS) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="tap-target flex flex-col items-center justify-center gap-1 rounded-2xl border border-neutral-200 bg-white py-6 shadow-sm active:bg-neutral-50"
          >
            <span className="text-3xl">{CATEGORY_ICON[cat]}</span>
            <span className="text-lg font-semibold text-neutral-800">
              {t(`nearby.category.${cat}`)}
            </span>
          </button>
        ))}
      </div>

      {!loading && cachedAt && (
        <p className="pt-2 text-center text-sm text-neutral-600">
          {facilities.length} {t('nearby.spotsLoaded')}
        </p>
      )}
    </div>
  );
}
