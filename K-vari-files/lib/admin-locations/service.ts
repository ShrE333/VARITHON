/**
 * The service layer. Every network call the module makes lives here.
 *
 * No component imports `fetch` directly — that is what makes this module
 * portable. If the admin panel this drops into talks to a different backend,
 * this is the only file that changes; the hook, the form, the list and the
 * map all keep working unmodified.
 *
 * Never throws. Every function returns a ServiceResult so callers are forced
 * to deal with the failure case — a silent throw inside a form submit
 * handler is how an admin ends up believing a save worked when it did not.
 */

import type {
  AdminLocation,
  CreateLocationInput,
  ServiceResult,
  UpdateLocationInput,
} from './types';

/**
 * Base path for the admin API. Override once at app start if the panel
 * mounts the routes elsewhere:
 *
 *     configureLocationService({ baseUrl: '/api/admin/locations' });
 */
let BASE_URL = '/api/v1/admin/locations';

/**
 * Optional per-request headers, e.g. an auth token from the panel's own
 * session. Called on every request so a refreshed token is picked up.
 */
let getHeaders: () => Record<string, string> = () => ({});

export function configureLocationService(opts: {
  baseUrl?: string;
  headers?: () => Record<string, string>;
}): void {
  if (opts.baseUrl) BASE_URL = opts.baseUrl.replace(/\/$/, '');
  if (opts.headers) getHeaders = opts.headers;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ServiceResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...getHeaders(),
        ...(init?.headers ?? {}),
      },
    });

    // 204 has no body to parse.
    if (res.status === 204) return { ok: true, data: undefined as T };

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        error: body?.error ?? `Request failed (${res.status})`,
        fieldErrors: body?.fieldErrors,
      };
    }
    return { ok: true, data: body as T };
  } catch (err) {
    // fetch() rejects only on network-level failure, which for an admin on
    // a patchy connection is the common case — say so plainly rather than
    // surfacing "Failed to fetch".
    return {
      ok: false,
      error:
        err instanceof TypeError
          ? 'Could not reach the server. Check your connection and try again.'
          : err instanceof Error
            ? err.message
            : 'Unexpected error',
    };
  }
}

export function getLocations(): Promise<ServiceResult<AdminLocation[]>> {
  return request<AdminLocation[]>('');
}

export function getLocationById(id: string): Promise<ServiceResult<AdminLocation>> {
  return request<AdminLocation>(`/${encodeURIComponent(id)}`);
}

export function createLocation(
  input: CreateLocationInput,
): Promise<ServiceResult<AdminLocation>> {
  return request<AdminLocation>('', { method: 'POST', body: JSON.stringify(input) });
}

export function updateLocation(
  id: string,
  input: UpdateLocationInput,
): Promise<ServiceResult<AdminLocation>> {
  return request<AdminLocation>(`/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteLocation(id: string): Promise<ServiceResult<void>> {
  return request<void>(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
