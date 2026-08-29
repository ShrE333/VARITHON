/**
 * The five location operations, with no web framework in sight.
 *
 * Each function takes plain arguments and returns `{ status, body }`. It
 * never touches a Request, a Response, `res.json()`, or anything else that
 * would tie it to Express, Next, Fastify or Remix. Those live in the thin
 * adapters under server/nextjs/ and server/express/.
 *
 * Two seams, both deliberate:
 *
 *   - `LocationStore` is the database. Implement it against Supabase (there
 *     is one in store.supabase.ts), Prisma, Drizzle, raw pg, or Mongo, and
 *     nothing above it changes.
 *   - Authorization is NOT done here. The adapter decides whether a caller
 *     is an admin before calling `create` / `update` / `remove`, because the
 *     answer lives in the host panel's session, which this file cannot see.
 *
 * Validation IS done here rather than in the adapter, on purpose: it is the
 * same `validateCreate` the form runs, so the client and the server can
 * never disagree about what a valid location is.
 */

import { validateCreate, validateUpdate } from '../src/admin-locations/validation';
import { rowToLocation, locationToRow, type LocationRow } from '../src/admin-locations/mapper';
import type { AdminLocation, CreateLocationInput, UpdateLocationInput } from '../src/admin-locations/types';

export interface HandlerResult {
  status: number;
  /** Absent for 204. */
  body?: AdminLocation | AdminLocation[] | { error: string; fieldErrors?: Record<string, string> };
}

/**
 * Everything the handlers need from a database. Implementations should throw
 * on infrastructure failure — the handlers convert that into a 500 — and
 * return null for "no such row" rather than throwing.
 */
export interface LocationStore {
  /** Every location, including inactive ones. Newest first. */
  list(): Promise<LocationRow[]>;
  get(id: string): Promise<LocationRow | null>;
  create(row: Record<string, unknown>): Promise<LocationRow>;
  update(id: string, row: Record<string, unknown>): Promise<LocationRow | null>;
  /** True if a row was deleted, false if the id did not exist. */
  remove(id: string): Promise<boolean>;
}

const failed = (error: string, status = 500): HandlerResult => ({ status, body: { error } });

// ---------------------------------------------------------------- reads

export async function listLocations(store: LocationStore): Promise<HandlerResult> {
  try {
    const rows = await store.list();
    return { status: 200, body: rows.map(rowToLocation) };
  } catch (err) {
    console.error('[admin-locations] list failed:', err);
    return failed('Could not load locations');
  }
}

export async function getLocation(store: LocationStore, id: string): Promise<HandlerResult> {
  try {
    const row = await store.get(id);
    if (!row) return failed('No such location', 404);
    return { status: 200, body: rowToLocation(row) };
  } catch (err) {
    console.error('[admin-locations] get failed:', err);
    return failed('Could not load this location');
  }
}

// --------------------------------------------------------------- writes

export async function createLocation(store: LocationStore, body: unknown): Promise<HandlerResult> {
  const input = body as CreateLocationInput;
  const { valid, errors } = validateCreate(input);
  if (!valid) {
    return {
      status: 400,
      body: { error: 'Please correct the highlighted fields', fieldErrors: errors },
    };
  }

  try {
    const row = await store.create({
      ...locationToRow(input),
      // Defaults live here, not in the mapper: the mapper's contract is
      // "only write what was supplied", which is what makes PATCH safe.
      status: input.availability ?? 'open',
      is_active: (input.status ?? 'active') === 'active',
    });
    return { status: 201, body: rowToLocation(row) };
  } catch (err) {
    console.error('[admin-locations] create failed:', err);
    return failed('Could not save this location');
  }
}

export async function updateLocation(
  store: LocationStore,
  id: string,
  body: unknown,
): Promise<HandlerResult> {
  const input = body as UpdateLocationInput;
  const { valid, errors } = validateUpdate(input);
  if (!valid) {
    return {
      status: 400,
      body: { error: 'Please correct the highlighted fields', fieldErrors: errors },
    };
  }

  const row = locationToRow(input);
  if (Object.keys(row).length === 0) {
    return failed('Nothing to update', 400);
  }

  try {
    const updated = await store.update(id, row);
    if (!updated) return failed('No such location', 404);
    return { status: 200, body: rowToLocation(updated) };
  } catch (err) {
    console.error('[admin-locations] update failed:', err);
    return failed('Could not save this location');
  }
}

/**
 * Hard delete. To hide a location recoverably, PATCH `status: 'inactive'`
 * instead — that is what the flag is for.
 */
export async function deleteLocation(store: LocationStore, id: string): Promise<HandlerResult> {
  try {
    const existed = await store.remove(id);
    if (!existed) return failed('No such location', 404);
    return { status: 204 };
  } catch (err) {
    console.error('[admin-locations] delete failed:', err);
    return failed('Could not delete this location');
  }
}
