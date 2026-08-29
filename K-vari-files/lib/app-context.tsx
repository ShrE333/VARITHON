'use client';

/**
 * One shared LocationTracker + RouteIndex for the whole app, so GPS isn't
 * re-acquired (and smoothing state isn't reset) every time the pilgrim
 * switches between Home / Route / Help. Also owns route.json loading and,
 * in dev with ?sim=1, installs the walking simulator before GPS starts.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { RouteIndex } from './chainage';
import { LocationTracker, type TrackedPosition } from './geolocation';
import { installSimGeolocation, isSimActive } from './sim';
import { useRouteBundle } from './route-data';
import type { LocationFix } from './types';

export type GpsStatus = 'locating' | 'ok' | 'denied' | 'unavailable' | 'waiting' | 'stalled';

/**
 * If watchPosition hasn't called us back at all (success, error, or reject)
 * within this long, something's wrong that the browser isn't reporting —
 * WebKit (all iOS browsers) is known to sometimes just never fire either
 * callback for watchPosition instead of erroring with TIMEOUT. We can't fix
 * that in the browser, so we detect the silence ourselves and offer a retry.
 */
const STALL_TIMEOUT_MS = 20000;

interface AppState {
  route: RouteIndex | null;
  routeLoading: boolean;
  routeError: string | null;
  cachedAt: number | null;

  fix: LocationFix | null;
  routePos: TrackedPosition['route'];
  sampleCount: number;
  rejectedCount: number;
  /** Consecutive rejections since the last accepted fix — drives "waiting for signal". */
  rejectedStreak: number;
  gpsStatus: GpsStatus;

  simActive: boolean;
  /** Stop and restart the GPS watch — the only reliable recovery from a silent stall. */
  retryGps: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { bundle, cachedAt, loading: routeLoading, error: routeError } = useRouteBundle();

  const [route, setRoute] = useState<RouteIndex | null>(null);
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [routePos, setRoutePos] = useState<TrackedPosition['route']>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [rejectedStreak, setRejectedStreak] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('locating');
  const [retryTick, setRetryTick] = useState(0);

  const trackerRef = useRef<LocationTracker | null>(null);
  const simActiveRef = useRef(false);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeSigRef = useRef<string | null>(null);

  const retryGps = useCallback(() => {
    trackerRef.current?.stop();
    setFix(null);
    setRoutePos(null);
    setRejectedStreak(0);
    setGpsStatus('locating');
    setRetryTick((n) => n + 1);
  }, []);

  // Build the RouteIndex when route.json first arrives, and again only if a
  // materially different route replaces it.
  //
  // useRouteBundle emits twice on a normal load (Dexie cache, then the
  // network refresh), and rebuilding on every emission would restart GPS
  // and throw away the smoothing state for nothing. But a phone holding a
  // stale cached route after the route file is regenerated must not keep
  // using it for the whole session — every chainage would be measured
  // against the wrong line — so compare a signature and rebuild when the
  // geometry actually changes.
  useEffect(() => {
    if (!bundle) return;

    const sig = `${bundle.slug}|${bundle.totalKm}|${bundle.coordinates.length}`;
    if (routeSigRef.current === sig) return;
    routeSigRef.current = sig;

    setRoute(new RouteIndex(bundle));

    if (isSimActive()) {
      installSimGeolocation(bundle);
      simActiveRef.current = true;
    }
  }, [bundle]);

  // (Re)start the GPS watch whenever the route becomes available, and again
  // on every manual retry — this is the only effect retryGps() re-triggers.
  useEffect(() => {
    if (!route) return;

    const tracker = new LocationTracker(route);
    trackerRef.current = tracker;

    const clearStallTimer = () => {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };

    stallTimerRef.current = setTimeout(() => {
      setGpsStatus((s) => (s === 'locating' ? 'stalled' : s));
    }, STALL_TIMEOUT_MS);

    try {
      tracker.start(
        (pos) => {
          clearStallTimer();
          setFix(pos.fix);
          setRoutePos(pos.route);
          setSampleCount(pos.sampleCount);
          setRejectedStreak(0);
          setGpsStatus('ok');
        },
        (err) => {
          clearStallTimer();
          if (err.code === err.PERMISSION_DENIED) setGpsStatus('denied');
          else setGpsStatus('unavailable');
        },
        () => {
          clearStallTimer();
          setRejectedCount((n) => n + 1);
          setRejectedStreak((n) => {
            const next = n + 1;
            if (next >= 3) setGpsStatus('waiting');
            return next;
          });
        },
      );
    } catch {
      clearStallTimer();
      setGpsStatus('unavailable');
    }

    return () => {
      clearStallTimer();
      tracker.stop();
    };
  }, [route, retryTick]);

  const value: AppState = {
    route,
    routeLoading,
    routeError,
    cachedAt,
    fix,
    routePos,
    sampleCount,
    rejectedCount,
    rejectedStreak,
    gpsStatus,
    simActive: simActiveRef.current,
    retryGps,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
