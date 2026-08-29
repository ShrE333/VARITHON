/**
 * Validation, shared by the form and the API route.
 *
 * Deliberately importable from both sides. The form uses it to show inline
 * errors before a request is made; the route uses it because a client-side
 * check is a convenience, not a guarantee — anything can POST to the API.
 */

import { isKnownCategory } from './categories';
import type { CreateLocationInput, UpdateLocationInput } from './types';

export interface ValidationResult {
  valid: boolean;
  /** Keyed by field name, ready to render under the matching input. */
  errors: Record<string, string>;
}

export const LAT_RANGE = { min: -90, max: 90 };
export const LNG_RANGE = { min: -180, max: 180 };

/** Basic Indian mobile / landline shape; permissive about spacing and +91. */
const PHONE_RE = /^\+?[\d][\d\s-]{7,17}$/;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function validateCoordinates(lat: unknown, lng: unknown): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isFiniteNumber(lat)) {
    errors.latitude = 'Latitude is required and must be a number';
  } else if (lat < LAT_RANGE.min || lat > LAT_RANGE.max) {
    errors.latitude = `Latitude must be between ${LAT_RANGE.min} and ${LAT_RANGE.max}`;
  }

  if (!isFiniteNumber(lng)) {
    errors.longitude = 'Longitude is required and must be a number';
  } else if (lng < LNG_RANGE.min || lng > LNG_RANGE.max) {
    errors.longitude = `Longitude must be between ${LNG_RANGE.min} and ${LNG_RANGE.max}`;
  }

  // 0,0 is in the Atlantic. It is almost always an uninitialised field
  // rather than a real pin, and it passes every range check, so it is worth
  // catching by name.
  if (isFiniteNumber(lat) && isFiniteNumber(lng) && lat === 0 && lng === 0) {
    errors.latitude = 'Coordinates look unset (0, 0) — pick a point on the map';
  }

  return errors;
}

export function validateCreate(input: Partial<CreateLocationInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name || input.name.trim().length === 0) {
    errors.name = 'Name is required';
  } else if (input.name.trim().length > 200) {
    errors.name = 'Name must be 200 characters or fewer';
  }

  if (!input.category) {
    errors.category = 'Category is required';
  } else if (!isKnownCategory(input.category)) {
    errors.category = `Unknown category "${input.category}"`;
  }

  Object.assign(errors, validateCoordinates(input.latitude, input.longitude));

  if (input.contactNumber && !PHONE_RE.test(input.contactNumber.trim())) {
    errors.contactNumber = 'Enter a valid phone number';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Only validates the fields actually present, so a status-only PATCH is not
 * rejected for "missing name".
 */
export function validateUpdate(input: UpdateLocationInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.name !== undefined) {
    if (input.name.trim().length === 0) errors.name = 'Name cannot be empty';
    else if (input.name.trim().length > 200) errors.name = 'Name must be 200 characters or fewer';
  }

  if (input.category !== undefined && !isKnownCategory(input.category)) {
    errors.category = `Unknown category "${input.category}"`;
  }

  // Coordinates move as a pair, so validate them as one.
  if (input.latitude !== undefined || input.longitude !== undefined) {
    Object.assign(errors, validateCoordinates(input.latitude, input.longitude));
  }

  if (input.contactNumber && !PHONE_RE.test(input.contactNumber.trim())) {
    errors.contactNumber = 'Enter a valid phone number';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Flags a probable duplicate: same-ish name within ~150 m of an existing
 * pin. Advisory only — the caller decides whether to warn or block, because
 * two genuinely different water points can share a name on a long route.
 */
export function findProbableDuplicate<T extends { id: string; name: string; latitude: number; longitude: number }>(
  candidate: { name: string; latitude: number; longitude: number },
  existing: T[],
  metres = 150,
): T | null {
  const name = candidate.name.trim().toLowerCase();

  for (const row of existing) {
    if (row.name.trim().toLowerCase() !== name) continue;
    // Equirectangular approximation: at 150 m the error versus haversine is
    // far below the GPS noise this is meant to absorb.
    const dLat = (row.latitude - candidate.latitude) * 111_320;
    const dLng =
      (row.longitude - candidate.longitude) *
      111_320 *
      Math.cos((candidate.latitude * Math.PI) / 180);
    if (Math.sqrt(dLat * dLat + dLng * dLng) <= metres) return row;
  }
  return null;
}
