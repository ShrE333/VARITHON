'use client';

/**
 * Loads route.json Dexie-first (instant, works offline), then refetches over
 * the network in the background and updates the cache — classic
 * stale-while-revalidate, but at the app-data layer rather than just HTTP,
 * so the RouteIndex is available even before the service worker has ever
 * seen the request.
 */

import { useEffect, useState } from 'react';
import { db } from './db';
import type { RouteBundle } from './types';
import { ROUTE_SLUG } from './env';

const ROUTE_URL = '/data/route.json';

/** The prep script doesn't emit `id`/`name` — fill them in so the shared type is satisfied. */
function normalizeBundle(raw: any, slug: string): RouteBundle {
  return {
    id: raw.id ?? slug,
    name: raw.name ?? `${raw.startName} → ${raw.endName}`,
    slug: raw.slug ?? slug,
    coordinates: raw.coordinates,
    totalKm: raw.totalKm,
    startName: raw.startName,
    endName: raw.endName,
    destination: raw.destination,
    stages: raw.stages ?? [],
  };
}

export interface RouteBundleState {
  bundle: RouteBundle | null;
  /** When the bundle currently in use was cached, for the offline banner. */
  cachedAt: number | null;
  loading: boolean;
  error: string | null;
}

export function useRouteBundle(): RouteBundleState {
  const [state, setState] = useState<RouteBundleState>({
    bundle: null,
    cachedAt: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Dexie first — instant, works with the network off.
      if (db) {
        const cached = await db.routeBundles.get(ROUTE_SLUG);
        if (cached && !cancelled) {
          setState({ bundle: cached.bundle, cachedAt: cached.cachedAt, loading: false, error: null });
        }
      }

      // 2. Network refresh in the background. Never blocks the UI above.
      try {
        const res = await fetch(ROUTE_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${res.status}`);
        const raw = await res.json();
        const bundle = normalizeBundle(raw, ROUTE_SLUG);
        const cachedAt = Date.now();

        if (db) await db.routeBundles.put({ slug: ROUTE_SLUG, bundle, cachedAt });
        if (!cancelled) setState({ bundle, cachedAt, loading: false, error: null });
      } catch (err) {
        if (!cancelled) {
          setState((s) =>
            s.bundle
              ? { ...s, loading: false }
              : { bundle: null, cachedAt: null, loading: false, error: 'route data unavailable' },
          );
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
