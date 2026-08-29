/**
 * Kinds an admin may register directly. No 'use client'/'use server' —
 * plain data, safe to import from either side.
 *
 * Deliberately excludes hospital/phc/pharmacy (OSM-sourced only) — see
 * db/schema.sql's own comments marking those "permanent, from OSM" vs.
 * these "temporary, admin-registered".
 */

import type { FacilityKind } from './types';

export const ADMIN_FACILITY_KINDS = [
  'health_camp',
  'refreshment_camp',
  'rest_stop',
  'night_stay',
] as const satisfies readonly FacilityKind[];

export type AdminFacilityKind = (typeof ADMIN_FACILITY_KINDS)[number];

export function isAdminFacilityKind(kind: string): kind is AdminFacilityKind {
  return (ADMIN_FACILITY_KINDS as readonly string[]).includes(kind);
}
