/**
 * Location accuracy stack.
 *
 * The GPS chip is what it is (±5–20 m outdoors on a mid-range Android).
 * We cannot beat it, so accuracy comes from what we do with the fixes:
 *
 *   1. reject bad fixes outright
 *   2. reject physically impossible jumps
 *   3. smooth what survives, weighted by reported accuracy
 *   4. snap to the route line — we know they are on a road
 */

import type { LocationFix, RoutePosition } from './types';
import type { RouteIndex } from './chainage';

/** Fixes worse than this are discarded entirely. */
const MAX_ACCURACY_M = 50;

/** A pilgrim cannot outrun this. Used to reject teleport fixes. */
const MAX_PLAUSIBLE_SPEED_MS = 8;

/** Smoothing strength. Lower = smoother but laggier. */
const SMOOTHING_ALPHA = 0.35;

export interface TrackedPosition {
  fix: LocationFix;
  route: RoutePosition | null;
  /** How many raw fixes have been folded into this estimate. */
  sampleCount: number;
}

export class LocationTracker {
  private smoothed: LocationFix | null = null;
  private sampleCount = 0;
  private watchId: number | null = null;
  private readonly route: RouteIndex | null;

  constructor(route: RouteIndex | null = null) {
    this.route = route;
  }

  /**
   * Fold a raw fix into the running estimate.
   * Returns null when the fix was rejected.
   */
  accept(raw: LocationFix): TrackedPosition | null {
    if (!Number.isFinite(raw.lat) || !Number.isFinite(raw.lng)) return null;
    if (raw.accuracy > MAX_ACCURACY_M) return null;

    if (this.smoothed) {
      const dtSec = Math.max(1, (raw.timestamp - this.smoothed.timestamp) / 1000);
      const jumpM = haversineMeters(this.smoothed, raw);

      // Allow the jump if the accuracy circles overlap enough to explain it.
      const tolerance = raw.accuracy + this.smoothed.accuracy;
      if (jumpM - tolerance > MAX_PLAUSIBLE_SPEED_MS * dtSec) return null;

      // Weight the new fix by how much better its accuracy is. A 5 m fix
      // should move the estimate much more than a 45 m fix.
      const weight =
        SMOOTHING_ALPHA *
        (this.smoothed.accuracy / (this.smoothed.accuracy + raw.accuracy));

      this.smoothed = {
        lat: this.smoothed.lat + (raw.lat - this.smoothed.lat) * weight,
        lng: this.smoothed.lng + (raw.lng - this.smoothed.lng) * weight,
        accuracy: Math.min(this.smoothed.accuracy, raw.accuracy),
        timestamp: raw.timestamp,
        speed: raw.speed,
        heading: raw.heading,
      };
    } else {
      this.smoothed = { ...raw };
    }

    this.sampleCount += 1;

    return {
      fix: this.smoothed,
      route: this.route
        ? this.route.locate(this.smoothed.lat, this.smoothed.lng)
        : null,
      sampleCount: this.sampleCount,
    };
  }

  /**
   * Start watching. `onReject` fires for discarded fixes so the UI can show
   * "waiting for a better signal" instead of silently freezing.
   */
  start(
    onUpdate: (pos: TrackedPosition) => void,
    onError?: (err: GeolocationPositionError) => void,
    onReject?: (raw: LocationFix) => void,
  ): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation is not available in this browser');
    }
    if (this.watchId !== null) return;

    this.watchId = navigator.geolocation.watchPosition(
      (p) => {
        const raw = toFix(p);
        const next = this.accept(raw);
        if (next) onUpdate(next);
        else onReject?.(raw);
      },
      (err) => onError?.(err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }

  stop(): void {
    if (this.watchId !== null && navigator?.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  reset(): void {
    this.smoothed = null;
    this.sampleCount = 0;
  }
}

export interface StableFixOptions {
  samples?: number;
  timeoutMs?: number;
  requiredAccuracyM?: number;
  onProgress?: (collected: number, target: number, best: number) => void;
}

/**
 * Collect several fixes and return the median position.
 *
 * Used when a camp admin drops their pin. A single fix routinely lands a
 * health camp 40 m into an adjacent field, and unlike a moving pilgrim this
 * error is permanent — every pilgrim who navigates there inherits it.
 */
export function sampleStablePosition(
  opts: StableFixOptions = {},
): Promise<LocationFix> {
  const {
    samples = 10,
    timeoutMs = 25000,
    requiredAccuracyM = 25,
    onProgress,
  } = opts;

  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser'));
      return;
    }

    const collected: LocationFix[] = [];
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);

      if (collected.length === 0) {
        reject(new Error('Could not get an accurate fix. Move to open sky and retry.'));
        return;
      }
      resolve(medianFix(collected));
    };

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const fix = toFix(p);
        if (fix.accuracy <= requiredAccuracyM) collected.push(fix);
        const best = collected.length
          ? Math.min(...collected.map((f) => f.accuracy))
          : fix.accuracy;
        onProgress?.(collected.length, samples, best);
        if (collected.length >= samples) finish();
      },
      () => finish(),
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );

    const timer = setTimeout(finish, timeoutMs);
  });
}

/**
 * Median of each coordinate independently. Median rather than mean because
 * one wild outlier should not drag the pin, and with n≈10 a single bad fix
 * would shift a mean by metres.
 */
function medianFix(fixes: LocationFix[]): LocationFix {
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  return {
    lat: med(fixes.map((f) => f.lat)),
    lng: med(fixes.map((f) => f.lng)),
    accuracy: med(fixes.map((f) => f.accuracy)),
    timestamp: Date.now(),
    speed: null,
    heading: null,
  };
}

export function toFix(p: GeolocationPosition): LocationFix {
  return {
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    accuracy: p.coords.accuracy,
    timestamp: p.timestamp,
    speed: p.coords.speed,
    heading: p.coords.heading,
  };
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
