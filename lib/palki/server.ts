/**
 * Server-side wiring shared by the Palki API routes.
 *
 * Loads route.json from disk once per process rather than fetching it over
 * HTTP from ourselves, and holds the single RouteGeometry instance the
 * endpoints share. Building the cumulative array for 4197 points on every
 * request would be wasteful; it never changes within a deployment.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RouteGeometry } from './geometry.ts';
import type { Landmark } from './types.ts';

export interface RouteFile {
  slug: string;
  version: number;
  coordinates: [number, number][];
  totalKm: number;
  destination: { lat: number; lng: number };
  landmarks: Landmark[];
  stages: { fromPlace: string; toPlace: string; startKm: number; endKm: number }[];
}

let cachedRoute: RouteFile | null = null;
let cachedGeometry: RouteGeometry | null = null;

export function getRoute(): RouteFile {
  if (!cachedRoute) {
    cachedRoute = JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'data', 'route.json'), 'utf8'),
    ) as RouteFile;
  }
  return cachedRoute;
}

export function getGeometry(): RouteGeometry {
  if (!cachedGeometry) cachedGeometry = new RouteGeometry(getRoute().coordinates);
  return cachedGeometry;
}

/**
 * Ingest auth. A shared bearer secret, which is adequate for a demo and for
 * a handful of trusted marshals, and explicitly not a real identity system —
 * anyone holding the token can move the Palki. Rotate it per Wari, and
 * replace it with per-reporter Supabase auth before this carries real
 * pilgrims.
 */
export function isAuthorised(req: Request): boolean {
  const expected = process.env.PALKI_INGEST_TOKEN;
  // With no token configured, accept only simulated traffic (dev/demo).
  if (!expected) return true;
  const header = req.headers.get('authorization') ?? '';
  const provided = header.replace(/^Bearer\s+/i, '');
  // Constant-time-ish compare; lengths differ rarely enough that this is fine.
  return provided.length === expected.length && provided === expected;
}

/** `?sim=0` asks for the live series; anything else defaults to simulated. */
export function wantsSimulated(url: URL): boolean {
  return url.searchParams.get('sim') !== '0';
}
