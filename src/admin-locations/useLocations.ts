'use client';

/**
 * State + CRUD for the location list.
 *
 * Deliberately depends on nothing but React and ./service — no app context,
 * no i18n provider, no router. Drop it into any admin panel and it works.
 *
 * Mutations are optimistic-free on purpose: an admin needs to know a save
 * actually persisted, so the list only changes after the server confirms.
 * The one exception is delete, which is reverted if the server rejects it.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from './service';
import type {
  AdminLocation,
  CreateLocationInput,
  LocationFilters,
  ServiceResult,
  UpdateLocationInput,
} from './types';

export interface UseLocationsResult {
  locations: AdminLocation[];
  /** `locations` with the current filters applied. */
  filtered: AdminLocation[];
  loading: boolean;
  /** Load error. Mutation errors come back in the mutation's return value. */
  error: string | null;
  filters: LocationFilters;
  setFilters: (f: LocationFilters) => void;
  refresh: () => Promise<void>;
  create: (input: CreateLocationInput) => Promise<ServiceResult<AdminLocation>>;
  update: (id: string, input: UpdateLocationInput) => Promise<ServiceResult<AdminLocation>>;
  remove: (id: string) => Promise<ServiceResult<void>>;
  /** True while any create/update/delete is in flight. */
  mutating: boolean;
}

export function useLocations(initialFilters: LocationFilters = {}): UseLocationsResult {
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [filters, setFilters] = useState<LocationFilters>(initialFilters);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getLocations();
    if (result.ok) {
      setLocations(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (input: CreateLocationInput) => {
    setMutating(true);
    const result = await createLocation(input);
    if (result.ok) setLocations((prev) => [result.data, ...prev]);
    setMutating(false);
    return result;
  }, []);

  const update = useCallback(async (id: string, input: UpdateLocationInput) => {
    setMutating(true);
    const result = await updateLocation(id, input);
    if (result.ok) {
      setLocations((prev) => prev.map((l) => (l.id === id ? result.data : l)));
    }
    setMutating(false);
    return result;
  }, []);

  const remove = useCallback(
    async (id: string) => {
      setMutating(true);
      // Optimistic, because a delete that appears to hang is worse than one
      // that visibly reverts. Snapshot first so it can be put back.
      const snapshot = locations;
      setLocations((prev) => prev.filter((l) => l.id !== id));

      const result = await deleteLocation(id);
      if (!result.ok) setLocations(snapshot);

      setMutating(false);
      return result;
    },
    [locations],
  );

  const filtered = useMemo(() => {
    const term = filters.search?.trim().toLowerCase();
    return locations.filter((l) => {
      if (filters.category && filters.category !== 'all' && l.category !== filters.category) {
        return false;
      }
      if (filters.status && filters.status !== 'all' && l.status !== filters.status) {
        return false;
      }
      if (term) {
        const haystack = [l.name, l.address, l.description].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [locations, filters]);

  return {
    locations,
    filtered,
    loading,
    error,
    filters,
    setFilters,
    refresh,
    create,
    update,
    remove,
    mutating,
  };
}
