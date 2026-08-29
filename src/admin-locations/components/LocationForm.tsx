'use client';

/**
 * Create / edit form.
 *
 * Controlled entirely by props — it owns no data fetching. Pass `initial`
 * to edit, omit it to create; call `onSubmit` and it hands back the result
 * so the parent decides what to do next.
 *
 * Styling uses stock Tailwind utilities only (no project-specific tokens),
 * so it renders correctly in any Tailwind install. Every wrapper takes a
 * className override if the host panel wants its own look.
 */

import { useEffect, useMemo, useState } from 'react';
import { LOCATION_CATEGORIES } from '../categories';
import { validateCreate } from '../validation';
import type {
  AdminLocation,
  CreateLocationInput,
  LocationAvailability,
  LocationStatus,
  ServiceResult,
} from '../types';

export interface LocationFormProps {
  /** Supply to edit an existing record; omit to create a new one. */
  initial?: AdminLocation | null;
  /**
   * Live coordinates from the map. When the admin clicks or drags on the
   * map, the parent passes the new position down here.
   */
  coordinates?: { latitude: number; longitude: number } | null;
  /** Fires when lat/lng are edited by hand, so the map marker can follow. */
  onCoordinatesChange?: (latitude: number, longitude: number) => void;
  /** Fires when the category changes, so the draft marker can re-colour. */
  onCategoryChange?: (category: string) => void;
  onSubmit: (input: CreateLocationInput) => Promise<ServiceResult<AdminLocation>>;
  onCancel?: () => void;
  submitting?: boolean;
  className?: string;
}

const EMPTY = {
  name: '',
  category: 'health_camp',
  description: '',
  address: '',
  latitude: '',
  longitude: '',
  contactNumber: '',
  operatingHours: '',
  additionalInfo: '',
  status: 'active' as LocationStatus,
  availability: 'open' as LocationAvailability,
};

const inputCls =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelCls = 'block text-sm font-medium text-gray-700';
const errCls = 'mt-1 text-xs text-red-600';

export function LocationForm({
  initial,
  coordinates,
  onCoordinatesChange,
  onCategoryChange,
  onSubmit,
  onCancel,
  submitting = false,
  className,
}: LocationFormProps) {
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Reset when switching between records (or from edit back to create).
  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        category: initial.category,
        description: initial.description ?? '',
        address: initial.address ?? '',
        latitude: String(initial.latitude),
        longitude: String(initial.longitude),
        contactNumber: initial.contactNumber ?? '',
        operatingHours: initial.operatingHours ?? '',
        additionalInfo: initial.additionalInfo ?? '',
        status: initial.status,
        availability: initial.availability,
      });
    } else {
      setForm({ ...EMPTY });
    }
    setErrors({});
    setFormError(null);
  }, [initial]);

  // Map click / drag wins over whatever is typed, since it is the more
  // deliberate action of the two.
  useEffect(() => {
    if (!coordinates) return;
    setForm((f) => ({
      ...f,
      latitude: coordinates.latitude.toFixed(6),
      longitude: coordinates.longitude.toFixed(6),
    }));
  }, [coordinates]);

  const set = (key: keyof typeof EMPTY) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  /** Push manually-typed coordinates back up, but only once both parse. */
  function commitManualCoords(latRaw: string, lngRaw: string) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (latRaw.trim() && lngRaw.trim() && Number.isFinite(lat) && Number.isFinite(lng)) {
      onCoordinatesChange?.(lat, lng);
    }
  }

  const payload = useMemo<CreateLocationInput>(
    () => ({
      name: form.name,
      category: form.category,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      description: form.description,
      address: form.address,
      contactNumber: form.contactNumber,
      operatingHours: form.operatingHours,
      additionalInfo: form.additionalInfo,
      status: form.status,
      availability: form.availability,
    }),
    [form],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const { valid, errors: clientErrors } = validateCreate(payload);
    if (!valid) {
      setErrors(clientErrors);
      return;
    }

    const result = await onSubmit(payload);
    if (!result.ok) {
      // The server validates independently; surface its field errors so a
      // rule the client does not know about still lands on the right input.
      setFormError(result.error);
      if (result.fieldErrors) setErrors(result.fieldErrors);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className ?? 'space-y-4'} noValidate>
      {formError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div>
        <label className={labelCls} htmlFor="loc-name">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="loc-name"
          className={inputCls}
          value={form.name}
          onChange={(e) => set('name')(e.target.value)}
          placeholder="e.g. Shri Sai Medical Camp"
        />
        {errors.name && <p className={errCls}>{errors.name}</p>}
      </div>

      <div>
        <label className={labelCls} htmlFor="loc-category">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="loc-category"
          className={inputCls}
          value={form.category}
          onChange={(e) => {
            set('category')(e.target.value);
            onCategoryChange?.(e.target.value);
          }}
        >
          {LOCATION_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
        {errors.category && <p className={errCls}>{errors.category}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="loc-lat">
            Latitude <span className="text-red-500">*</span>
          </label>
          <input
            id="loc-lat"
            className={inputCls}
            value={form.latitude}
            inputMode="decimal"
            onChange={(e) => set('latitude')(e.target.value)}
            onBlur={(e) => commitManualCoords(e.target.value, form.longitude)}
            placeholder="18.520430"
          />
          {errors.latitude && <p className={errCls}>{errors.latitude}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="loc-lng">
            Longitude <span className="text-red-500">*</span>
          </label>
          <input
            id="loc-lng"
            className={inputCls}
            value={form.longitude}
            inputMode="decimal"
            onChange={(e) => set('longitude')(e.target.value)}
            onBlur={(e) => commitManualCoords(form.latitude, e.target.value)}
            placeholder="73.856744"
          />
          {errors.longitude && <p className={errCls}>{errors.longitude}</p>}
        </div>
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        Click anywhere on the map to set these, or drag the marker. You can also type them.
      </p>

      <div>
        <label className={labelCls} htmlFor="loc-address">
          Address
        </label>
        <input
          id="loc-address"
          className={inputCls}
          value={form.address}
          onChange={(e) => set('address')(e.target.value)}
          placeholder="Near bus stand, Saswad"
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="loc-desc">
          Description
        </label>
        <textarea
          id="loc-desc"
          className={inputCls}
          rows={2}
          value={form.description}
          onChange={(e) => set('description')(e.target.value)}
          placeholder="What this place offers"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="loc-phone">
            Contact number
          </label>
          <input
            id="loc-phone"
            className={inputCls}
            type="tel"
            value={form.contactNumber}
            onChange={(e) => set('contactNumber')(e.target.value)}
            placeholder="+91…"
          />
          {errors.contactNumber && <p className={errCls}>{errors.contactNumber}</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="loc-hours">
            Operating hours
          </label>
          <input
            id="loc-hours"
            className={inputCls}
            value={form.operatingHours}
            onChange={(e) => set('operatingHours')(e.target.value)}
            placeholder="24/7 or 6am–10pm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="loc-status">
            Status
          </label>
          <select
            id="loc-status"
            className={inputCls}
            value={form.status}
            onChange={(e) => set('status')(e.target.value)}
          >
            <option value="active">Active — visible to users</option>
            <option value="inactive">Inactive — hidden</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="loc-avail">
            Availability
          </label>
          <select
            id="loc-avail"
            className={inputCls}
            value={form.availability}
            onChange={(e) => set('availability')(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="full">Full</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="loc-extra">
          Additional information
        </label>
        <textarea
          id="loc-extra"
          className={inputCls}
          rows={2}
          value={form.additionalInfo}
          onChange={(e) => set('additionalInfo')(e.target.value)}
          placeholder="Anything else useful"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create location'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
