'use client';

/**
 * Client side of the Palki feature.
 *
 * THE CLIENT DOES NO MODELLING. It reads the device clock, linearly
 * interpolates between the two bracketing rows of the cached packet, and
 * maps s -> (lat, lng) through the cached polyline. That is the whole
 * algorithm.
 *
 * This is deliberate. Any inference here would be a second implementation of
 * the estimator that could drift from the server's, and it would run on a
 * phone that has been offline for six hours and knows nothing new. The
 * server already did the thinking; the phone's job is to read a timetable
 * honestly and say how old it is.
 */

import type { Packet, PingSource } from './types';

/**
 * How old the underlying observation is allowed to get before the UI stops
 * claiming to know where the Palki is. These thresholds are the honesty
 * rules, and they are stated once here so the UI cannot quietly disagree
 * with itself.
 */
export const FRESHNESS = {
  /** Solid dot, "Live". */
  liveMs: 5 * 60_000,
  /** Hollow dot with an uncertainty ring. */
  estimatedMs: 3 * 3_600_000,
  /** Segment only, no dot. */
  segmentMs: 8 * 3_600_000,
} as const;

export type Freshness = 'live' | 'estimated' | 'segment' | 'expired';

export interface PalkiView {
  freshness: Freshness;
  /** Interpolated arc length, or null once we refuse to claim a position. */
  sKm: number | null;
  sigmaKm: number;
  /** Age of the OBSERVATION, not of the packet. */
  observationAgeMs: number;
  source: PingSource;
  syncedAt: string;
  validUntil: string;
  /** Populated only in 'segment' mode: the stretch it is somewhere within. */
  segment: { fromKm: number; toKm: number } | null;
}

/**
 * Position at an arbitrary instant, by interpolating the forecast timeline.
 *
 * Returns null before the first row (the packet starts in the future) and
 * clamps to the last row after the horizon.
 */
export function interpolateS(packet: Packet, at: Date): number | null {
  const t = at.getTime();
  const rows = packet.forecast;

  const currentT = new Date(packet.syncedAt).getTime();
  if (t <= currentT) return packet.current.sKm;
  if (rows.length === 0) return packet.current.sKm;

  const lastT = new Date(rows[rows.length - 1]!.t).getTime();
  if (t >= lastT) return rows[rows.length - 1]!.sKm;

  // Walk to the bracketing pair. Sixteen rows: a scan is clearer than a
  // binary search and the difference is unmeasurable.
  let prevT = currentT;
  let prevS = packet.current.sKm;
  for (const row of rows) {
    const rowT = new Date(row.t).getTime();
    if (t <= rowT) {
      const span = rowT - prevT;
      const f = span > 0 ? (t - prevT) / span : 0;
      return prevS + (row.sKm - prevS) * f;
    }
    prevT = rowT;
    prevS = row.sKm;
  }
  return prevS;
}

/** Interpolated uncertainty at an instant, same shape as interpolateS. */
export function interpolateSigma(packet: Packet, at: Date): number {
  const t = at.getTime();
  const rows = packet.forecast;
  if (rows.length === 0) return packet.current.sigmaKm;

  let prevT = new Date(packet.syncedAt).getTime();
  let prevSigma = packet.current.sigmaKm;
  for (const row of rows) {
    const rowT = new Date(row.t).getTime();
    if (t <= rowT) {
      const span = rowT - prevT;
      const f = span > 0 ? (t - prevT) / span : 0;
      return prevSigma + (row.sigmaKm - prevSigma) * f;
    }
    prevT = rowT;
    prevSigma = row.sigmaKm;
  }
  return prevSigma;
}

/**
 * Decide what we are willing to claim, given how stale the observation is.
 *
 * Note it keys off `current.observedAt`, not `syncedAt`. A packet rebuilt
 * one minute ago from a six-hour-old ping is a six-hour-old answer, and
 * showing a "Live" badge for it would be the exact dishonesty these rules
 * exist to prevent.
 */
export function viewFor(packet: Packet, now: Date = new Date()): PalkiView {
  const observedAt = new Date(packet.current.observedAt).getTime();
  const ageMs = now.getTime() - observedAt;
  const expired = now.getTime() > new Date(packet.validUntil).getTime();

  const sigmaKm = interpolateSigma(packet, now);
  const sKm = interpolateS(packet, now);

  let freshness: Freshness;
  if (expired || ageMs > FRESHNESS.segmentMs) freshness = 'expired';
  else if (ageMs <= FRESHNESS.liveMs) freshness = 'live';
  else if (ageMs <= FRESHNESS.estimatedMs) freshness = 'estimated';
  else freshness = 'segment';

  return {
    freshness,
    // Past three hours we stop drawing a point at all. A dot implies a
    // precision we do not have; a highlighted stretch of road does not.
    sKm: freshness === 'expired' ? null : sKm,
    sigmaKm,
    observationAgeMs: ageMs,
    source: packet.current.source,
    syncedAt: packet.syncedAt,
    validUntil: packet.validUntil,
    segment:
      freshness === 'segment' && sKm !== null
        ? { fromKm: Math.max(0, sKm - sigmaKm), toKm: sKm + sigmaKm }
        : null,
  };
}

/** The next landmark the Palki has not yet reached. */
export function nextLandmark(packet: Packet, sKm: number | null) {
  const s = sKm ?? packet.current.sKm;
  return packet.landmarks.find((l) => l.s_km > s) ?? null;
}

/**
 * The instant to evaluate a packet at, given when we fetched it.
 *
 * Real deployments could just use `new Date()`. This exists for the
 * simulator: its packets are stamped in simulated time, so we start from the
 * packet's own clock and advance at real rate from the moment it arrived.
 * Both cases then behave identically — including, crucially, the offline
 * case, where the displayed answer keeps ageing while nothing new arrives.
 */
export function clockFor(packet: Packet, fetchedAt: number | null, realNow = Date.now()): Date {
  if (fetchedAt === null) return new Date(packet.syncedAt);
  const elapsed = realNow - fetchedAt;
  return new Date(new Date(packet.syncedAt).getTime() + elapsed);
}

export function formatAge(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * Always render times in IST, never in the device's timezone.
 *
 * The Wari happens in Maharashtra and every published time — mukkam
 * arrivals, ringan, departure — is quoted in IST. A volunteer coordinating
 * from another timezone, or a phone with its clock set wrong, must still see
 * the same wall-clock time the schedule uses, or the ETA is worse than
 * useless.
 */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}
