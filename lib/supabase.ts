import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's newer dashboards issue a "publishable key" (sb_publishable_...)
// instead of the legacy "anon key" — same purpose, different name depending
// on when the project was created. Accept either.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Null when env vars are missing (e.g. local dev before .env.local is set
 * up). Callers must treat Supabase as optional — the app has to work fully
 * offline/without it for M1-M3.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export { ROUTE_SLUG } from './env';
