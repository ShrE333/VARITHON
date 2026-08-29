#!/usr/bin/env node
/**
 * Sync facility contact_phone values in Supabase from public/data/fixtures.json.
 *
 *     node scripts/update_phones.mjs
 *
 * Matches rows by name (the same key seed_facilities.mjs dedupes on) and
 * only writes where the number actually differs, so it's safe to re-run.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvLocal() {
  const text = readFileSync(join(ROOT, '.env.local'), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnvLocal();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const slug = env.NEXT_PUBLIC_ROUTE_SLUG || 'dnyaneshwar-2026';

const fixtures = JSON.parse(readFileSync(join(ROOT, 'public/data/fixtures.json'), 'utf8'));

const { data: route } = await supabase.from('routes').select('id').eq('slug', slug).maybeSingle();
if (!route) {
  console.error('route not seeded — run scripts/seed_facilities.mjs first');
  process.exit(2);
}

const { data: rows, error } = await supabase
  .from('facilities')
  .select('id, name, contact_phone')
  .eq('route_id', route.id);
if (error) throw error;

// fixtures.json can contain several facilities sharing a display name
// (e.g. three "Civil Hospital" rows along the route), so pair them up in
// order rather than by name alone.
const byName = new Map();
for (const f of fixtures) {
  if (!byName.has(f.name)) byName.set(f.name, []);
  byName.get(f.name).push(f);
}
const cursor = new Map();

let updated = 0;
for (const row of rows ?? []) {
  const bucket = byName.get(row.name);
  if (!bucket) continue;
  const i = cursor.get(row.name) ?? 0;
  cursor.set(row.name, i + 1);
  const fixture = bucket[i] ?? bucket[bucket.length - 1];
  const want = fixture.contactPhone ?? null;

  if ((row.contact_phone ?? null) === want) continue;

  const { error: upErr } = await supabase
    .from('facilities')
    .update({ contact_phone: want })
    .eq('id', row.id);
  if (upErr) throw upErr;
  updated++;
}

console.log(`updated ${updated} row(s)`);

const { data: after } = await supabase
  .from('facilities')
  .select('contact_phone')
  .eq('route_id', route.id)
  .not('contact_phone', 'is', null);

const counts = {};
for (const r of after ?? []) counts[r.contact_phone] = (counts[r.contact_phone] ?? 0) + 1;
console.log('\nnumbers now in the database:');
for (const [n, c] of Object.entries(counts).sort()) console.log(`  ${n}  -> ${c} facilities`);
