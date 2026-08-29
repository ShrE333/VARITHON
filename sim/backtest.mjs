#!/usr/bin/env node
/**
 * Backtest the estimator against recorded arrival times.
 *
 *     node sim/backtest.mjs                        # uses data/wari_2025_actuals.json
 *     node sim/backtest.mjs --file path/to.json
 *
 * WHY THIS MATTERS MORE THAN THE SIMULATOR
 * ----------------------------------------
 * "Validated against the 2025 Wari" is a far stronger claim than "works
 * against our own simulator", because a simulator can be unintentionally
 * tuned to be easy for the model that was written alongside it. A sharp
 * judge will probe exactly this, and the honest answer has to be ready.
 *
 * AT THE TIME OF WRITING WE DO NOT HAVE THAT DATA. This harness is complete
 * and runs, but `data/wari_2025_actuals.json` does not ship with real
 * numbers — it ships as a clearly-marked template. If you can source the
 * Sansthan's published mukkam arrival times, drop them in and this produces
 * a real MAE. Until then, say "simulator-only" and do not imply otherwise.
 *
 * Expected format:
 *   {
 *     "source": "where these numbers came from",
 *     "arrivals": [
 *       { "place": "Saswad", "s_km": 55.5, "arrived": "2025-06-28T18:40:00+05:30" },
 *       ...
 *     ]
 *   }
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const file = String(arg('file', join(ROOT, 'data', 'wari_2025_actuals.json')));

if (!existsSync(file)) {
  console.error(`No actuals file at ${file}`);
  console.error('Backtest cannot run. Report simulator-only accuracy, not historical validation.');
  process.exit(2);
}

const actuals = JSON.parse(readFileSync(file, 'utf8'));

if (actuals.placeholder === true || !Array.isArray(actuals.arrivals) || actuals.arrivals.length < 3) {
  console.error('');
  console.error('  data/wari_2025_actuals.json is still the PLACEHOLDER template.');
  console.error('  No historical validation has been performed.');
  console.error('');
  console.error('  Do not claim "validated against the 2025 Wari" until real');
  console.error('  arrival times are in this file and this script prints an MAE.');
  console.error('');
  process.exit(3);
}

// Imports deferred until we know there is work to do — these pull in the
// estimator, and loading it for a no-op run would be noise.
const { RouteGeometry } = await import(pathToFileURL(join(ROOT, 'lib/palki/geometry.ts')).href);
const { initialState, update, predictAt, SCORED_HORIZONS_MIN } = await import(
  pathToFileURL(join(ROOT, 'lib/palki/estimator.ts')).href
);
const { schedule } = await import(pathToFileURL(join(ROOT, 'lib/palki/schedule.ts')).href);

const route = JSON.parse(readFileSync(join(ROOT, 'public/data/route.json'), 'utf8'));
const geometry = new RouteGeometry(route.coordinates);

const arrivals = [...actuals.arrivals].sort(
  (a, b) => new Date(a.arrived).getTime() - new Date(b.arrived).getTime(),
);

console.log(`Backtest against ${arrivals.length} recorded arrivals`);
console.log(`  source: ${actuals.source ?? 'unstated'}`);
console.log('');

let state = initialState(arrivals[0].s_km, arrivals[0].arrived, false);
const errorsByHorizon = new Map(SCORED_HORIZONS_MIN.map((h) => [h, []]));

/** True position at an instant, by interpolating between recorded arrivals. */
function actualAt(ts) {
  const t = new Date(ts).getTime();
  let before = null;
  let after = null;
  for (const a of arrivals) {
    const at = new Date(a.arrived).getTime();
    if (at <= t) before = a;
    if (at >= t && !after) after = a;
  }
  if (!before || !after) return null;
  const bt = new Date(before.arrived).getTime();
  const at = new Date(after.arrived).getTime();
  if (at === bt) return before.s_km;
  return before.s_km + ((after.s_km - before.s_km) * (t - bt)) / (at - bt);
}

for (let i = 1; i < arrivals.length; i++) {
  const a = arrivals[i];

  // Score the forecasts this state would have issued, before folding in the
  // new observation — otherwise we would be grading the model on data it
  // has already seen.
  for (const h of SCORED_HORIZONS_MIN) {
    const target = new Date(new Date(state.ts).getTime() + h * 60_000);
    const truth = actualAt(target.toISOString());
    if (truth === null) continue;
    const predicted = predictAt(state, target, schedule, geometry.totalKm);
    errorsByHorizon.get(h).push(Math.abs(predicted - truth));
  }

  const p = geometry.positionAt(a.s_km);
  state = update(
    state,
    { tsDevice: a.arrived, lat: p.lat, lng: p.lng, source: 'checkpoint', isSimulated: false },
    geometry,
    schedule,
  );
}

console.log('  horizon    MAE (km)   worst (km)     n');
for (const h of SCORED_HORIZONS_MIN) {
  const es = errorsByHorizon.get(h);
  if (!es.length) {
    console.log(`   +${String(h / 60).padStart(2)}h          —            —          0`);
    continue;
  }
  const mae = es.reduce((x, y) => x + y, 0) / es.length;
  const worst = Math.max(...es);
  console.log(
    `   +${String(h / 60).padStart(2)}h      ${mae.toFixed(3).padStart(8)}   ${worst
      .toFixed(3)
      .padStart(10)}   ${String(es.length).padStart(3)}`,
  );
}
console.log('');
console.log(`  final beta ${state.beta.toFixed(3)}, sigma ${state.sigmaKm.toFixed(3)} km`);
