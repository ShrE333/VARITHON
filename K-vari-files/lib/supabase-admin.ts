/**
 * Server-only Supabase client, built from the SERVICE ROLE key.
 *
 * Bypasses row-level security by design. Every caller of this must enforce
 * its own authorization *before* writing — RLS is not the gate here, the
 * API route handler is. See each route for what that gate actually is
 * (a bearer token for Palki ingest; nothing yet for facilities, since that
 * feature intentionally shipped without admin login for now).
 *
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so Next.js strips it
 * from any client bundle at build time. Still: this file must only ever be
 * imported by server-side code (route handlers, or lib modules that are
 * themselves only imported by route handlers). Never import it from a
 * 'use client' component.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Null when the service role key isn't configured. Callers must treat this
 * as optional the same way lib/supabase.ts treats the public client.
 */
export const supabaseAdmin = url && serviceKey ? createClient(url, serviceKey) : null;
