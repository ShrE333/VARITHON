/**
 * Translation between the database's snake_case row shape and the module's
 * AdminLocation type.
 *
 * Kept in one file so the API routes never hand raw database rows to the
 * client. That matters beyond tidiness: the rows carry columns the admin UI
 * has no business seeing or round-tripping (owner_id, review, osm_id,
 * route_id), and a route that spread `...row` into a response would leak
 * them and then accept them back on the next PATCH.
 */

import type { AdminLocation, LocationAvailability, LocationStatus } from './types';

export interface FacilityRow {
  id: string;
  kind: string;
  name: string;
  lat: number | string;
  lng: number | string;
  chainage_km?: number | string | null;
  offset_m?: number | string | null;
  status?: string | null;
  is_active?: boolean | null;
  contact_phone?: string | null;
  description?: string | null;
  address?: string | null;
  operating_hours?: string | null;
  additional_info?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const AVAILABILITY: LocationAvailability[] = ['open', 'full', 'closed'];

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}

export function rowToLocation(row: FacilityRow): AdminLocation {
  const availability = AVAILABILITY.includes(row.status as LocationAvailability)
    ? (row.status as LocationAvailability)
    : 'open';

  return {
    id: row.id,
    name: row.name,
    category: row.kind,
    description: row.description ?? undefined,
    address: row.address ?? undefined,
    latitude: num(row.lat),
    longitude: num(row.lng),
    contactNumber: row.contact_phone ?? undefined,
    operatingHours: row.operating_hours ?? undefined,
    additionalInfo: row.additional_info ?? undefined,
    // Older rows predate is_active; treat a missing value as published
    // rather than silently hiding data that used to be visible.
    status: (row.is_active ?? true) ? 'active' : ('inactive' as LocationStatus),
    availability,
    chainageKm: row.chainage_km == null ? undefined : num(row.chainage_km),
    offsetM: row.offset_m == null ? undefined : num(row.offset_m),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

/**
 * Only maps fields the admin module owns. Anything absent from `input` is
 * omitted entirely rather than written as null, so a PATCH of one field
 * cannot blank out the others.
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
  if (input.category !== undefined) row.kind = input.category;
  // Empty string means "clear this field"; undefined means "leave alone".
  if (input.description !== undefined) row.description = input.description.trim() || null;
  if (input.address !== undefined) row.address = input.address.trim() || null;
  if (input.contactNumber !== undefined) row.contact_phone = input.contactNumber.trim() || null;
  if (input.operatingHours !== undefined) row.operating_hours = input.operatingHours.trim() || null;
  if (input.additionalInfo !== undefined) row.additional_info = input.additionalInfo.trim() || null;
  if (input.status !== undefined) row.is_active = input.status === 'active';
  if (input.availability !== undefined) row.status = input.availability;

  if (input.latitude !== undefined && input.longitude !== undefined) {
    // PostGIS parses WKT assigned straight into a geography column.
    row.location = `POINT(${input.longitude} ${input.latitude})`;
  }

  return row;
}
