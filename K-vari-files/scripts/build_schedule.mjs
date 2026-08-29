/**
 * Generate data/wari_schedule_2026.json — the estimator's prior.
 *
 *     node scripts/build_schedule.mjs
 *
 * The estimator needs to know what the Palki is *supposed* to be doing at
 * any moment, so it can forecast forward through halts instead of assuming
 * a constant 3 km/h through the night. That belief is a speed profile: a
 * list of (start, end, nominal_kmph) blocks per day, where halts are 0.0.
 *
 * ============================ SYNTHETIC ============================
 * We do not have the Sansthan's published 2026 timetable. This file is
 * GENERATED from the 14 mukkam stage distances in route.json using the
 * day shape below, which is a plausible Wari day, not a sourced one.
 *
 * Everything the model believes about *when* the Palki walks comes from
 * here, so this is the single most valuable thing to replace with real
 * data. The format is deliberately simple so it can be hand-edited: drop in
 * the real start times, halts and ringan slots and delete `"synthetic": true`.
 *
 * What is NOT synthetic is each day's distance — that comes from the
 * road-snapped route — so the nominal speeds below are calibrated to cover
 * the real distance in the available walking hours.
 * ===================================================================
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The shape of a Wari walking day. Times are local (IST).
 *
 * The palkhi starts before dawn to avoid the heat, breaks for breakfast,
 * walks again, takes a long lunch-and-heat rest through the worst of the
 * afternoon, then walks into the mukkam village by evening. `share` is how
 * much of the day's distance each walking block is expected to cover; the
 * shares across walking blocks sum to 1.
 */
const DAY_SHAPE = [
  { start: '00:00', end: '05:30', kind: 'halt', label: 'overnight mukkam' },
  { start: '05:30', end: '09:00', kind: 'walk', share: 0.38, label: 'pre-dawn to breakfast' },
  { start: '09:00', end: '10:00', kind: 'halt', label: 'nashta' },
  { start: '10:00', end: '12:30', kind: 'walk', share: 0.30, label: 'late morning' },
  { start: '12:30', end: '15:30', kind: 'halt', label: 'lunch and heat rest' },
  { start: '15:30', end: '19:00', kind: 'walk', share: 0.32, label: 'evening into mukkam' },
  { start: '19:00', end: '24:00', kind: 'halt', label: 'arrived at mukkam' },
];

function hoursBetween(a, b) {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return (bh * 60 + bm - (ah * 60 + am)) / 60;
}

const route = JSON.parse(readFileSync(resolve(ROOT, 'public/data/route.json'), 'utf8'));

const days = route.stages.map((stage) => {
  const distanceKm = stage.endKm - stage.startKm;

  const blocks = DAY_SHAPE.map((b) => {
    if (b.kind === 'halt') {
      return { start: b.start, end: b.end, kmph: 0, label: b.label };
    }
    const hours = hoursBetween(b.start, b.end);
    // Calibrate so the day's blocks cover exactly this stage's distance.
    const kmph = (distanceKm * b.share) / hours;
    return { start: b.start, end: b.end, kmph: Math.round(kmph * 1000) / 1000, label: b.label };
  });

  // Sanity: the blocks must reconstruct the stage distance.
  const covered = blocks.reduce((sum, b) => sum + b.kmph * hoursBetween(b.start, b.end), 0);

  return {
    dayNumber: stage.dayNumber,
    date: stage.stageDate,
    fromPlace: stage.fromPlace,
    toPlace: stage.toPlace,
    startKm: stage.startKm,
    endKm: stage.endKm,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    nominalKmphAvg: Math.round((covered / 9) * 1000) / 1000,
    blocks,
    _coveredKm: Math.round(covered * 1000) / 1000,
  };
});

const schedule = {
  schema: 1,
  routeSlug: route.slug,
  routeVersion: route.version,
  timezone: 'Asia/Kolkata',
  synthetic: true,
  syntheticNote:
    'Day shape is assumed, not sourced from the Sansthan timetable. Daily distances ARE real ' +
    '(from the road-snapped route). Replace blocks with the published schedule when available.',
  generatedAt: new Date().toISOString().slice(0, 10),
  days,
};

mkdirSync(resolve(ROOT, 'data'), { recursive: true });
writeFileSync(resolve(ROOT, 'data/wari_schedule_2026.json'), JSON.stringify(schedule, null, 2));

console.log(`wrote data/wari_schedule_2026.json — ${days.length} days`);
console.log('');
let bad = 0;
for (const d of days) {
  const err = Math.abs(d._coveredKm - d.distanceKm);
  if (err > 0.01) bad++;
  const peak = Math.max(...d.blocks.map((b) => b.kmph));
  const flag = peak > 5 ? '  <-- implausible pace' : '';
  console.log(
    `  day ${String(d.dayNumber).padStart(2)}  ${d.fromPlace.padEnd(14)} -> ${d.toPlace.padEnd(14)} ` +
      `${d.distanceKm.toFixed(1).padStart(5)} km   peak ${peak.toFixed(2)} km/h${flag}`,
  );
}
if (bad) {
  console.error(`\n${bad} day(s) do not reconstruct their distance`);
  process.exit(1);
}
console.log('\nall days reconstruct their stage distance exactly');
