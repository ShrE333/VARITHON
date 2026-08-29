'use client';

/**
 * Loads facilities Dexie-first (instant, works offline), then refreshes from
 * Supabase in the background and updates the cache — the same
 * stale-while-revalidate shape as lib/route-data.ts's useRouteBundle(), just
 * reading from a live table instead of a static file.
 *
 * Reads go straight from the browser to Supabase using the public anon
 * client (lib/supabase.ts) — no API route needed for this direction. RLS
 * (facilities_public_read / the facilities_public view, see db/schema.sql)
 * is what makes that safe: only approved rows are ever visible to it.
 */

import { useEffect, useState } from 'react';
import { db } from './db';
import { supabase } from './supabase';
import { ROUTE_SLUG } from './env';
import type { CachedFacility } from './db';
import type { Facility } from './types';

function normalizeFacility(row: any): CachedFacility {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    chainageKm: Number(row.chainage_km),
    offsetM: Number(row.offset_m),
    status: row.status,
    contactPhone: row.contact_phone ?? undefined,
    capacity: row.capacity ?? undefined,
    amenities: row.amenities ?? undefined,
    source: row.source,
    cachedAt: Date.now(),
  };
}

let cachedRouteId: string | null = null;

async function lookupRouteId(): Promise<string | null> {
  if (cachedRouteId) return cachedRouteId;
  if (!supabase) return null;
  const { data } = await supabase.from('routes').select('id').eq('slug', ROUTE_SLUG).maybeSingle();
  cachedRouteId = data?.id ?? null;
  return cachedRouteId;
}

export interface FacilitiesState {
  facilities: Facility[];
  loading: boolean;
  error: string | null;
  /** When the currently-shown data was last fetched, for an offline badge. */
  cachedAt: number | null;
  refresh: () => void;
}

export function useFacilities(): FacilitiesState {
  const [state, setState] = useState<Omit<FacilitiesState, 'refresh'>>({
    facilities: [],
    loading: true,
    error: null,
    cachedAt: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Dexie first.
      if (db) {
        const cached = await db.facilities.toArray();
        if (cached.length && !cancelled) {
          setState({
            facilities: cached,
            loading: false,
            error: null,
            cachedAt: Math.max(...cached.map((f) => f.cachedAt)),
          });
        }
      }

      // 2. Network refresh in the background.
      if (!supabase) {
        setState((s) => (s.facilities.length ? { ...s, loading: false } : { ...s, loading: false, error: 'offline' }));
        return;
      }

      try {
        const routeId = await lookupRouteId();
        if (!routeId) throw new Error('route not seeded yet');

        const { data, error } = await supabase
          .from('facilities_public')
          .select('*')
          .eq('route_id', routeId);
        if (error) throw error;

        const facilities = (data ?? []).map(normalizeFacility);
        if (db && facilities.length) {
          await db.facilities.clear();
          await db.facilities.bulkPut(facilities);
        }
        if (!cancelled) {
          setState({ facilities, loading: false, error: null, cachedAt: Date.now() });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) =>
            s.facilities.length
              ? { ...s, loading: false }
              : { ...s, loading: false, error: err instanceof Error ? err.message : 'facilities unavailable' },
          );
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { ...state, refresh: () => setTick((n) => n + 1) };
}
