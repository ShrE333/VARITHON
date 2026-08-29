#!/usr/bin/env node
/**
 * The Palki simulator — it plays the role of physical reality.
 *
 *     node sim/simulator.mjs --speed 300 --seed 7
 *
 * THIS PROCESS IS THE GROUND TRUTH, AND THE ESTIMATOR MUST NOT SEE INSIDE IT.
 * That is not a style preference; it is the entire basis for claiming the
 * model is not cheating. So this file:
 *
 *   - runs as a separate process
 *   - imports nothing from lib/palki/estimator, packet or schedule
 *   - communicates only over HTTP, by POSTing pings the way a real GPS
 *     tracker or a marshal's phone would
 *
 * It knows its own true position at every moment. It tells the estimator that
 * position only every 30 simulated minutes, blurred by GPS noise. Everything
 * in between — the daily speed lottery, the afternoon heat, the unscheduled
 * halt — the estimator has to infer.
 *
 * The one exception is /api/v1/palki/truth, which records the true position
 * for the demo dashboard's red marker and for scoring. Nothing on the
 * estimator's path reads that table.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------ args
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

const SPEED = Number(arg('speed', 300));
const SEED = Number(arg('seed', 7));
const BASE = String(arg('base', 'http://localhost:3000'));
const RUN_ID = String(arg('run', `sim-${SEED}-${Date.now().toString(36)}`));
const START_KM = Number(arg('start', 0));
const START_ISO = String(arg('from', '2026-06-25T00:00:00+05:30'));
const TOKEN = process.env.PALKI_INGEST_TOKEN || '';
const PING_EVERY_SIM_MIN = Number(arg('interval', 30));
const TRUTH_EVERY_SIM_MIN = Number(arg('truth-interval', 5));

/**
 * Deterministic PRNG (mulberry32). A seeded generator with no dependency,
 * so `--seed 7` replays the identical day every time — which is what makes a
 * demo rehearsable and a bug reproducible.
 */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);

/** Box-Muller, for the per-day speed multiplier. */
function gaussian(mean, sd) {
  const u = Math.max(rand(), 1e-9);
  const v = Math.max(rand(), 1e-9);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ------------------------------------------------------------- route data
const route = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'route.json'), 'utf8'));
const schedule = JSON.parse(
  readFileSync(join(ROOT, 'data', 'wari_schedule_2026.json'), 'utf8'),
);

/**
 * Arc-length geometry, reimplemented here on purpose.
 *
 * Importing lib/palki/geometry.ts would be harmless in itself, but keeping
 * this process free of *any* app import is a bright line that is easy to
 * verify and impossible to erode by accident. It is thirty lines.
 */
const coords = route.coordinates;
const cum = [0];
for (let i = 1; i < coords.length; i++) {
  const [lng1, lat1] = coords[i - 1];
  const [lng2, lat2] = coords[i];
  const R = 6371.0088;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  cum.push(cum[i - 1] + 2 * R * Math.asin(Math.sqrt(h)));
}
const TOTAL_KM = cum[cum.length - 1];

function positionAt(s) {
  const target = Math.max(0, Math.min(TOTAL_KM, s));
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= target) lo = mid;
    else hi = mid;
  }
  const t = cum[lo + 1] > cum[lo] ? (target - cum[lo]) / (cum[lo + 1] - cum[lo]) : 0;
  const [lng1, lat1] = coords[lo];
  const [lng2, lat2] = coords[lo + 1];
  return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t };
}

// ------------------------------------------------------------- the world
const IST_OFFSET_MIN = 330;
function istMinutes(d) {
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + IST_OFFSET_MIN) % 1440;
}
function dayForKm(s) {
  return schedule.days.find((d) => s >= d.startKm && s < d.endKm) ?? schedule.days.at(-1);
}
function hhmmToMin(x) {
  const [h, m] = x.split(':').map(Number);
  return h * 60 + m;
}
function nominalAt(date, s) {
  const day = dayForKm(s);
  const mins = istMinutes(date);
  for (const b of day.blocks) {
    if (mins >= hhmmToMin(b.start) && mins < hhmmToMin(b.end)) return b.kmph;
  }
  return 0;
}

/**
 * Per-day perturbations, drawn once per simulated day so the whole day has a
 * consistent character — which is what makes beta a meaningful thing for the
 * estimator to learn rather than noise to average away.
 */
const dayFactors = new Map();
function factorsForDay(dayNumber) {
  if (!dayFactors.has(dayNumber)) {
    // One unscheduled halt somewhere in the walking day: a crowd surge, or a
    // ringan running long. Start time is drawn in IST minutes.
    const disruptionStart = 6 * 60 + Math.floor(rand() * 10 * 60);
    dayFactors.set(dayNumber, {
      speedMultiplier: Math.max(0.55, Math.min(1.45, gaussian(1.0, 0.12))),
      disruptionStart,
      disruptionMins: 30 + Math.floor(rand() * 31),
    });
  }
  return dayFactors.get(dayNumber);
}

let announcedDisruption = new Set();

/** True instantaneous speed, km/h. The estimator never sees this function. */
function trueSpeed(date, s) {
  const nominal = nominalAt(date, s);
  if (nominal === 0) return 0;

  const day = dayForKm(s);
  const f = factorsForDay(day.dayNumber);
  const mins = istMinutes(date);

  // The injected disruption: a full stop.
  if (mins >= f.disruptionStart && mins < f.disruptionStart + f.disruptionMins) {
    if (!announcedDisruption.has(day.dayNumber)) {
      announcedDisruption.add(day.dayNumber);
      log(
        `!! day ${day.dayNumber}: unscheduled ${f.disruptionMins}-min halt injected ` +
          `at ${String(Math.floor(f.disruptionStart / 60)).padStart(2, '0')}:` +
          `${String(f.disruptionStart % 60).padStart(2, '0')} IST`,
      );
    }
    return 0;
  }

  // Afternoon heat: everyone slows between 12:00 and 15:00.
  const heat = mins >= 12 * 60 && mins < 15 * 60 ? 0.85 : 1.0;

  return nominal * f.speedMultiplier * heat;
}

// ------------------------------------------------------------------- net
async function post(path, body) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      log(`   POST ${path} -> ${res.status} ${(await res.text()).slice(0, 120)}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    log(`   POST ${path} failed: ${err.message}`);
    return null;
  }
}

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// ------------------------------------------------------------- main loop
let simTime = new Date(START_ISO);
let s = START_KM;
let paused = false;
let sinceLastPing = 0;
let sinceLastTruth = 0;
let pingCount = 0;

const SIM_STEP_MIN = 1; // one simulated minute per tick
const tickMs = Math.max(4, (SIM_STEP_MIN * 60_000) / SPEED);

log(`Palki simulator`);
log(`  route     ${route.slug} v${route.version}, ${TOTAL_KM.toFixed(1)} km`);
log(`  seed      ${SEED}   run ${RUN_ID}`);
log(`  speed     ${SPEED}x  (1 sim-minute every ${tickMs.toFixed(0)} ms)`);
log(`  start     ${START_ISO} at km ${START_KM}`);
log(`  target    ${BASE}`);
log(`  auth      ${TOKEN ? 'bearer token set' : 'no token (dev)'}`);
log('');
log('  commands: p = pause/resume, j <mins> = jump forward, q = quit');
log('');

async function tick() {
  if (paused) return;

  const v = trueSpeed(simTime, s);
  s = Math.min(TOTAL_KM, s + (v * SIM_STEP_MIN) / 60);
  simTime = new Date(simTime.getTime() + SIM_STEP_MIN * 60_000);
  sinceLastPing += SIM_STEP_MIN;
  sinceLastTruth += SIM_STEP_MIN;

  if (sinceLastTruth >= TRUTH_EVERY_SIM_MIN) {
    sinceLastTruth = 0;
    await post('/api/v1/palki/truth', {
      runId: RUN_ID,
      ts: simTime.toISOString(),
      sKm: Number(s.toFixed(3)),
    });
  }

  if (sinceLastPing >= PING_EVERY_SIM_MIN) {
    sinceLastPing = 0;
    pingCount++;

    // ~15 m of GPS noise, in degrees. This is what the estimator receives
    // instead of the exact position above.
    const p = positionAt(s);
    const noiseDeg = 15 / 111_320;
    const lat = p.lat + (rand() - 0.5) * 2 * noiseDeg;
    const lng = p.lng + ((rand() - 0.5) * 2 * noiseDeg) / Math.cos((p.lat * Math.PI) / 180);

    const res = await post('/api/v1/palki/ping', {
      pings: [
        {
          tsDevice: simTime.toISOString(),
          lat,
          lng,
          source: 'gps',
          isSimulated: true,
          reporterId: RUN_ID,
        },
      ],
    });

    const day = dayForKm(s);
    const istH = String(Math.floor(istMinutes(simTime) / 60)).padStart(2, '0');
    const istM = String(istMinutes(simTime) % 60).padStart(2, '0');
    const est = res?.state;
    const errKm = est ? Math.abs(est.sKm - s) : null;

    log(
      `[${simTime.toISOString().slice(0, 10)} ${istH}:${istM} IST] ` +
        `day ${String(day.dayNumber).padStart(2)}  true ${s.toFixed(2)} km  ` +
        (est
          ? `model ${est.sKm.toFixed(2)} km  err ${errKm.toFixed(3)} km  ` +
            `beta ${est.beta.toFixed(2)}  sigma ${est.sigmaKm.toFixed(2)}`
          : 'model unreachable'),
    );
  }

  if (s >= TOTAL_KM) {
    log(`\nArrived at Pandharpur after ${pingCount} pings.`);
    process.exit(0);
  }
}

const timer = setInterval(() => {
  tick().catch((e) => log(`tick error: ${e.message}`));
}, tickMs);

// ------------------------------------------------------------- controls
// A judge will interrupt mid-run. Being able to pause, answer, and resume
// without restarting the demo is worth the twenty lines.
if (process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    const cmd = line.trim();
    if (cmd === 'p') {
      paused = !paused;
      log(paused ? '-- paused --' : '-- resumed --');
    } else if (cmd.startsWith('j')) {
      const mins = Number(cmd.slice(1).trim() || '60');
      for (let i = 0; i < mins; i++) {
        const v = trueSpeed(simTime, s);
        s = Math.min(TOTAL_KM, s + v / 60);
        simTime = new Date(simTime.getTime() + 60_000);
      }
      log(`-- jumped ${mins} sim-minutes to ${simTime.toISOString()} (km ${s.toFixed(2)}) --`);
    } else if (cmd === 'q') {
      clearInterval(timer);
      process.exit(0);
    }
  });
}
