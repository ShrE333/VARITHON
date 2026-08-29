/**
 * Translation between the database's snake_case row shape and the module's
 * AdminLocation type.
 *
 * Kept in one file so the API layer never hands raw database rows to the
 * client. That matters beyond tidiness: a handler that spread `...row` into
 * a response would leak whatever internal columns the host schema happens to
 * carry, and then accept them back on the next PATCH.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE FILE TO EDIT IF YOUR TABLE LOOKS DIFFERENT.
 *
 * It targets the plain table in db/001_locations.sql — latitude and longitude
 * as two `double precision` columns. If your panel already stores points in
 * PostGIS, MongoDB GeoJSON, or anything else, change `rowToLocation` and
 * `locationToRow` here and nothing else in the module needs to know.
 *
 * (The original Wari implementation wrote a PostGIS geography column with
 * `location = POINT(lng lat)` WKT. That is the only line that differed.)
 * ---------------------------------------------------------------------------
 */

import type { AdminLocation, LocationAvailability, LocationStatus } from './types';

/** One row of the `locations` table. */
export interface LocationRow {
  id: string;
  name: string;
  category: string;
  latitude: number | string;
  longitude: number | string;
  description?: string | null;
  address?: string | null;
  contact_phone?: string | null;
  operating_hours?: string | null;
  additional_info?: string | null;
  /** Operational state: open | full | closed. */
  status?: string | null;
  /** Publication flag. See the note on LocationStatus in types.ts. */
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const AVAILABILITY: LocationAvailability[] = ['open', 'full', 'closed'];

/**
 * Postgres `numeric` and `double precision` come back as strings through
 * some drivers and as numbers through others. Normalise rather than trusting
 * either — a latitude that arrives as "18.52" silently breaks every map.
 */
function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

export function rowToLocation(row: LocationRow): AdminLocation {
  const availability = AVAILABILITY.includes(row.status as LocationAvailability)
    ? (row.status as LocationAvailability)
    : 'open';

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? undefined,
    address: row.address ?? undefined,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    contactNumber: row.contact_phone ?? undefined,
    operatingHours: row.operating_hours ?? undefined,
    additionalInfo: row.additional_info ?? undefined,
    // A row created before is_active existed is treated as published, rather
    // than silently hiding data that used to be visible.
    status: (row.is_active ?? true) ? 'active' : ('inactive' as LocationStatus),
    availability,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/**
 * Only maps fields the module owns. Anything absent from `input` is omitted
 * entirely rather than written as null, so a PATCH of one field cannot blank
 * out the others.
 */
export function locationToRow(input: {
  name?: string;
  category?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contactNumber?: string;
  operatingHours?: string;
  additionalInfo?: string;
  status?: LocationStatus;
  availability?: LocationAvailability;
}): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (input.name !== undefined) row.name = input.name.trim();
  if (input.category !== undefined) row.category = input.category;
  // Empty string means "clear this field"; undefined means "leave alone".
  if (input.description !== undefined) row.description = input.description.trim() || null;
  if (input.address !== undefined) row.address = input.address.trim() || null;
  if (input.contactNumber !== undefined) row.contact_phone = input.contactNumber.trim() || null;
  if (input.operatingHours !== undefined) row.operating_hours = input.operatingHours.trim() || null;
  if (input.additionalInfo !== undefined) row.additional_info = input.additionalInfo.trim() || null;
  if (input.status !== undefined) row.is_active = input.status === 'active';
  if (input.availability !== undefined) row.status = input.availability;

  if (input.latitude !== undefined) row.latitude = input.latitude;
  if (input.longitude !== undefined) row.longitude = input.longitude;

  return row;
}
