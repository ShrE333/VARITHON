/**
 * A LocationStore backed by Supabase. SERVER ONLY.
 *
 * Built from the SERVICE ROLE key, which bypasses row-level security by
 * design — so every caller must enforce its own authorization *before*
 * calling a write. RLS is not the gate here; the route adapter is. See
 * src/admin-locations/auth.ts.
 *
 * SUPABASE_SERVICE_ROLE_KEY deliberately has no NEXT_PUBLIC_ prefix, so Next
 * strips it from any client bundle. Regardless of framework: never import
 * this file from client-side code.
 *
 * Swapping databases means writing one new file against `LocationStore` in
 * handlers.ts. Nothing else in the module changes.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LocationStore } from './handlers';
import type { LocationRow } from '../src/admin-locations/mapper';

const TABLE = 'locations';

/**
 * Null when the service role key is not configured, so a misconfigured
 * deployment fails loudly at the route rather than silently reading nothing.
 */
export function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

/** Supabase reports "no rows" as PGRST116 rather than an empty result. */
const isNotFound = (error: { code?: string } | null) => error?.code === 'PGRST116';

export function supabaseLocationStore(client: SupabaseClient): LocationStore {
  return {
    async list() {
      const { data, error } = await client
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as LocationRow[];
    },

    async get(id) {
      const { data, error } = await client.from(TABLE).select('*').eq('id', id).single();
      if (error) {
        if (isNotFound(error)) return null;
        throw new Error(error.message);
      }
      return data as LocationRow;
    },

    async create(row) {
      const { data, error } = await client.from(TABLE).insert(row).select('*').single();
      if (error) throw new Error(error.message);
      return data as LocationRow;
    },

    async update(id, row) {
      const { data, error } = await client
        .from(TABLE)
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) {
        if (isNotFound(error)) return null;
        throw new Error(error.message);
      }
      return data as LocationRow;
    },

    async remove(id) {
      // `select()` so the result tells us whether a row actually matched —
      // a delete on a missing id is not an error in Postgres, and the caller
      // needs to be able to answer 404 rather than a cheerful 204.
      const { data, error } = await client.from(TABLE).delete().eq('id', id).select('id');
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },
  };
}
