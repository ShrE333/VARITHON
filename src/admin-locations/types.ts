/**
 * Admin Location Management — data model.
 *
 * Framework-agnostic: plain types, no React, no Supabase, no Next.js. Safe
 * to import from a server route, a client component, or a test.
 */

/**
 * A category id.
 *
 * Typed as `string` rather than a closed union on purpose: the brief asks
 * that new categories be addable later, and a union would force every
 * consumer to recompile against a new literal type. The runtime registry in
 * categories.ts is the source of truth; use `isKnownCategory()` to validate.
 */
export type LocationCategory = string;

/** Whether the record is published to end users at all. */
export type LocationStatus = 'active' | 'inactive';

/**
 * Operational state, distinct from `status`.
 *
 * A location can be `active` (published, appears in the app) while being
 * `closed` right now (out of supplies, shut for the night). Collapsing the
 * two would make "hide this bad record" indistinguishable from "this place
 * is closed today".
 */
export type LocationAvailability = 'open' | 'full' | 'closed';

export interface AdminLocation {
  id: string;
  name: string;
  category: LocationCategory;
  description?: string;
  address?: string;
  latitude: number;
  longitude: number;
  contactNumber?: string;
  operatingHours?: string;
  additionalInfo?: string;
  status: LocationStatus;
  availability: LocationAvailability;
  createdAt?: string;
  updatedAt?: string;
}

/** Fields accepted when creating. The server assigns id and timestamps. */
export interface CreateLocationInput {
  name: string;
  category: LocationCategory;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
  contactNumber?: string;
  operatingHours?: string;
  additionalInfo?: string;
  status?: LocationStatus;
  availability?: LocationAvailability;
}

/** Every field optional — send only what changed. */
export type UpdateLocationInput = Partial<CreateLocationInput>;

export interface LocationFilters {
  /** Case-insensitive match against name, address and description. */
  search?: string;
  category?: LocationCategory | 'all';
  status?: LocationStatus | 'all';
}

/** Discriminated result so callers handle failure explicitly. */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
