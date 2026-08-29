/**
 * Assemble the offline forecast packet.
 *
 * The server never sends "a location" — by the time a pilgrim's phone finds
 * signal again that would already be wrong. It sends a timeline, and the
 * phone reads its own clock against it. That is what makes the feature work
 * in a dead zone.
 *
 * The polyline is NOT in here. It is ~92 KB and never changes; it is a
 * separate immutable resource keyed by routeVersion. This packet must stay
 * under 4 KB gzipped so it can be refreshed over a 2G edge connection.
 */

import { RouteGeometry } from './geometry.ts';
import { CONFIDENCE_DECAY_KMPH, forecast } from './estimator.ts';
import { advance, type WariSchedule } from './schedule.ts';
import type { Landmark, LandmarkEta, Packet, PalkiState } from './types.ts';

/** How far ahead the packet stays usable. Matches the forecast horizon. */
export const PACKET_VALID_HOURS = 8;

/**
 * How far ahead to search for landmark arrivals. Longer than the forecast
 * window on purpose — see LandmarkEta.beyondForecast.
 */
export const LANDMARK_HORIZON_HOURS = 24;

/**
 * When does the Palki reach each landmark ahead of it?
 *
 * Solved by walking the schedule forward a minute at a time and noting when
 * `s` crosses each landmark, rather than dividing distance by average speed
 * — the latter would ignore halts and cheerfully predict an arrival at 2 am.
 */
export function landmarkEtas(
  state: PalkiState,
  geometry: RouteGeometry,
  sched: WariSchedule,
  landmarks: Landmark[],
  from: Date,
  horizonHours = LANDMARK_HORIZON_HOURS,
  forecastEndsAt?: Date,
): LandmarkEta[] {
  const ahead = landmarks
    .filter((l) => l.s_km > state.sKm)
    .sort((a, b) => a.s_km - b.s_km);

  const out: LandmarkEta[] = [];
  const totalMinutes = horizonHours * 60;
  const STEP = 1;

  let cursor = 0; // index into `ahead`
  let s = state.sKm;

  for (let m = STEP; m <= totalMinutes && cursor < ahead.length; m += STEP) {
    const t = new Date(from.getTime() + m * 60_000);
    s = advance(
      sched,
      new Date(state.ts),
      (t.getTime() - new Date(state.ts).getTime()) / 60_000,
      state.sKm,
      state.beta,
      geometry.totalKm,
    );

    while (cursor < ahead.length && s >= ahead[cursor]!.s_km) {
      out.push({
        ...ahead[cursor]!,
        eta: t.toISOString(),
        beyondForecast: forecastEndsAt ? t.getTime() > forecastEndsAt.getTime() : false,
      });
      cursor++;
    }
  }

  // Anything the horizon does not reach is reported with a null ETA rather
  // than omitted, so the UI can say "later today" instead of silently
  // dropping the next village.
  for (; cursor < ahead.length; cursor++) {
    out.push({ ...ahead[cursor]!, eta: null, beyondForecast: true });
  }

  return out;
}

export function buildPacket(
  state: PalkiState,
  geometry: RouteGeometry,
  sched: WariSchedule,
  opts: {
    routeId: string;
    routeVersion: number;
    landmarks: Landmark[];
    now?: Date;
    /** Cap landmarks in the packet to keep it small. */
    maxLandmarks?: number;
  },
): Packet {
  const { routeId, routeVersion, landmarks, now = new Date(), maxLandmarks = 6 } = opts;

  const rows = forecast(state, geometry, sched, { from: now, horizonHours: PACKET_VALID_HOURS });
  const forecastEndsAt = new Date(now.getTime() + PACKET_VALID_HOURS * 3_600_000);
  const etas = landmarkEtas(
    state,
    geometry,
    sched,
    landmarks,
    now,
    LANDMARK_HORIZON_HOURS,
    forecastEndsAt,
  ).slice(0, maxLandmarks);

  return {
    schema: 1,
    routeId,
    routeVersion,
    syncedAt: now.toISOString(),
    validUntil: new Date(now.getTime() + PACKET_VALID_HOURS * 3_600_000).toISOString(),
    confidenceDecayKmph: CONFIDENCE_DECAY_KMPH,
    current: {
      sKm: Math.round(state.sKm * 1000) / 1000,
      sigmaKm: Math.round(state.sigmaKm * 1000) / 1000,
      source: state.source,
      // The age that matters to a pilgrim is the age of the OBSERVATION, not
      // of the packet. A packet rebuilt every minute from a six-hour-old ping
      // is a six-hour-old answer, and the staleness rules must see that.
      observedAt: state.ts,
    },
    forecast: rows,
    landmarks: etas,
  };
}
