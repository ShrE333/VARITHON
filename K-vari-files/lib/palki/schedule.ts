/**
 * The schedule prior — what the model believes the Palki will do absent any
 * observation.
 *
 * A Wari day is not a constant walk. It is roughly: walk before dawn, break
 * for nashta, walk again, stop for three hours through the worst of the
 * afternoon heat, then walk into the mukkam village by evening. Forecasting
 * a constant 3 km/h through all of that would have the Palki arriving in
 * Pandharpur days early, and would place it in the middle of a field at 2 am.
 *
 * So the prior is a piecewise-constant speed profile, and the forecast
 * integrates through it. Halts are blocks with kmph = 0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SpeedBlock {
  /** Local wall-clock 'HH:MM'. */
  start: string;
  end: string;
  kmph: number;
  label: string;
}

export interface ScheduleDay {
  dayNumber: number;
  date: string;
  fromPlace: string;
  toPlace: string;
  startKm: number;
  endKm: number;
  distanceKm: number;
  blocks: SpeedBlock[];
}

export interface WariSchedule {
  schema: number;
  routeSlug: string;
  routeVersion: number;
  timezone: string;
  synthetic: boolean;
  days: ScheduleDay[];
}

/**
 * SERVER ONLY. The client does no modelling (it just interpolates the
 * packet), so the schedule never needs to reach the browser — which also
 * keeps it out of the client bundle. Reading from disk rather than
 * `import ... from '.json'` keeps this loadable by plain node in tests
 * without import attributes.
 */
export const schedule = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'wari_schedule_2026.json'), 'utf8'),
) as WariSchedule;

/**
 * The Wari runs on IST regardless of where the server is. Everything below
 * works in a fixed +05:30 offset rather than the host's local time, so a
 * server in UTC forecasts the same halts as a phone in Pune.
 */
export const IST_OFFSET_MIN = 330;

/** Wall-clock minutes since local midnight, in IST. */
export function istMinutesOfDay(d: Date): number {
  const utcMinutes = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  return (utcMinutes + IST_OFFSET_MIN) % 1440;
}

/** Local IST calendar date as 'YYYY-MM-DD'. */
export function istDateString(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

function parseHhMm(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
}

export function findDay(schedule: WariSchedule, at: Date): ScheduleDay | null {
  const date = istDateString(at);
  return schedule.days.find((d) => d.date === date) ?? null;
}

/**
 * The day whose km range contains `sKm`. Used when the wall-clock date is
 * outside the Wari (e.g. a demo run in August against a June schedule) —
 * position is then a better guide to which day's rhythm applies than the
 * calendar is.
 */
export function findDayByKm(schedule: WariSchedule, sKm: number): ScheduleDay | null {
  return (
    schedule.days.find((d) => sKm >= d.startKm && sKm < d.endKm) ??
    schedule.days[schedule.days.length - 1] ??
    null
  );
}

/**
 * Nominal speed at an instant, in km/h.
 *
 * `sKm` selects which day's profile applies. We deliberately prefer position
 * over calendar date: the demo replays a compressed Wari at arbitrary wall
 * times, and a forecast that consulted the real date would find no matching
 * day and fall back to zero, freezing the Palki forever.
 */
export function nominalSpeedAt(sched: WariSchedule, at: Date, sKm: number): number {
  const day = findDayByKm(sched, sKm);
  if (!day) return 0;

  const minutes = istMinutesOfDay(at);
  for (const b of day.blocks) {
    const start = parseHhMm(b.start);
    const end = parseHhMm(b.end);
    if (minutes >= start && minutes < end) return b.kmph;
  }
  // 24:00 boundary, or a gap in a hand-edited schedule.
  return 0;
}

/** True when the schedule says the Palki should be stopped right now. */
export function isHaltAt(sched: WariSchedule, at: Date, sKm: number): boolean {
  return nominalSpeedAt(sched, at, sKm) === 0;
}

/**
 * Average nominal speed over the walking blocks of the day containing `sKm`.
 * Used as the denominator for beta when a ping lands during a halt — dividing
 * by a nominal of zero would make the bias meaningless.
 */
export function dayAverageWalkingSpeed(sched: WariSchedule, sKm: number): number {
  const day = findDayByKm(sched, sKm);
  if (!day) return 0;
  const walking = day.blocks.filter((b) => b.kmph > 0);
  if (walking.length === 0) return 0;
  const total = walking.reduce((sum, b) => {
    const hours = (parseHhMm(b.end) - parseHhMm(b.start)) / 60;
    return sum + b.kmph * hours;
  }, 0);
  const hours = walking.reduce(
    (sum, b) => sum + (parseHhMm(b.end) - parseHhMm(b.start)) / 60,
    0,
  );
  return hours > 0 ? total / hours : 0;
}

/**
 * Integrate the schedule forward from `from` for `minutes`, returning the
 * distance the Palki would cover at nominal pace scaled by `beta`.
 *
 * Steps in small increments rather than solving analytically because the
 * profile is piecewise and a step may straddle several blocks (and midnight).
 * One-minute steps over an 8-hour horizon is 480 iterations — trivial, and
 * it keeps halt boundaries honest to the minute.
 */
export function advance(
  sched: WariSchedule,
  from: Date,
  minutes: number,
  startKm: number,
  beta: number,
  totalKm: number,
): number {
  const STEP_MIN = 1;
  let s = startKm;
  let t = from.getTime();

  for (let elapsed = 0; elapsed < minutes; elapsed += STEP_MIN) {
    const nominal = nominalSpeedAt(sched, new Date(t), s);
    s = Math.min(totalKm, s + (nominal * beta * STEP_MIN) / 60);
    t += STEP_MIN * 60_000;
    if (s >= totalKm) break; // arrived; do not predict past Pandharpur
  }
  return s;
}
