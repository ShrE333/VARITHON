'use client';

/**
 * Fetch, cache and refresh the forecast packet.
 *
 * Cache first, always. The packet is read from IndexedDB and rendered before
 * any network call is attempted, because the pilgrim this is built for is
 * frequently standing in a dead zone and a spinner is worse than a slightly
 * old answer that says how old it is.
 *
 * Refreshes on: mount, regaining connectivity, and every ten minutes while
 * the tab is visible.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadLatestPacket, savePacket } from '../db';
import { ROUTE_SLUG } from '../env';
import type { Packet } from './types';

const REFRESH_MS = 10 * 60_000;

export interface PacketState {
  packet: Packet | null;
  /** When this packet was fetched, for "last synced" independent of its content. */
  fetchedAt: number | null;
  loading: boolean;
  /** True while a refresh is in flight, so the UI can show a subtle spinner. */
  refreshing: boolean;
  /** Last refresh failed — not fatal, we are still showing the cached one. */
  staleError: string | null;
  refresh: () => void;
}

/**
 * `airplaneMode` short-circuits the network without touching the device's
 * real connectivity, which a web page cannot do. The demo needs a one-click
 * way to show the offline behaviour; fumbling through phone settings in
 * front of judges is how a demo dies.
 */
export function usePacket(airplaneMode = false): PacketState {
  const [packet, setPacket] = useState<Packet | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staleError, setStaleError] = useState<string | null>(null);

  const airplaneRef = useRef(airplaneMode);
  airplaneRef.current = airplaneMode;

  const refresh = useCallback(async () => {
    if (airplaneRef.current) {
      setStaleError('airplane mode');
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch('/api/v1/palki/packet', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh = (await res.json()) as Packet;
      if (fresh.schema !== 1) throw new Error('unknown packet schema');

      setPacket(fresh);
      setFetchedAt(Date.now());
      setStaleError(null);
      await savePacket(ROUTE_SLUG, fresh);
    } catch (err) {
      // Deliberately non-fatal: keep showing whatever we already have.
      setStaleError(err instanceof Error ? err.message : 'refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 1. Cache first.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadLatestPacket(ROUTE_SLUG);
      if (cached && !cancelled) {
        setPacket(cached.packet);
        setFetchedAt(cached.fetchedAt);
      }
      if (!cancelled) setLoading(false);
      if (!cancelled) refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // 2. Refresh on reconnect and on a timer while visible.
  useEffect(() => {
    const onOnline = () => refresh();
    window.addEventListener('online', onOnline);

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, REFRESH_MS);

    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(timer);
    };
  }, [refresh]);

  return { packet, fetchedAt, loading, refreshing, staleError, refresh };
}

/**
 * The route polyline, cached immutably by version.
 *
 * Fetched from the versioned endpoint rather than the static file so the
 * client honours the same cache contract the API advertises, and so a
 * version bump forces a re-download rather than silently mixing a new
 * timeline with old geometry.
 */
export function usePalkiRoute(version: number | null) {
  const [coordinates, setCoordinates] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (version === null) return;
    let cancelled = false;

    (async () => {
      const { loadRouteGeometry, saveRouteGeometry } = await import('../db');
      const cached = await loadRouteGeometry<{ coordinates: [number, number][] }>(version);
      if (cached && !cancelled) setCoordinates(cached.coordinates);
      if (cached) return; // immutable: never refetch a version we already hold

      try {
        const res = await fetch(`/api/v1/palki/route/${version}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCoordinates(data.coordinates);
        await saveRouteGeometry(version, { coordinates: data.coordinates });
      } catch {
        // Offline with no cached geometry: the text view still works.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  return coordinates;
}
