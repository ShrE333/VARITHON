#!/usr/bin/env node
/**
 * One command to put the Wari back at the starting line and walk it again.
 *
 *     npm run demo            # reset, then 300x — a walking day in ~2.5 min
 *     npm run demo:fast       # reset, then 1200x
 *     npm run demo:reset      # clear state and stop, without walking
 *     npm run demo -- --no-reset       # keep whatever state is there
 *     npm run demo -- --speed 600 --seed 12 --start 40
 *
 * What it does, in order:
 *
 *   1. Waits for `npm run dev` to answer. It does NOT start the dev server —
 *      you want that in its own terminal with its own logs, and guessing
 *      whether one is already running is how you end up with two.
 *   2. POSTs /api/v1/palki/reset, clearing the estimator state, pings,
 *      forecasts and simulator truth. This is the part that matters: without
 *      it, a second rehearsal inherits the first one's state and the Palki
 *      appears to jump forward the moment the simulator starts.
 *   3. Hands the terminal to sim/simulator.mjs with stdio inherited, so the
 *      mid-demo keys still work: `p` pause/resume, `j 120` jump, `q` quit.
 *
 * The simulator itself is untouched and still imports nothing from the app.
 */

import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------ args
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}
const has = (name) => process.argv.includes(`--${name}`);

const BASE = String(arg('base', 'http://localhost:3000'));
const SPEED = String(arg('speed', '300'));
const SEED = String(arg('seed', '7'));
const START_KM = String(arg('start', '0'));
const SKIP_RESET = has('no-reset');
const RESET_ONLY = has('reset-only');
const WAIT_MS = Number(arg('wait', 60000));

// --------------------------------------------------------------- env file
/**
 * Read PALKI_INGEST_TOKEN out of .env.local ourselves. This script runs
 * outside Next, so nothing has loaded it, and adding dotenv for four lines
 * of parsing would be a dependency for its own sake.
 */
function loadEnvLocal() {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const fileEnv = loadEnvLocal();
const TOKEN = process.env.PALKI_INGEST_TOKEN || fileEnv.PALKI_INGEST_TOKEN || '';

// ------------------------------------------------------------------ steps
const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
};

async function waitForServer() {
  const deadline = Date.now() + WAIT_MS;
  let announced = false;
  while (Date.now() < deadline) {
    try {
      // Any route that answers proves Next is up and compiled.
      const res = await fetch(`${BASE}/api/v1/palki/truth`, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      if (!announced) {
        console.log(c.dim(`  waiting for ${BASE} … start it with: npm run dev`));
        announced = true;
      }
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}

async function reset() {
  const headers = { 'content-type': 'application/json' };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;

  const res = await fetch(`${BASE}/api/v1/palki/reset`, { method: 'POST', headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `reset failed (${res.status}): ${body.error ?? 'unknown'}` +
        (res.status === 401 ? '\n  PALKI_INGEST_TOKEN in .env.local does not match the server.' : ''),
    );
  }
  return body;
}

// ------------------------------------------------------------------- main
console.log();
console.log(c.bold('  वारी साथी — demo run'));
console.log(c.dim(`  ${BASE} · speed ${SPEED}x · seed ${SEED} · start km ${START_KM}`));
console.log();

if (!(await waitForServer())) {
  console.error(c.red('  ✗ no dev server answering at ' + BASE));
  console.error(c.dim('    Open another terminal and run:  npm run dev'));
  process.exit(1);
}
console.log(c.green('  ✓') + ' dev server is up');

if (SKIP_RESET) {
  console.log(c.amber('  •') + ' skipping reset (--no-reset) — state carries over');
} else {
  try {
    const report = await reset();
    const where = report.supabase ? `memory + Supabase (${report.deleted.length} tables)` : 'memory';
    console.log(c.green('  ✓') + ` state cleared — ${where}`);
    for (const e of report.errors ?? []) console.log(c.amber('    ! ' + e));
  } catch (err) {
    console.error(c.red('  ✗ ') + err.message);
    process.exit(1);
  }
}

if (RESET_ONLY) {
  console.log();
  console.log(c.dim('  Ready. Start the walk with:  npm run demo -- --no-reset'));
  console.log();
  process.exitCode = 0;
} else {
  startSimulator();
}

function startSimulator() {
  console.log(c.green('  ✓') + ' starting the Palki from km ' + START_KM);
  console.log();
  console.log(c.dim('  Open:  ' + BASE + '/demo   (dashboard, project this)'));
  console.log(c.dim('         ' + BASE + '/palki  (what a pilgrim sees)'));
  console.log(c.dim('  Keys:  p = pause/resume · j 120 = jump 120 min · q = quit'));
  console.log();

  const child = spawn(
    process.execPath,
    [
      join(ROOT, 'sim', 'simulator.mjs'),
      '--speed', SPEED,
      '--seed', SEED,
      '--base', BASE,
      '--start', START_KM,
    ],
    { stdio: 'inherit', env: { ...process.env, PALKI_INGEST_TOKEN: TOKEN } },
  );

  child.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => child.kill(sig));
  }
}
