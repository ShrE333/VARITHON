/**
 * Server-side wiring shared by the facilities API routes.
 *
 * The route's Supabase UUID is looked up once per process and cached —
 * mirroring the getRoute()/getGeometry() caching in lib/palki/server.ts —
 * because every facility write needs it as a foreign key, and it never
 * changes within a deployment.
 */

import { supabaseAdmin } from '../supabase-admin';
import { ROUTE_SLUG } from '../env';

export { ADMIN_FACILITY_KINDS, isAdminFacilityKind, type AdminFacilityKind } from '../facilities-kinds';

let cachedRouteId: string | null = null;

/**
 * The Supabase `routes.id` for ROUTE_SLUG, or null if it hasn't been seeded
 * yet (see scripts/seed_facilities.mjs) or the service role key isn't
 * configured. Callers must handle null explicitly rather than assuming a
 * facility write can always succeed.
 */
export async function getRouteId(): Promise<string | null> {
  if (cachedRouteId) return cachedRouteId;
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('routes')
    .select('id')
    .eq('slug', ROUTE_SLUG)
    .maybeSingle();

  if (error || !data) return null;
  cachedRouteId = data.id;
  return cachedRouteId;
}
