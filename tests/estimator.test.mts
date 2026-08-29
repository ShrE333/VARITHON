/**
 * Step 2 verification for the estimator, schedule and packet.
 *
 * Run: npm run test:estimator
 *
 * The headline assertion the build prompt asks for is the slowdown test:
 * if the Palki walks slower than the schedule expects, does that actually
 * move the +3h forecast? A filter that corrects position but never carries
 * the bias forward would pass a naive "is it tracking?" check and still be
 * useless for the thing the feature exists to do.
 */

import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { RouteGeometry } from '../lib/palki/geometry.ts';
import {
  forecast,
  initialState,
  namedForecasts,
  predictAt,
  replay,
  update,
  BETA_MAX,
  BETA_MIN,
} from '../lib/palki/estimator.ts';
import { buildPacket, landmarkEtas } from '../lib/palki/packet.ts';
import { schedule, advance, nominalSpeedAt, istMinutesOfDay } from '../lib/palki/schedule.ts';
import type { Ping } from '../lib/palki/types.ts';

const bundle = JSON.parse(
  readFileSync(new URL('../public/data/route.json', import.meta.url), 'utf8'),
);
const geometry = new RouteGeometry(bundle.coordinates);
const landmarks = bundle.landmarks;

let failures = 0;
let checks = 0;
function check(name: string, ok: boolean, detail = '') {
  checks++;
  if (!ok) {
    failures++;
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}
function section(t: string) {
  console.log(`\n${t}`);
}

/** Build a ping at a given arc length and time. */
function pingAt(sKm: number, iso: string, source: Ping['source'] = 'gps'): Ping {
  const p = geometry.positionAt(sKm);
  return { tsDevice: iso, lat: p.lat, lng: p.lng, source, isSimulated: true };
}

// A day-8 morning: Phaltan -> Barad, which starts at km 139.7.
const DAY8 = schedule.days.find((d) => d.dayNumber === 8)!;
const T0 = '2026-07-02T00:30:00.000Z'; // 06:00 IST — inside the first walking block

// ------------------------------------------------------------- schedule
section('schedule prior');
{
  check('schedule is marked synthetic', schedule.synthetic === true);
  check('14 days', schedule.days.length === 14);
  check(
    'schedule route version matches route.json',
    schedule.routeVersion === bundle.version,
    `${schedule.routeVersion} vs ${bundle.version}`,
  );

  // IST handling: 00:30Z is 06:00 IST.
  check('IST conversion', Math.round(istMinutesOfDay(new Date(T0))) === 360);

  const walking = nominalSpeedAt(schedule, new Date(T0), DAY8.startKm + 1);
  check('06:00 IST is a walking block', walking > 0, `got ${walking}`);

  // 02:00 IST (20:30Z previous day) must be an overnight halt.
  const nightSpeed = nominalSpeedAt(schedule, new Date('2026-07-01T20:30:00.000Z'), DAY8.startKm + 1);
  check('02:00 IST is a halt', nightSpeed === 0, `got ${nightSpeed}`);
  console.log(`  day 8 ${DAY8.fromPlace}->${DAY8.toPlace}, ${DAY8.distanceKm} km, walking pace ${walking.toFixed(2)} km/h`);
}

// -------------------------------------------------------------- advance
section('forward integration respects halts');
{
  const startKm = DAY8.startKm;
  // Walk from 06:00 IST for 3 hours -> should cover roughly 3h of block pace.
  const after3h = advance(schedule, new Date(T0), 180, startKm, 1.0, geometry.totalKm);
  check('moves during a walking block', after3h > startKm + 1, `covered ${(after3h - startKm).toFixed(2)} km`);

  // Now integrate across the 12:30-15:30 heat halt (start 12:00 IST = 06:30Z).
  const preHalt = new Date('2026-07-02T07:00:00.000Z'); // 12:30 IST
  const acrossHalt = advance(schedule, preHalt, 170, startKm, 1.0, geometry.totalKm);
  check('does not move during the heat halt', Math.abs(acrossHalt - startKm) < 0.01,
    `moved ${(acrossHalt - startKm).toFixed(3)} km`);

  // Never past Pandharpur.
  const clamped = advance(schedule, new Date(T0), 60 * 24 * 30, geometry.totalKm - 1, 1.5, geometry.totalKm);
  check('clamps at the temple', clamped === geometry.totalKm, `got ${clamped}`);
  console.log(`  3h from 06:00 IST covers ${(after3h - startKm).toFixed(2)} km; heat halt covers 0.00 km`);
}

// ------------------------------------------------------ tracking a walk
section('tracking: on-schedule pings keep beta near 1');
{
  let state = initialState(DAY8.startKm, T0, true);
  const nominal = nominalSpeedAt(schedule, new Date(T0), DAY8.startKm);

  // Four pings, 30 min apart, exactly on the nominal pace.
  for (let i = 1; i <= 4; i++) {
    const t = new Date(new Date(T0).getTime() + i * 30 * 60_000);
    const s = advance(schedule, new Date(T0), i * 30, DAY8.startKm, 1.0, geometry.totalKm);
    state = update(state, pingAt(s, t.toISOString()), geometry, schedule);
  }

  check('beta stays near 1 when on schedule', Math.abs(state.beta - 1) < 0.25, `beta ${state.beta.toFixed(3)}`);
  check('residuals stay small', Math.max(...state.residuals.map(Math.abs)) < 0.3,
    `worst ${Math.max(...state.residuals.map(Math.abs)).toFixed(3)} km`);
  check('sigma at the floor when predictions are good', state.sigmaKm < 0.3, `sigma ${state.sigmaKm.toFixed(3)}`);
  console.log(`  after 4 on-pace pings: s=${state.sKm.toFixed(2)} v=${state.vKmph.toFixed(2)} beta=${state.beta.toFixed(3)} sigma=${state.sigmaKm.toFixed(3)}`);
}

// ============================================================ THE TEST
section('a slowdown must move the +3h forecast (build prompt Step 2)');
{
  const SLOW = 0.7; // walking at 70% of plan

  // Baseline: on-schedule.
  let onPlan = initialState(DAY8.startKm, T0, true);
  let slow = initialState(DAY8.startKm, T0, true);

  for (let i = 1; i <= 4; i++) {
    const t = new Date(new Date(T0).getTime() + i * 30 * 60_000).toISOString();
    const sOn = advance(schedule, new Date(T0), i * 30, DAY8.startKm, 1.0, geometry.totalKm);
    const sSlow = advance(schedule, new Date(T0), i * 30, DAY8.startKm, SLOW, geometry.totalKm);
    onPlan = update(onPlan, pingAt(sOn, t), geometry, schedule);
    slow = update(slow, pingAt(sSlow, t), geometry, schedule);
  }

  check('slow walker has lower beta', slow.beta < onPlan.beta - 0.1,
    `slow ${slow.beta.toFixed(3)} vs on-plan ${onPlan.beta.toFixed(3)}`);
  check('beta stays within clamps', slow.beta >= BETA_MIN && slow.beta <= BETA_MAX, `beta ${slow.beta}`);

  const onPlan3h = namedForecasts(onPlan, geometry, schedule).find((f) => f.horizonMin === 180)!;
  const slow3h = namedForecasts(slow, geometry, schedule).find((f) => f.horizonMin === 180)!;

  // The slow walker is already behind; what matters is that the FORECAST
  // also projects further behind, i.e. the bias propagated rather than the
  // filter merely re-centring on the new position.
  const onPlanGain = onPlan3h.sKm - onPlan.sKm;
  const slowGain = slow3h.sKm - slow.sKm;

  check('+3h forecast projects less distance for the slow walker',
    slowGain < onPlanGain - 0.5,
    `slow +${slowGain.toFixed(2)} km vs on-plan +${onPlanGain.toFixed(2)} km`);
  console.log(`  on-plan: beta ${onPlan.beta.toFixed(3)}, +3h covers ${onPlanGain.toFixed(2)} km`);
  console.log(`  slowed:  beta ${slow.beta.toFixed(3)}, +3h covers ${slowGain.toFixed(2)} km`);
  console.log(`  forecast gap at +3h: ${(onPlanGain - slowGain).toFixed(2)} km`);
}

// -------------------------------------------------- out-of-order replay
section('out-of-order batch replay');
{
  const times = [30, 60, 90, 120].map((m) =>
    new Date(new Date(T0).getTime() + m * 60_000).toISOString(),
  );
  const positions = [30, 60, 90, 120].map((m) =>
    advance(schedule, new Date(T0), m, DAY8.startKm, 1.0, geometry.totalKm),
  );

  const inOrder = times.map((t, i) => pingAt(positions[i]!, t));
  const shuffled = [inOrder[2]!, inOrder[0]!, inOrder[3]!, inOrder[1]!];

  const a = replay(initialState(DAY8.startKm, T0, true), inOrder, geometry, schedule);
  const b = replay(initialState(DAY8.startKm, T0, true), shuffled, geometry, schedule);

  check('shuffled batch gives the same state', Math.abs(a.sKm - b.sKm) < 1e-9 && Math.abs(a.beta - b.beta) < 1e-9,
    `s ${a.sKm.toFixed(4)} vs ${b.sKm.toFixed(4)}, beta ${a.beta.toFixed(4)} vs ${b.beta.toFixed(4)}`);

  // Re-delivering the same batch must not double-count.
  const c = replay(a, inOrder, geometry, schedule);
  check('replaying old pings is a no-op', Math.abs(c.sKm - a.sKm) < 1e-9);
  console.log(`  ordered and shuffled both settle at s=${a.sKm.toFixed(3)} beta=${a.beta.toFixed(3)}`);
}

// ------------------------------------------- self-overlap disambiguation
section('a ping on doubled-back road does not teleport the Palki');
{
  // Barad: km 165.07 outbound, km 178.48 on the return. A Palki that has
  // reached km 178 must not be dragged back to 165 by a ping there.
  const t1 = '2026-07-02T02:00:00.000Z';
  let state = initialState(178.0, t1, true);

  const ambiguous = pingAt(178.48, '2026-07-02T02:30:00.000Z');
  const after = update(state, ambiguous, geometry, schedule);

  check('stays on the return pass', Math.abs(after.sKm - 178.48) < 1.0, `s=${after.sKm.toFixed(2)}`);
  check('did not jump backwards', after.sKm > 170, `s=${after.sKm.toFixed(2)}`);
  check('speed stayed sane', after.vKmph >= 0 && after.vKmph < 10, `v=${after.vKmph.toFixed(2)}`);

  // And the opposite: still on the way out.
  const outbound = update(initialState(164.5, t1, true), pingAt(178.48, '2026-07-02T02:30:00.000Z'), geometry, schedule);
  check('an outbound Palki resolves to the outbound pass', outbound.sKm < 170, `s=${outbound.sKm.toFixed(2)}`);
  console.log(`  prior 178.0 -> ${after.sKm.toFixed(2)} km;  prior 164.5 -> ${outbound.sKm.toFixed(2)} km`);
}

// ---------------------------------------------------------- uncertainty
section('uncertainty grows with horizon');
{
  const state = initialState(DAY8.startKm, T0, true);
  const rows = forecast(state, geometry, schedule);
  check('17 rows at 30 min out to 8h', rows.length === 16, `got ${rows.length}`);

  let increasing = true;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]!.sigmaKm <= rows[i - 1]!.sigmaKm) increasing = false;
    if (rows[i]!.sKm < rows[i - 1]!.sKm) increasing = false; // never goes backwards
  }
  check('sigma strictly increases and s never decreases', increasing);
  check('never forecasts past the temple', rows.every((r) => r.sKm <= geometry.totalKm + 1e-9));
  console.log(`  sigma from ${rows[0]!.sigmaKm.toFixed(2)} km at +30m to ${rows[rows.length - 1]!.sigmaKm.toFixed(2)} km at +8h`);
}

// --------------------------------------------------------------- packet
section('packet');
{
  const state = initialState(DAY8.startKm, T0, true);
  const packet = buildPacket(state, geometry, schedule, {
    routeId: bundle.slug,
    routeVersion: bundle.version,
    landmarks,
    now: new Date(T0),
  });

  check('schema 1', packet.schema === 1);
  check('carries route version', packet.routeVersion === bundle.version);
  check('validUntil is 8h out',
    new Date(packet.validUntil).getTime() - new Date(packet.syncedAt).getTime() === 8 * 3_600_000);
  check('reports observation age separately from packet age', packet.current.observedAt === state.ts);
  check('does NOT inline the polyline', !JSON.stringify(packet).includes('coordinates'));

  const etas = packet.landmarks;
  check('landmarks are all ahead of the Palki', etas.every((l) => l.s_km > state.sKm));
  check('landmark ETAs are ordered', etas.every((l, i) => i === 0 || l.eta === null ||
    etas[i - 1]!.eta === null || new Date(l.eta).getTime() >= new Date(etas[i - 1]!.eta!).getTime()));

  const raw = Buffer.from(JSON.stringify(packet));
  const gz = gzipSync(raw);
  check('under 4 KB gzipped', gz.length < 4096, `${gz.length} bytes`);
  console.log(`  ${raw.length} B raw -> ${gz.length} B gzipped (budget 4096)`);
  const next = etas[0];
  if (next) console.log(`  next landmark: ${next.name} (${next.name_mr}) at km ${next.s_km}, eta ${next.eta ?? 'beyond horizon'}`);
}

// --------------------------------------------------------------- report
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
console.log('estimator OK');
