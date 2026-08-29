/**
 * Server-only Supabase client for the Palki estimator's writes.
 *
 * Built from the SERVICE ROLE key, not the public anon/publishable key —
 * deliberately, and it bypasses row-level security by design. That is safe
 * here because authorization already happens one layer up: every write
 * reaches this file only via app/api/v1/palki/*\/route.ts, which gate
 * ingest through isAuthorised() in server.ts (a bearer-token check) before
 * anything is written. db/palki_schema.sql's RLS policies only grant
 * `select` on purpose — writes are meant to come from here, not from a
 * browser holding the public key.
 *
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so Next.js strips it
 * from any client bundle at build time. Still: this file must only ever be
 * imported by lib/palki/store.ts (server route handlers). Never import it
 * from a 'use client' component.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Null when the service role key isn't configured — e.g. local dev before
 * .env.local has it, or a deploy that intentionally runs memory-only.
 * Callers must treat this as optional the same way lib/supabase.ts does.
 */
export const supabaseAdmin = url && serviceKey ? createClient(url, serviceKey) : null;
