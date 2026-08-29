#!/usr/bin/env node
/**
 * One-time seed for db/schema.sql's routes/facilities tables.
 *
 *     node scripts/seed_facilities.mjs
 *
 * Run this AFTER db/schema.sql has been applied in the Supabase SQL Editor
 * (it creates `routes`/`facilities`; this script has nothing to write into
 * until that's done — it checks and exits cleanly if they're missing).
 *
 * Does two things:
 *   1. Inserts one `routes` row for ROUTE_SLUG, geometry as WKT, from
 *      public/data/route.json. Everything else (facilities.chainage_km,
 *      offset_m) is derived FROM this row by the schema's own
 *      compute_chainage trigger — nothing here computes chainage itself.
 *   2. Inserts the 25 rows from public/data/fixtures.json as approved,
 *      admin-visible test facilities, letting that same trigger (re)compute
 *      their chainage — the static file's precomputed values are used only
 *      to place the pin (lat/lng), not trusted for chainage.
 *
 * Idempotent: safe to re-run. Skips the routes insert if the slug already
 * exists; skips facility inserts already present by (route_id, name).
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Chainage comes from the app's own RouteIndex, not the database trigger.
 * The trigger's ST_LineLocatePoint approximation is off by up to 1.2 km
 * against the turf engine the client uses — see db/fix_chainage_trigger.sql.
 */
const { locateFacility } = await import(
  pathToFileURL(join(ROOT, 'lib/facilities/chainage-server.ts')).href
);

/** .env.local isn't loaded automatically outside Next.js — parse it directly. */
function loadEnvLocal() {
  const path = join(ROOT, '.env.local');
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const slug = env.NEXT_PUBLIC_ROUTE_SLUG || 'dnyaneshwar-2026';

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// ---------------------------------------------------------------- routes

async function ensureRoute() {
  const { data: existing, error: selErr } = await supabase
    .from('routes')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (selErr) {
    if (selErr.code === 'PGRST205' || /schema cache/.test(selErr.message)) {
      console.error(
        '\nThe `routes` table does not exist yet.\n' +
          'Run db/schema.sql in the Supabase SQL Editor first, then re-run this script.\n',
      );
      process.exit(2);
    }
    throw selErr;
  }

  if (existing) {
    log(`routes: '${slug}' already exists (${existing.id}) — skipping insert.`);
    return existing.id;
  }

  const route = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'route.json'), 'utf8'));

  // WKT text, inserted into a `geometry`/`geography` column: PostGIS
  // registers an ASSIGNMENT cast from text to geometry, so a plain WKT
  // string in an INSERT's target column position is parsed automatically —
  // no ST_GeomFromText() call needed on this side.
  const wktLine = `LINESTRING(${route.coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ')})`;
  const wktPoint = `POINT(${route.destination.lng} ${route.destination.lat})`;

  const yearMatch = slug.match(/(\d{4})/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  const { data, error } = await supabase
    .from('routes')
    .insert({
      slug,
      name: `${route.startName} → ${route.endName}`,
      year,
      geom: wktLine,
      total_km: route.totalKm,
      start_name: route.startName,
      end_name: route.endName,
      destination: wktPoint,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  log(`routes: inserted '${slug}' (${data.id}), ${route.coordinates.length} pts, ${route.totalKm} km`);
  return data.id;
}

// ------------------------------------------------------------- facilities

async function seedFixtures(routeId) {
  const fixtures = JSON.parse(
    readFileSync(join(ROOT, 'public', 'data', 'fixtures.json'), 'utf8'),
  );

  const { data: already, error: selErr } = await supabase
    .from('facilities')
    .select('name')
    .eq('route_id', routeId)
    .eq('source', 'fixture');
  if (selErr) throw selErr;
  const existingNames = new Set((already ?? []).map((r) => r.name));

  const toInsert = fixtures
    .filter((f) => !existingNames.has(f.name))
    .map((f) => ({
      route_id: routeId,
      kind: f.kind,
      name: f.name,
      // WKT point — same assignment-cast mechanism as the route line above.
      location: `POINT(${f.lng} ${f.lat})`,
      // Supplied explicitly so the trigger's planar fallback never fires.
      chainage_km: locateFacility(f.lat, f.lng).chainageKm,
      status: f.status ?? 'open',
      review: 'approved',
      source: 'fixture',
      contact_phone: f.contactPhone ?? null,
      capacity: f.capacity ?? null,
      // offset_m is still left to the trigger — ST_Distance on `geography`
      // is a true geodesic distance and was never affected by the bug.
    }));

  if (toInsert.length === 0) {
    log(`facilities: all ${fixtures.length} fixtures already seeded — repairing chainage…`);
    await repairChainage(routeId);
    return;
  }

  const { data, error } = await supabase.from('facilities').insert(toInsert).select('id, name, chainage_km');
  if (error) throw error;

  log(`facilities: inserted ${data.length} fixture rows`);
  for (const row of data.slice(0, 3)) {
    log(`  e.g. ${row.name} -> chainage_km ${row.chainage_km}`);
  }
}

/**
 * Rewrite chainage for rows that already exist, using the app's engine.
 * Needed for anything seeded before db/fix_chainage_trigger.sql landed,
 * whose values came from the trigger's planar approximation.
 */
async function repairChainage(routeId) {
  const { data, error } = await supabase
    .from('facilities_public')
    .select('id, name, lat, lng, chainage_km')
    .eq('route_id', routeId);
  if (error) throw error;

  let fixed = 0;
  let worst = 0;

  for (const row of data ?? []) {
    const correct = locateFacility(Number(row.lat), Number(row.lng)).chainageKm;
    const drift = correct - Number(row.chainage_km);
    if (Math.abs(drift) < 0.001) continue;

    const { error: upErr } = await supabase
      .from('facilities')
      .update({ chainage_km: correct })
      .eq('id', row.id);
    if (upErr) throw upErr;

    fixed++;
    if (Math.abs(drift) > Math.abs(worst)) worst = drift;
  }

  if (fixed === 0) log('  chainage: all rows already correct.');
  else log(`  chainage: corrected ${fixed} row(s), largest change ${worst.toFixed(3)} km`);
}

const routeId = await ensureRoute();
await seedFixtures(routeId);
log('\nDone.');
