/**
 * The category registry — the single source of truth for what categories
 * exist, what they are called, and how they are drawn.
 *
 * TO ADD A CATEGORY: add one entry to LOCATION_CATEGORIES below. That is
 * the whole change — the dropdown, map markers, list badges and filters all
 * read from here. No migration is needed, because `locations.category` is a
 * plain text column rather than a Postgres enum (see db/001_locations.sql
 * for why that trade was made).
 *
 * TO RETIRE A CATEGORY: remove it from this array. Existing rows keep their
 * value and keep working — `categoryOrFallback()` renders anything unknown
 * as "Other" — the category simply stops being offered for new records.
 */

import type { LocationCategory } from './types';

export interface CategoryDefinition {
  id: LocationCategory;
  label: string;
  /** Emoji marker, kept as text so no icon dependency is introduced. */
  icon: string;
  /** Hex, used for map markers and list badges. */
  color: string;
  /**
   * Broad grouping, for panels that want to bucket categories into tabs or
   * sections. Categories with no natural group use 'other'.
   */
  group: 'medical' | 'food' | 'rest' | 'stay' | 'safety' | 'other';
}

export const LOCATION_CATEGORIES: CategoryDefinition[] = [
  { id: 'hospital', label: 'Hospital', icon: '🏥', color: '#dc2626', group: 'medical' },
  { id: 'phc', label: 'Primary Health Centre', icon: '🏥', color: '#dc2626', group: 'medical' },
  { id: 'pharmacy', label: 'Pharmacy', icon: '💊', color: '#e11d48', group: 'medical' },
  { id: 'health_camp', label: 'Medical Camp', icon: '⚕️', color: '#ef4444', group: 'medical' },
  { id: 'ambulance', label: 'Ambulance Point', icon: '🚑', color: '#b91c1c', group: 'medical' },
  { id: 'refreshment_camp', label: 'Food Camp', icon: '🍲', color: '#ea580c', group: 'food' },
  { id: 'water_point', label: 'Water Point', icon: '🚰', color: '#0284c7', group: 'food' },
  { id: 'rest_stop', label: 'Rest Area', icon: '🪑', color: '#65a30d', group: 'rest' },
  { id: 'night_stay', label: 'Night Stay', icon: '🏨', color: '#7c3aed', group: 'stay' },
  { id: 'hotel', label: 'Hotel / Lodge', icon: '🏨', color: '#7c3aed', group: 'stay' },
  { id: 'police', label: 'Police / Security', icon: '👮', color: '#1d4ed8', group: 'safety' },
  { id: 'emergency_help', label: 'Emergency Help', icon: '🆘', color: '#dc2626', group: 'safety' },
  { id: 'toilet', label: 'Toilet', icon: '🚻', color: '#0891b2', group: 'other' },
  { id: 'parking', label: 'Parking', icon: '🅿️', color: '#475569', group: 'other' },
  { id: 'other', label: 'Other', icon: '📍', color: '#64748b', group: 'other' },
];

const BY_ID = new Map(LOCATION_CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: LocationCategory): CategoryDefinition | undefined {
  return BY_ID.get(id);
}

export function isKnownCategory(id: string): boolean {
  return BY_ID.has(id);
}

/**
 * Never throws and never returns undefined — a row whose category was
 * retired from the registry still has to render somehow, so it falls back
 * to a neutral pin rather than crashing the list.
 */
export function categoryOrFallback(id: LocationCategory): CategoryDefinition {
  return BY_ID.get(id) ?? { id, label: id, icon: '📍', color: '#64748b', group: 'other' };
}

export function categoryLabel(id: LocationCategory): string {
  return categoryOrFallback(id).label;
}
