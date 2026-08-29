'use client';

/**
 * The drop-in component: list + map + form, wired together.
 *
 *     <LocationManagement />
 *
 * Renders no page chrome — no header, no nav, no background, no fixed
 * widths. It fills whatever container it is placed in, so it can sit inside
 * an existing admin layout without fighting it.
 *
 * If a different arrangement is needed, use LocationList / LocationMap /
 * LocationForm directly; this file is a reasonable default composition of
 * them, not the only way to assemble them.
 */

import { useCallback, useMemo, useState } from 'react';
import { useLocations } from '@/lib/admin-locations/useLocations';
import { LocationList } from './LocationList';
import { LocationForm } from './LocationForm';
import { LocationMap } from './LocationMap';
import type { AdminLocation, CreateLocationInput } from '@/lib/admin-locations/types';

export interface LocationManagementProps {
  /** Map height in px. Default 420. */
  mapHeight?: number;
  className?: string;
  /** Called after any successful create/update/delete. */
  onChange?: () => void;
}

type Mode = { kind: 'idle' } | { kind: 'create' } | { kind: 'edit'; location: AdminLocation };

export function LocationManagement({
  mapHeight = 420,
  className,
  onChange,
}: LocationManagementProps) {
  const { filtered, loading, error, filters, setFilters, create, update, remove, mutating } =
    useLocations();

  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ latitude: number; longitude: number } | null>(null);
  const [draftCategory, setDraftCategory] = useState('health_camp');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const editing = mode.kind === 'edit' ? mode.location : null;
  const formOpen = mode.kind !== 'idle';

  const flash = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const startCreate = () => {
    setMode({ kind: 'create' });
    setDraft(null);
    setSelectedId(null);
  };

  const startEdit = (location: AdminLocation) => {
    setMode({ kind: 'edit', location });
    setDraft({ latitude: location.latitude, longitude: location.longitude });
    setDraftCategory(location.category);
    setSelectedId(location.id);
  };

  const closeForm = () => {
    setMode({ kind: 'idle' });
    setDraft(null);
  };

  const handleSubmit = useCallback(
    async (input: CreateLocationInput) => {
      const result = editing ? await update(editing.id, input) : await create(input);
      if (result.ok) {
        flash('ok', editing ? 'Location updated.' : 'Location created.');
        closeForm();
        onChange?.();
      }
      // On failure the form renders the error itself; returning it
      // unchanged is what lets it map fieldErrors onto the right inputs.
      return result;
    },
    [editing, update, create, flash, onChange],
  );

  const handleDelete = useCallback(
    async (location: AdminLocation) => {
      const result = await remove(location.id);
      if (result.ok) {
        flash('ok', `Deleted "${location.name}".`);
        if (editing?.id === location.id) closeForm();
        onChange?.();
      } else {
        flash('err', result.error);
      }
    },
    [remove, editing, flash, onChange],
  );

  /**
   * Clicking the map only sets coordinates while a form is open. Otherwise
   * a stray click on the map would silently arm a draft pin the admin never
   * asked for.
   */
  const handleMapClick = useCallback(
    (latitude: number, longitude: number) => {
      if (!formOpen) return;
      setDraft({ latitude, longitude });
    },
    [formOpen],
  );

  const mapCenter = useMemo<[number, number] | undefined>(
    () => (draft ? [draft.latitude, draft.longitude] : undefined),
    [draft],
  );

  return (
    <div className={className ?? 'space-y-4'}>
      {toast && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            toast.kind === 'ok'
              ? 'border border-green-300 bg-green-50 text-green-800'
              : 'border border-red-300 bg-red-50 text-red-800'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          {filtered.length} location{filtered.length === 1 ? '' : 's'}
        </p>
        {!formOpen && (
          <button
            onClick={startCreate}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add location
          </button>
        )}
      </div>

      <div className={formOpen ? 'grid gap-4 lg:grid-cols-2' : 'space-y-4'}>
        {formOpen && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-gray-800">
              {editing ? 'Edit location' : 'New location'}
            </h3>
            <LocationForm
              initial={editing}
              coordinates={draft}
              onCoordinatesChange={(latitude, longitude) => setDraft({ latitude, longitude })}
              onCategoryChange={setDraftCategory}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              submitting={mutating}
            />
          </div>
        )}

        <div className={formOpen ? '' : 'w-full'}>
          <LocationMap
            locations={filtered}
            selectedId={selectedId}
            draftPosition={draft}
            draftCategory={draftCategory}
            onMapClick={handleMapClick}
            onMarkerDrag={(latitude, longitude) => setDraft({ latitude, longitude })}
            onMarkerClick={setSelectedId}
            center={mapCenter}
            zoom={draft ? 15 : undefined}
            height={mapHeight}
          />
          {formOpen && (
            <p className="mt-2 text-xs text-gray-500">
              Click the map to place the pin, or drag it to fine-tune.
            </p>
          )}
        </div>
      </div>

      <LocationList
        locations={filtered}
        loading={loading}
        error={error}
        filters={filters}
        onFiltersChange={setFilters}
        onSelect={(l) => setSelectedId(l.id)}
        onEdit={startEdit}
        onDelete={handleDelete}
        selectedId={selectedId}
      />
    </div>
  );
}
