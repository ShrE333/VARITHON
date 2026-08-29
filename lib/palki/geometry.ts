/**
 * Arc-length geometry for the route polyline.
 *
 * The whole Palki feature rests on one modelling decision: the Palki's
 * position is a single scalar `s` — kilometres travelled along the fixed
 * route — not a (lat, lng) pair. That guarantees a prediction can never
 * place the Palki in a field, and it makes the offline forecast packet tiny
 * (one float per timestep instead of a coordinate pair plus a map matching
 * problem).
 *
 * This module owns both directions.
 *
 * `s -> (lat, lng)` is an O(log n) binary search over a precomputed
 * cumulative-distance array.
 *
 * `(lat, lng) -> s` is an O(n) scan, because a cumulative array cannot
 * accelerate it — finding which of 4197 segments a loose point is nearest to
 * needs a full pass (or a spatial index we do not need at this size; the
 * scan costs well under a millisecond). M1/M2/M3 still use
 * `RouteIndex.locate()` from lib/chainage.ts for this, and that stays.
 * `project()` below exists alongside it for one specific reason it cannot
 * serve: it returns *every* plausible candidate, which is what makes the
 * Palki estimator correct on the stretches this route walks twice. See the
 * comment on ProjectOptions.
 *
 * Server and client both import *this* module, so there is no server/client
 * parity problem to test for — divergence is impossible by construction.
 * What is worth testing is that these agree with the turf engine the rest of
 * the app already trusts, which tests/route-geometry.test.mts asserts to
 * within one metre wherever the route does not overlap itself.
 */

const EARTH_RADIUS_KM = 6371.0088;

export interface LatLng {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Great-circle distance in km. Same formula as `haversineMeters` in
 * lib/geolocation.ts, kept in km here because every distance in the Palki
 * feature is a km-scale arc length and converting back and forth invites
 * unit bugs.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface ProjectionCandidate {
  /** Arc length along the route, km. */
  s: number;
  /** Perpendicular distance from the route, metres. */
  offsetM: number;
}

/**
 * Where a loose point projects onto the route.
 *
 * WHY THIS EXISTS RATHER THAN JUST CALLING TURF
 * ---------------------------------------------
 * About 15 km of this route is walked twice. The palkhi detours off the
 * highway into Lonand, Taradgaon, Phaltan, Barad and Velapur and comes back
 * out along the same road, so five stretches of tarmac carry two different
 * chainages (Barad, for instance, is both km 165 and km 178).
 *
 * @turf/nearest-point-on-line returns only the single globally nearest
 * point, and on a doubled-back stretch the two candidates are *exactly* zero
 * metres apart — which one it returns is arbitrary. Feeding that straight
 * into the estimator would let a ping in Barad throw the Palki 13 km
 * backwards, and the filter would then "correct" its speed to match a jump
 * that never happened.
 *
 * So we enumerate every plausible candidate and let the caller disambiguate
 * with the one piece of information turf does not have: where the Palki
 * already was. This is ordinary map matching. Everywhere the route does not
 * overlap itself there is exactly one candidate and this agrees with turf to
 * well under a metre, which tests/route-geometry.test.mts asserts.
 */
export interface ProjectOptions {
  /**
   * Where we EXPECT the subject to be — the prior position already advanced
   * to the time of this observation, not the stale last-known position.
   *
   * This distinction is the whole ballgame. Scoring candidates against a
   * thirty-minute-old position makes a candidate *behind* the Palki look
   * closer than the correct one ahead of it, because the Palki has walked
   * ~1.7 km in the meantime. Picking the backward candidate then teaches the
   * filter a negative speed, and it walks backwards down the road.
   */
  expectedS?: number;
  /**
   * Hard-ish floor: candidates below this are only chosen when nothing at or
   * above it exists. The Palki does not reverse, so a candidate several km
   * behind is almost certainly the wrong pass over a doubled-back stretch.
   */
  minS?: number;
  /**
   * How much further than the best candidate a rival may be and still count
   * as a genuine alternative, in metres.
   */
  toleranceM?: number;
}

export class RouteGeometry {
  /** [lng, lat] pairs, GeoJSON order, exactly as route.json stores them. */
  private readonly coords: readonly [number, number][];

  /**
   * cumulativeKm[i] is the arc length from the start of the route to
   * vertex i. Strictly non-decreasing, so it can be binary searched.
   */
  private readonly cumulativeKm: Float64Array;

  constructor(coordinates: readonly [number, number][]) {
    if (coordinates.length < 2) {
      throw new Error('RouteGeometry needs at least two coordinates');
    }
    this.coords = coordinates;

    const cum = new Float64Array(coordinates.length);
    cum[0] = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1]!;
      const [lng2, lat2] = coordinates[i]!;
      cum[i] = cum[i - 1]! + haversineKm({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
    }
    this.cumulativeKm = cum;
  }

  /** Total arc length of the polyline, in km. */
  get totalKm(): number {
    return this.cumulativeKm[this.cumulativeKm.length - 1]!;
  }

  get pointCount(): number {
    return this.coords.length;
  }

  /** Never let a forecast run past Pandharpur, or behind Alandi. */
  clampS(s: number): number {
    if (!Number.isFinite(s)) return 0;
    return Math.min(this.totalKm, Math.max(0, s));
  }

  /**
   * Index of the segment containing arc length `s`, i.e. the largest i with
   * cumulativeKm[i] <= s. Binary search, O(log n).
   *
   * Exposed for tests; callers normally want positionAt().
   */
  segmentIndexFor(s: number): number {
    const target = this.clampS(s);
    const cum = this.cumulativeKm;

    let lo = 0;
    let hi = cum.length - 1;
    // Invariant: cum[lo] <= target, and the answer is in [lo, hi).
    while (lo < hi - 1) {
      const mid = (lo + hi) >>> 1;
      if (cum[mid]! <= target) lo = mid;
      else hi = mid;
    }
    // The final vertex has no segment after it; report the one before it.
    return Math.min(lo, cum.length - 2);
  }

  /**
   * Position at arc length `s`, by linear interpolation within the
   * containing segment.
   *
   * Interpolating in raw lat/lng rather than along a great circle is
   * accurate here because segments average ~68 m; the great-circle vs
   * straight-line discrepancy at that scale is far below a millimetre.
   */
  positionAt(s: number): LatLng {
    const target = this.clampS(s);
    const i = this.segmentIndexFor(target);

    const startKm = this.cumulativeKm[i]!;
    const endKm = this.cumulativeKm[i + 1]!;
    const segmentKm = endKm - startKm;

    // Coincident vertices would divide by zero; they contribute no length.
    const t = segmentKm > 0 ? (target - startKm) / segmentKm : 0;

    const [lng1, lat1] = this.coords[i]!;
    const [lng2, lat2] = this.coords[i + 1]!;

    return {
      lat: lat1 + (lat2 - lat1) * t,
      lng: lng1 + (lng2 - lng1) * t,
    };
  }

  /**
   * Compass bearing (degrees clockwise from north) of travel at `s`.
   * Used to orient the Palki marker so it faces the way it is walking.
   */
  bearingAt(s: number): number {
    const i = this.segmentIndexFor(s);
    const [lng1, lat1] = this.coords[i]!;
    const [lng2, lat2] = this.coords[i + 1]!;

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const dLambda = toRad(lng2 - lng1);

    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * The polyline between two arc lengths, as Leaflet-order [lat, lng] pairs
   * with both ends interpolated exactly. Used to highlight "somewhere
   * between Lonand and Taradgaon" when the packet is too stale to justify
   * drawing a single point.
   */
  sliceLatLngs(fromKm: number, toKm: number): [number, number][] {
    const a = this.clampS(Math.min(fromKm, toKm));
    const b = this.clampS(Math.max(fromKm, toKm));

    const start = this.positionAt(a);
    const end = this.positionAt(b);
    const out: [number, number][] = [[start.lat, start.lng]];

    const firstVertex = this.segmentIndexFor(a) + 1;
    const lastVertex = this.segmentIndexFor(b);
    for (let i = firstVertex; i <= lastVertex; i++) {
      const [lng, lat] = this.coords[i]!;
      out.push([lat, lng]);
    }

    out.push([end.lat, end.lng]);
    return out;
  }

  /**
   * Every plausible place this point could sit on the route, nearest first.
   *
   * One entry per local minimum of distance-to-route, so a point on a
   * doubled-back stretch yields two, and a point anywhere else yields one.
   */
  projectCandidates(lat: number, lng: number, toleranceM = 50): ProjectionCandidate[] {
    const query = { lat, lng };
    const cum = this.cumulativeKm;
    const n = this.coords.length;

    // Local flat-earth scaling: one degree of longitude shrinks by cos(lat).
    // Over a 285 km route the latitude range is small enough that taking
    // cos at the query point is accurate to a few centimetres.
    const cosLat = Math.cos(toRad(lat));

    const perSegment = new Float64Array(n - 1);
    const perSegmentT = new Float64Array(n - 1);

    for (let i = 0; i < n - 1; i++) {
      const [lng1, lat1] = this.coords[i]!;
      const [lng2, lat2] = this.coords[i + 1]!;

      // Project the query onto the segment in local planar degrees.
      const ax = (lng1 - lng) * cosLat;
      const ay = lat1 - lat;
      const bx = (lng2 - lng) * cosLat;
      const by = lat2 - lat;

      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;

      let t = lenSq > 0 ? -(ax * dx + ay * dy) / lenSq : 0;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;

      const px = ax + dx * t;
      const py = ay + dy * t;

      perSegment[i] = Math.hypot(px, py);
      perSegmentT[i] = t;
    }

    // Collect local minima. A segment qualifies if no adjacent segment is
    // closer, which is what separates the two passes over a doubled-back
    // stretch into distinct candidates.
    const raw: ProjectionCandidate[] = [];
    for (let i = 0; i < n - 1; i++) {
      const d = perSegment[i]!;
      const prev = i > 0 ? perSegment[i - 1]! : Infinity;
      const next = i < n - 2 ? perSegment[i + 1]! : Infinity;
      if (d <= prev && d <= next) {
        const t = perSegmentT[i]!;
        const s = cum[i]! + (cum[i + 1]! - cum[i]!) * t;
        const pt = this.positionAt(s);
        raw.push({ s, offsetM: haversineKm(query, pt) * 1000 });
      }
    }

    if (raw.length === 0) {
      // Degenerate polyline; fall back to the single closest segment.
      let best = 0;
      for (let i = 1; i < n - 1; i++) if (perSegment[i]! < perSegment[best]!) best = i;
      const t = perSegmentT[best]!;
      const s = cum[best]! + (cum[best + 1]! - cum[best]!) * t;
      raw.push({ s, offsetM: haversineKm(query, this.positionAt(s)) * 1000 });
    }

    raw.sort((a, b) => a.offsetM - b.offsetM);

    // Merge minima that describe the same physical spot, and drop rivals
    // that are not genuinely competitive with the best.
    const bestOffset = raw[0]!.offsetM;
    const cutoff = bestOffset + toleranceM;
    const merged: ProjectionCandidate[] = [];
    for (const c of raw) {
      if (c.offsetM > cutoff) break;
      if (merged.some((m) => Math.abs(m.s - c.s) < 1.0)) continue;
      merged.push(c);
    }
    return merged;
  }

  /**
   * Project a point onto the route, resolving self-overlap with `priorS`.
   *
   * With no prior this returns the globally nearest point, which is what
   * turf would give. With a prior it prefers the candidate the Palki could
   * actually have reached, which is the difference between tracking it and
   * teleporting it 13 km backwards through Barad.
   */
  project(lat: number, lng: number, opts: ProjectOptions = {}): ProjectionCandidate {
    const { expectedS, minS, toleranceM = 50 } = opts;
    const candidates = this.projectCandidates(lat, lng, toleranceM);

    if (candidates.length === 1) return candidates[0]!;
    if (expectedS === undefined && minS === undefined) return candidates[0]!;

    // Prefer candidates that are not behind where we know the subject
    // already was; fall back to the full set if that rules everything out
    // (which happens on a genuine GPS glitch, and is better than returning
    // nothing).
    const forward = minS === undefined ? candidates : candidates.filter((c) => c.s >= minS);
    const pool = forward.length > 0 ? forward : candidates;

    if (expectedS === undefined) return pool[0]!;

    let best = pool[0]!;
    let bestGap = Math.abs(best.s - expectedS);
    for (const c of pool.slice(1)) {
      const gap = Math.abs(c.s - expectedS);
      if (gap < bestGap) {
        best = c;
        bestGap = gap;
      }
    }
    return best;
  }

  /** Read-only view of the cumulative array, for tests and diagnostics. */
  get cumulative(): Float64Array {
    return this.cumulativeKm;
  }
}
