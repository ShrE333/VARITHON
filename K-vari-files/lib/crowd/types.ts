/** Crowd Congestion (varimitra_crowd_v1) — data model, mirrors app/main.py's response shapes. */

export type CongestionLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type Point = [number, number];

export interface CrowdZone {
  zone_id: string;
  name: string;
  capacity: number;
  polygon: Point[];
  people_count?: number;
  occupancy?: number;
  level?: CongestionLevel;
}

export interface CrowdCamera {
  camera_id: string;
  location: string;
  source?: string | number;
  enabled?: boolean;
  map_quad: Point[];
  online?: boolean;
  fps?: number;
  detected_people?: number;
}

export interface CrowdMap {
  width: number;
  height: number;
  zones: CrowdZone[];
  cameras: CrowdCamera[];
}

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };
