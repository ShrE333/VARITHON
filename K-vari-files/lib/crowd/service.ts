/**
 * Service layer for the Crowd Congestion admin UI, proxied through
 * /api/v1/crowd/*. Never throws — returns a ServiceResult.
 */

import type { CrowdCamera, CrowdMap, CrowdZone, ServiceResult } from './types';

const BASE = '/api/v1/crowd';

async function requestJson<T>(path: string): Promise<ServiceResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: body?.error ?? `Request failed (${res.status})` };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: 'Could not reach the Crowd Congestion service. Is it running on port 8200?' };
  }
}

export function getHealth() {
  return requestJson<{ status: string; module: string }>('/health');
}

export function getCameras(): Promise<ServiceResult<CrowdCamera[]>> {
  return requestJson<CrowdCamera[]>('/cameras');
}

export function getZones(): Promise<ServiceResult<CrowdZone[]>> {
  return requestJson<CrowdZone[]>('/zones');
}

export function getMap(): Promise<ServiceResult<CrowdMap>> {
  return requestJson<CrowdMap>('/map');
}

/** URL builder, not a fetcher — feeds a polled <img> tag directly. */
export function cameraFrameUrl(cameraId: string): string {
  return `${BASE}/cameras/${encodeURIComponent(cameraId)}/frame`;
}
