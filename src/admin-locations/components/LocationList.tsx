'use client';

/**
 * Table view with search and filters.
 *
 * Pure presentation: it receives the rows it should render and reports what
 * the admin clicked. Filtering logic lives in useLocations() so the map and
 * the table always show the same filtered set.
 *
 * Delete asks for confirmation inline (a second click on the same row)
 * rather than through window.confirm — a native dialog is unstyleable, and
 * some admin panels render inside an iframe where it is suppressed
 * entirely, which would turn delete into a one-click irreversible action.
 */

import { useState } from 'react';
import { LOCATION_CATEGORIES, categoryOrFallback } from '../categories';
import type { AdminLocation, LocationFilters } from '../types';

export interface LocationListProps {
  locations: AdminLocation[];
  loading?: boolean;
  error?: string | null;
  filters?: LocationFilters;
  onFiltersChange?: (f: LocationFilters) => void;
  onSelect?: (location: AdminLocation) => void;
  onEdit?: (location: AdminLocation) => void;
  onDelete?: (location: AdminLocation) => void;
  selectedId?: string | null;
  /** Hide the search/filter bar if the host panel provides its own. */
  showFilters?: boolean;
  className?: string;
}

const inputCls =
  'rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export function LocationList({
  locations,
  loading = false,
  error = null,
  filters = {},
  onFiltersChange,
  onSelect,
  onEdit,
  onDelete,
  selectedId,
  showFilters = true,
  className,
}: LocationListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className={className ?? 'space-y-3'}>
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputCls} min-w-[200px] flex-1`}
            placeholder="Search name, address, description…"
            value={filters.search ?? ''}
            onChange={(e) => onFiltersChange?.({ ...filters, search: e.target.value })}
          />
          <select
            className={inputCls}
            value={filters.category ?? 'all'}
            onChange={(e) => onFiltersChange?.({ ...filters, category: e.target.value })}
          >
            <option value="all">All categories</option>
            {LOCATION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={filters.status ?? 'all'}
            onChange={(e) =>
              onFiltersChange?.({ ...filters, status: e.target.value as LocationFilters['status'] })
            }
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">Loading locations…</div>
      ) : locations.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
          No locations match.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => {
                const cat = categoryOrFallback(loc.category);
                const isConfirming = confirmingId === loc.id;
                return (
                  <tr
                    key={loc.id}
                    onClick={() => onSelect?.(loc)}
                    className={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 ${
                      selectedId === loc.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{loc.name}</div>
                      {loc.address && <div className="text-xs text-gray-500">{loc.address}</div>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.icon} {cat.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          loc.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {loc.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{loc.contactNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(loc);
                          }}
                          className="mr-2 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete &&
                        (isConfirming ? (
                          <span onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                onDelete(loc);
                                setConfirmingId(null);
                              }}
                              className="mr-1 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingId(loc.id);
                            }}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
