/**
 * Local persistence (Dexie/IndexedDB).
 *
 * Three jobs:
 *  - mirror route.json / facilities so M1-M3 read from disk, not network
 *  - queue M4 camp submissions made offline until they can sync
 *  - remember cache ages so the offline banner can say how stale things are
 */

import Dexie, { type Table } from 'dexie';
import type { Facility, FacilityKind, RouteBundle } from './types';
import type { Packet } from './palki/types';

export interface CachedRouteBundle {
  slug: string;
  bundle: RouteBundle;
  cachedAt: number;
}

export interface CachedFacility extends Facility {
  /** 'fixture' | 'osm' | 'admin' — provenance, not shown to pilgrims. */
  source: string;
  cachedAt: number;
}

export interface NewCampPayload {
  kind: FacilityKind;
  name: string;
  lat: number;
  lng: number;
  fixAccuracyM: number;
  contactPhone?: string;
  capacity?: number;
  opensAt?: string;
  closesAt?: string;
  ownerId: string;
}

export interface PendingCampSubmission {
  id?: number;
  clientId: string;
  payload: NewCampPayload;
  createdAt: number;
  status: 'queued' | 'syncing' | 'failed';
  lastError?: string;
}

/**
 * A ring buffer of recent packets, newest last.
 *
 * Kept as a short history rather than a single slot so that a refresh which
 * half-fails, or a server briefly returning something malformed, can never
 * leave a pilgrim in a dead zone with nothing at all. The previous packet is
 * still a usable answer for hours.
 */
export interface CachedPacket {
  id?: number;
  routeSlug: string;
  packet: Packet;
  fetchedAt: number;
}

export interface KVEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}

class WariDB extends Dexie {
  routeBundles!: Table<CachedRouteBundle, string>;
  facilities!: Table<CachedFacility, string>;
  pendingCamps!: Table<PendingCampSubmission, number>;
  kv!: Table<KVEntry, string>;
  packets!: Table<CachedPacket, number>;

  constructor() {
    super('wari-saathi');
    this.version(1).stores({
      routeBundles: 'slug',
      facilities: 'id, kind, chainageKm, status, source',
      pendingCamps: '++id, clientId, status',
      kv: 'key',
    });
    // v2 adds the Palki forecast packet cache. Dexie applies this to
    // existing databases automatically; earlier stores are unchanged.
    this.version(2).stores({
      packets: '++id, routeSlug, fetchedAt',
    });
  }
}

// Dexie touches indexedDB at construction time; guard for SSR/build.
export const db: WariDB | null = typeof window !== 'undefined' ? new WariDB() : null;

export async function getKV<T>(key: string): Promise<{ value: T; updatedAt: number } | null> {
  if (!db) return null;
  const row = await db.kv.get(key);
  return row ? { value: row.value as T, updatedAt: row.updatedAt } : null;
}

export async function setKV(key: string, value: unknown): Promise<void> {
  if (!db) return;
  await db.kv.put({ key, value, updatedAt: Date.now() });
}

/** How many packets to keep. Enough to survive a few bad refreshes. */
const PACKET_HISTORY = 5;

export async function savePacket(routeSlug: string, packet: Packet): Promise<void> {
  if (!db) return;
  await db.packets.add({ routeSlug, packet, fetchedAt: Date.now() });
  const all = await db.packets.where('routeSlug').equals(routeSlug).sortBy('fetchedAt');
  if (all.length > PACKET_HISTORY) {
    const stale = all.slice(0, all.length - PACKET_HISTORY).map((p) => p.id!);
    await db.packets.bulkDelete(stale);
  }
}

/** The newest cached packet, or null if we have never successfully fetched one. */
export async function loadLatestPacket(routeSlug: string): Promise<CachedPacket | null> {
  if (!db) return null;
  const all = await db.packets.where('routeSlug').equals(routeSlug).sortBy('fetchedAt');
  return all.length ? all[all.length - 1]! : null;
}

/** Cached route geometry, keyed by version so an old one is never reused. */
export async function saveRouteGeometry(version: number, data: unknown): Promise<void> {
  await setKV(`palki-route-v${version}`, data);
}

export async function loadRouteGeometry<T>(version: number): Promise<T | null> {
  const row = await getKV<T>(`palki-route-v${version}`);
  return row ? row.value : null;
}
