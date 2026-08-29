'use client';

/**
 * Debug-only: watches raw GPS fixes independently of the app's shared
 * LocationTracker, so /test can show "raw" next to "smoothed" without
 * reaching into LocationTracker internals (it doesn't expose pre-smoothing
 * fixes on its public update callback).
 */

import { useEffect, useState } from 'react';
import { toFix } from './geolocation';
import type { LocationFix } from './types';

/**
 * `enabled` exists because of the simulator. installSimGeolocation swaps
 * `navigator.geolocation` out from under the page, but only once route.json
 * has loaded — and this hook's effect would otherwise run first, capturing
 * the real (in sim mode, unwanted) geolocation object and showing a
 * permission error next to perfectly good simulated fixes. Callers pass a
 * flag that is false until the app has settled which geolocation is in play.
 */
export function useRawFix(enabled = true): { raw: LocationFix | null; error: string | null } {
  const [raw, setRaw] = useState<LocationFix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation not available');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setRaw(toFix(p));
        setError(null);
      },
      (err) => setError(err.message || `error code ${err.code}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return { raw, error };
}
