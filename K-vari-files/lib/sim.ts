'use client';

/**
 * Dev-only walking simulator for THE PILGRIM'S OWN GPS, toggled with ?sim=1.
 *
 * Not to be confused with sim/simulator.mjs, which simulates the Palki and
 * runs as a separate process talking to the ingest API. This one exists so a
 * developer can see M1/M2 behave without walking 285 km, and it works by
 * replacing `navigator.geolocation` with a fake that replays a track along
 * the route at a fixed pace, jittered to look like real GPS noise.
 * LocationTracker and sampleStablePosition are untouched — they just call
 * the standard browser API and receive simulated fixes.
 */

import { RouteGeometry } from './palki/geometry.ts';
import type { RouteBundle } from './types';

let installed = false;

export function isSimActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV !== 'development') return false;
  return new URLSearchParams(window.location.search).get('sim') === '1';
}

/** Installs the fake geolocation object. Safe to call more than once. */
export function installSimGeolocation(bundle: RouteBundle, paceKmh = 3, startKm = 0): void {
  if (installed || typeof navigator === 'undefined') return;
  installed = true;

  const geometry = new RouteGeometry(bundle.coordinates);
  const totalKm = geometry.totalKm;
  const startedAt = Date.now();

  function currentKm(): number {
    const elapsedHours = (Date.now() - startedAt) / 3_600_000;
    return Math.min(totalKm, startKm + elapsedHours * paceKmh);
  }

  function jitter(): number {
    // ~±6 m in degrees, to look like real GPS noise rather than a laser-straight walk.
    return (Math.random() - 0.5) * 0.00006;
  }

  function fakePosition(): GeolocationPosition {
    const { lat, lng } = geometry.positionAt(currentKm());
    const coordsOut: GeolocationCoordinates = {
      latitude: lat + jitter(),
      longitude: lng + jitter(),
      accuracy: 8 + Math.random() * 6,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: paceKmh / 3.6,
      toJSON() {
        return this;
      },
    };
    return {
      coords: coordsOut,
      timestamp: Date.now(),
      toJSON() {
        return this;
      },
    };
  }

  let nextWatchId = 1;
  const intervals = new Map<number, ReturnType<typeof setInterval>>();

  const fakeGeolocation: Geolocation = {
    getCurrentPosition(success) {
      success(fakePosition());
    },
    watchPosition(success) {
      const id = nextWatchId++;
      intervals.set(id, setInterval(() => success(fakePosition()), 2000));
      success(fakePosition());
      return id;
    },
    clearWatch(id) {
      const h = intervals.get(id);
      if (h) clearInterval(h);
      intervals.delete(id);
    },
  };

  Object.defineProperty(navigator, 'geolocation', {
    value: fakeGeolocation,
    configurable: true,
  });
}
