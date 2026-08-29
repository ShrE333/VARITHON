'use client';

/**
 * The admin-side write path: submit a camp, queue it if offline, flush the
 * queue on reconnect, and remember what this browser has submitted so far
 * (there is no login yet, so "my camps" can only mean "submitted from this
 * device" — see app/admin/page.tsx for that tradeoff spelled out).
 */

import { db, type NewCampPayload, type PendingCampSubmission } from './db';
import type { FacilityKind, FacilityStatus } from './types';

const FACILITIES_ENDPOINT = '/api/v1/facilities';

async function postCamp(payload: NewCampPayload): Promise<{ id: string }> {
  const res = await fetch(FACILITIES_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export type SubmitResult =
  | { status: 'saved'; id: string }
  | { status: 'queued' }
  | { status: 'error'; message: string };

/**
 * Try to submit immediately; if the network fails (or we already know we're
 * offline), queue it in Dexie instead rather than losing the submission.
 * Distinguishes "queued because offline" from "server rejected it" — a
 * validation error (e.g. GPS accuracy too poor) should surface to the admin
 * immediately, not silently queue and fail again later.
 */
export async function submitCamp(payload: NewCampPayload): Promise<SubmitResult> {
  try {
    const { id } = await postCamp(payload);
    addLocalSubmission({ id, name: payload.name, kind: payload.kind, status: 'open' });
    return { status: 'saved', id };
  } catch (err) {
    // A validation error (400) came from the server actually responding —
    // that's not a connectivity problem, so don't queue it, surface it.
    if (err instanceof Error && /accuracy|required|must be/.test(err.message)) {
      return { status: 'error', message: err.message };
    }
    if (db) {
      await db.pendingCamps.add({
        clientId: crypto.randomUUID(),
        payload,
        createdAt: Date.now(),
        status: 'queued',
      });
    }
    return { status: 'queued' };
  }
}

/** Retry every queued submission. Called on reconnect. */
export async function flushPendingCamps(): Promise<number> {
  if (!db) return 0;
  const queued = await db.pendingCamps.where('status').equals('queued').toArray();
  let synced = 0;

  for (const item of queued) {
    try {
      const { id } = await postCamp(item.payload);
      await db.pendingCamps.delete(item.id!);
      addLocalSubmission({ id, name: item.payload.name, kind: item.payload.kind, status: 'open' });
      synced++;
    } catch (err) {
      await db.pendingCamps.update(item.id!, {
        status: 'queued',
        lastError: err instanceof Error ? err.message : 'sync failed',
      });
    }
  }
  return synced;
}

export async function pendingCampCount(): Promise<number> {
  if (!db) return 0;
  return db.pendingCamps.where('status').equals('queued').count();
}

// ------------------------------------------------- local "my submissions"

export interface MySubmission {
  id: string;
  name: string;
  kind: FacilityKind;
  status: FacilityStatus;
}

const LOCAL_KEY = 'wari-saathi-my-camps';

export function getLocalSubmissions(): MySubmission[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addLocalSubmission(sub: MySubmission): void {
  try {
    const all = getLocalSubmissions().filter((s) => s.id !== sub.id);
    all.unshift(sub);
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(0, 50)));
  } catch {
    // localStorage unavailable (private mode, etc) — the submission still
    // succeeded server-side, only the local "my camps" convenience is lost.
  }
}

export function updateLocalSubmissionStatus(id: string, status: FacilityStatus): void {
  try {
    const all = getLocalSubmissions().map((s) => (s.id === id ? { ...s, status } : s));
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    // same as above — non-fatal.
  }
}

export type { PendingCampSubmission };
