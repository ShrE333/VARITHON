/**
 * Server-side chainage for facilities, using the SAME engine the client
 * uses.
 *
 * This exists because of a real bug: the database's compute_chainage
 * trigger derived chainage from ST_LineLocatePoint, which measures in
 * planar degrees, and that disagreed with the browser's turf-based
 * RouteIndex by up to 1.2 km — systematically, always low. See
 * db/fix_chainage_trigger.sql for the full diagnosis.
 *
 * The pilgrim's own chainage is computed by RouteIndex.locate() in the
 * browser, and findNearestAhead() subtracts a facility's chainage from it.
 * The only way those two numbers are guaranteed to be comparable is if the
 * same code produced both — so this imports the identical RouteIndex rather
 * than reimplementing anything. Same argument as the Palki feature's
 * server/client parity: divergence is impossible by construction, so there
 * is no drift to test for.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// Explicit .ts extension so plain `node` can resolve this too — the seed
// script imports this module directly. Same convention as lib/palki/*.
import { RouteIndex } from '../chainage.ts';
import type { RouteBundle } from '../types.ts';

let cached: RouteIndex | null = null;

/** The same RouteIndex the client builds, loaded from disk once per process. */
export function getRouteIndex(): RouteIndex {
  if (cached) return cached;

  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'public', 'data', 'route.json'), 'utf8'),
  );

  const bundle: RouteBundle = {
    id: raw.slug,
    slug: raw.slug,
    name: `${raw.startName} → ${raw.endName}`,
    coordinates: raw.coordinates,
    totalKm: raw.totalKm,
    startName: raw.startName,
    endName: raw.endName,
    destination: raw.destination,
    stages: raw.stages ?? [],
  };

  cached = new RouteIndex(bundle);
  return cached;
}

/** Chainage + offset for a facility pin, matching the client exactly. */
export function locateFacility(lat: number, lng: number): {
  chainageKm: number;
  offsetM: number;
} {
  const pos = getRouteIndex().locate(lat, lng);
  return {
    chainageKm: Number(pos.chainageKm.toFixed(3)),
    offsetM: Number(pos.offsetM.toFixed(2)),
  };
}
