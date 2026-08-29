/**
 * Plain env constants with no library imports attached — kept separate from
 * lib/supabase.ts so that reading ROUTE_SLUG doesn't drag the entire
 * @supabase/supabase-js SDK into every page's bundle. route-data.ts (used
 * app-wide, including the fully-offline M1 home screen) needs the slug but
 * has no business pulling in the Supabase client.
 */

export const ROUTE_SLUG = process.env.NEXT_PUBLIC_ROUTE_SLUG || 'dnyaneshwar-2026';
