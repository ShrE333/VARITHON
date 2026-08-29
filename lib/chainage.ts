/**
 * Chainage engine.
 *
 * Every location question in this app reduces to one number: how far along
 * the route you are. Once the pilgrim and every facility have a km position,
 * distance and nearest-ahead become arithmetic instead of routing calls.
 *
 * Runs entirely client-side so it works with no network.
 */

import nearestPointOnLine from '@turf/nearest-point-on-line';
import distance from '@turf/distance';
import { lineString, point } from '@turf/helpers';
import type { Feature, LineString } from 'geojson';
import type {
  Facility,
  FacilityKind,
  NearestResult,
  RouteBundle,
  RoutePosition,
  RouteStage,
} from './types';

/** Beyond this the pilgrim is treated as off-route and chainage is unreliable. */
const ON_ROUTE_THRESHOLD_M = 1500;

/** Wari walking pace including ringan and rest stops. */
export const DEFAULT_PACE_KMH = 3.0;

export class RouteIndex {
  readonly bundle: RouteBundle;
  private readonly line: Feature<LineString>;

  constructor(bundle: RouteBundle) {
    if (bundle.coordinates.length < 2) {
      throw new Error('route needs at least two coordinates');
    }
    this.bundle = bundle;
    this.line = lineString(bundle.coordinates);
  }

  get totalKm(): number {
    return this.bundle.totalKm;
  }

  /**
   * Project a raw lat/lng onto the route.
   *
   * Turf gives us both numbers in one pass: `location` is the distance along
   * the line to the nearest point (that is the chainage), and `dist` is the
   * perpendicular offset.
   */
  locate(lat: number, lng: number): RoutePosition {
    const snap = nearestPointOnLine(this.line, point([lng, lat]), {
      units: 'kilometers',
    });

    const chainageKm = snap.properties.location ?? 0;
    const offsetM = (snap.properties.dist ?? 0) * 1000;
    const [snapLng, snapLat] = snap.geometry.coordinates;

    return {
      chainageKm,
      offsetM,
      onRoute: offsetM <= ON_ROUTE_THRESHOLD_M,
      snapped: { lat: snapLat, lng: snapLng },
    };
  }

  /**
   * Distance to the Pandharpur temple.
   *
   * On-route: remaining chainage, which follows the actual road.
   * Off-route: the walk to rejoin the route, plus the remaining chainage.
   * `directKm` is always the straight line, shown as a secondary figure.
   */
  distanceToTemple(lat: number, lng: number) {
    const pos = this.locate(lat, lng);
    const dest = this.bundle.destination;

    const directKm = distance(
      point([lng, lat]),
      point([dest.lng, dest.lat]),
      { units: 'kilometers' },
    );

    const remainingKm = Math.max(0, this.totalKm - pos.chainageKm);
    const joinKm = pos.onRoute ? 0 : pos.offsetM / 1000;

    return {
      position: pos,
      /** Best estimate of walking distance. */
      routeKm: remainingKm + joinKm,
      remainingKm,
      joinKm,
      directKm,
      onRoute: pos.onRoute,
    };
  }

  /** Which stage of the yatra a given chainage falls in. */
  stageAt(chainageKm: number): RouteStage | null {
    return (
      this.bundle.stages.find(
        (s) => chainageKm >= s.startKm && chainageKm < s.endKm,
      ) ?? null
    );
  }

  /** Stages still to come, for the "how long will it take" view. */
  remainingStages(chainageKm: number): RouteStage[] {
    return this.bundle.stages.filter((s) => s.endKm > chainageKm);
  }
}

export interface NearestOptions {
  /** How many results to return. */
  limit?: number;
  /**
   * Also include facilities slightly behind the pilgrim. Someone who has
   * just walked past a health camp should still be shown it.
   */
  lookbackKm?: number;
  /** Ignore anything further than this from the road. */
  maxOffsetM?: number;
  /** Exclude facilities marked closed. */
  excludeClosed?: boolean;
  paceKmh?: number;
}

/**
 * Nearest facilities ahead of the pilgrim, of the given kinds.
 *
 * This is the whole point of the chainage model. A hospital 400 m away as
 * the crow flies but 6 km back down the road is not useful to someone
 * walking forward in a crowd of thousands, and a naive radius search would
 * rank it first.
 */
export function findNearestAhead(
  facilities: Facility[],
  chainageKm: number,
  kinds: FacilityKind[],
  opts: NearestOptions = {},
): NearestResult[] {
  const {
    limit = 5,
    lookbackKm = 2,
    maxOffsetM = 3000,
    excludeClosed = true,
    paceKmh = DEFAULT_PACE_KMH,
  } = opts;

  const kindSet = new Set(kinds);

  return facilities
    .filter((f) => kindSet.has(f.kind))
    .filter((f) => !excludeClosed || f.status !== 'closed')
    .filter((f) => f.offsetM <= maxOffsetM)
    .filter((f) => f.chainageKm >= chainageKm - lookbackKm)
    .map((f) => {
      const alongKm = f.chainageKm - chainageKm;
      const totalWalkKm = Math.abs(alongKm) + f.offsetM / 1000;
      return {
        ...f,
        alongKm,
        totalWalkKm,
        etaMinutes: Math.round((totalWalkKm / paceKmh) * 60),
        isAhead: alongKm >= 0,
      };
    })
    .sort((a, b) => {
      // Ahead always beats behind, then sort by walking distance.
      if (a.isAhead !== b.isAhead) return a.isAhead ? -1 : 1;
      return a.totalWalkKm - b.totalWalkKm;
    })
    .slice(0, limit);
}

/**
 * Emergency variant, for the medical button.
 *
 * When someone needs help now, direction of travel stops mattering — we want
 * the closest reachable facility, full stop. Widen the corridor and drop the
 * ahead-first bias.
 */
export function findNearestEmergency(
  facilities: Facility[],
  chainageKm: number,
  kinds: FacilityKind[],
  limit = 5,
): NearestResult[] {
  return findNearestAhead(facilities, chainageKm, kinds, {
    limit: limit * 3,
    lookbackKm: 15,
    maxOffsetM: 8000,
  })
    .sort((a, b) => a.totalWalkKm - b.totalWalkKm)
    .slice(0, limit);
}

/** Walking time for a distance, formatted for display. */
export function formatEta(km: number, paceKmh = DEFAULT_PACE_KMH): string {
  const minutes = Math.round((km / paceKmh) * 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
