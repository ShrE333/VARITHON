/**
 * Lost & Found (varimitra_lost_person_v6) — data model.
 *
 * Shapes mirror the FastAPI service's own response bodies (registry.py,
 * db.py) as closely as possible rather than inventing a different naming
 * convention — this is a thin admin UI over that service, not an
 * abstraction over it.
 */

export type CaseStatus = 'ACTIVE' | 'CLOSED';
export type AlertStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface LostFoundCase {
  case_id: string;
  name: string;
  age?: string | null;
  last_seen?: string | null;
  reporter_contact?: string | null;
  status: CaseStatus;
  created_at: string;
  closed_at?: string | null;
}

export interface CreateCaseInput {
  photo: File;
  name: string;
  age?: string;
  last_seen?: string;
  reporter_contact?: string;
}

export interface LostFoundAlert {
  alert_id: number;
  case_id: string;
  name: string;
  similarity: number;
  camera_id: string;
  camera_location: string;
  timestamp: string;
  evidence_image: string;
  track_id?: number | null;
  status: AlertStatus;
  reviewed_at?: string | null;
}

export interface LostFoundCamera {
  camera_id: string;
  camera_location: string;
  source?: string;
  online: boolean;
  fps?: number;
  faces?: number;
  matched_faces?: number;
  last_seen?: string;
  error?: string | null;
}

export interface Sighting {
  sighting_id: number;
  alert_id: number;
  case_id: string;
  name: string;
  similarity: number;
  camera_id: string;
  camera_location: string;
  track_id?: number | null;
  timestamp: string;
  evidence_image: string;
}

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };
