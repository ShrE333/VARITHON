/**
 * Service layer for the Lost & Found admin UI. Every network call the
 * module makes lives here, going through the Next.js proxy under
 * /api/v1/lost-found/* rather than the Python service directly.
 *
 * Never throws — every function returns a ServiceResult so callers must
 * deal with the failure case explicitly.
 */

import type {
  CreateCaseInput,
  LostFoundAlert,
  LostFoundCamera,
  LostFoundCase,
  ServiceResult,
  Sighting,
} from './types';

const BASE = '/api/v1/lost-found';

async function requestJson<T>(path: string, init?: RequestInit): Promise<ServiceResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, init);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: body?.error ?? `Request failed (${res.status})` };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: 'Could not reach the Lost & Found service. Is it running on port 8000?' };
  }
}

export function getHealth() {
  return requestJson<{ status: string; version: string; triton_ready: boolean }>('/health');
}

export function getCases(): Promise<ServiceResult<LostFoundCase[]>> {
  return requestJson<LostFoundCase[]>('/cases');
}

export function createCase(input: CreateCaseInput): Promise<ServiceResult<LostFoundCase>> {
  const fd = new FormData();
  fd.append('photo', input.photo);
  fd.append('name', input.name);
  if (input.age) fd.append('age', input.age);
  if (input.last_seen) fd.append('last_seen', input.last_seen);
  if (input.reporter_contact) fd.append('reporter_contact', input.reporter_contact);
  return requestJson<LostFoundCase>('/cases', { method: 'POST', body: fd });
}
// FUTURE (not implemented yet — no WAHA/GCS integration code exists here):
// a WhatsApp report will land a photo in a GCP bucket instead of a manual
// upload. That will need a new route, e.g. POST /api/v1/lost-found/cases/from-url,
// that downloads the GCS object server-side and re-posts it as multipart to
// the Python /cases endpoint (it only accepts an uploaded file, not a URL).

export function closeCase(caseId: string): Promise<ServiceResult<LostFoundCase>> {
  return requestJson<LostFoundCase>(`/cases/${encodeURIComponent(caseId)}/close`, { method: 'POST' });
}

export function getAlerts(status?: string, limit = 100): Promise<ServiceResult<LostFoundAlert[]>> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  return requestJson<LostFoundAlert[]>(`/alerts?${params.toString()}`);
}

export function confirmAlert(alertId: number): Promise<ServiceResult<LostFoundAlert>> {
  return requestJson<LostFoundAlert>(`/alerts/${alertId}/confirm`, { method: 'POST' });
}

export function rejectAlert(alertId: number): Promise<ServiceResult<LostFoundAlert>> {
  return requestJson<LostFoundAlert>(`/alerts/${alertId}/reject`, { method: 'POST' });
}

export function getCameras(): Promise<ServiceResult<LostFoundCamera[]>> {
  return requestJson<LostFoundCamera[]>('/cameras');
}

export function getSightings(caseId?: string, limit = 100): Promise<ServiceResult<Sighting[]>> {
  const params = new URLSearchParams();
  if (caseId) params.set('case_id', caseId);
  params.set('limit', String(limit));
  return requestJson<Sighting[]>(`/sightings?${params.toString()}`);
}

// URL builders, not fetchers — these feed <img>/stream tags directly.
export function referenceImageUrl(caseId: string): string {
  return `${BASE}/cases/${encodeURIComponent(caseId)}/reference`;
}

export function evidenceImageUrl(alertId: number): string {
  return `${BASE}/alerts/${alertId}/evidence`;
}

export function cameraStreamUrl(cameraId: string): string {
  return `${BASE}/cameras/${encodeURIComponent(cameraId)}/stream`;
}
