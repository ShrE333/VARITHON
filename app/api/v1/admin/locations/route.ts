/**
 * GET  /api/v1/admin/locations — every location, including inactive ones.
 * POST /api/v1/admin/locations — create.
 *
 * Reads go through the service-role client and the facilities_admin view
 * because the admin panel must see inactive rows, which the public view
 * hides by definition.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRouteId } from '@/lib/facilities/server';
import { locateFacility } from '@/lib/facilities/chainage-server';
import { isAdminAuthorised } from '@/lib/admin-locations/auth';
import { rowToLocation, locationToRow, type FacilityRow } from '@/lib/admin-locations/mapper';
import { validateCreate } from '@/lib/admin-locations/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  const routeId = await getRouteId();
  if (!routeId) {
    return NextResponse.json(
      { error: 'Route not seeded — run scripts/seed_facilities.mjs' },
      { status: 503 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('facilities_admin')
    .select('*')
    .eq('route_id', routeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin-locations] list failed:', error.message);
    return NextResponse.json({ error: 'Could not load locations' }, { status: 500 });
  }

  return NextResponse.json((data as FacilityRow[]).map(rowToLocation));
}

export async function POST(req: Request) {
  if (!(await isAdminAuthorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const input = body as Parameters<typeof validateCreate>[0];
  const { valid, errors } = validateCreate(input);
  if (!valid) {
    return NextResponse.json(
      { error: 'Please correct the highlighted fields', fieldErrors: errors },
      { status: 400 },
    );
  }

  const routeId = await getRouteId();
  if (!routeId) {
    return NextResponse.json(
      { error: 'Route not seeded — run scripts/seed_facilities.mjs' },
      { status: 503 },
    );
  }

  // Chainage is computed here with the same turf engine the pilgrim's
  // browser uses. The database trigger's planar approximation disagrees by
  // up to 1.2 km, and the user-side "nearest ahead" search subtracts one
  // from the other — see db/fix_chainage_trigger.sql.
  const { chainageKm } = locateFacility(input.latitude!, input.longitude!);

  const row = {
    ...locationToRow(input),
    route_id: routeId,
    chainage_km: chainageKm,
    // Admin-entered locations are published immediately; the review
    // workflow exists in the schema but has no UI yet.
    review: 'approved',
    source: 'admin',
    status: input.availability ?? 'open',
    is_active: (input.status ?? 'active') === 'active',
  };

  const { data, error } = await supabaseAdmin
    .from('facilities')
    .insert(row)
    .select('id')
    .single();

  if (error) {
    console.error('[admin-locations] create failed:', error.message);
    return NextResponse.json({ error: 'Could not save this location' }, { status: 500 });
  }

  // Read back through the view so the response carries the trigger-derived
  // columns (offset_m) and the same shape every other endpoint returns.
  const { data: created } = await supabaseAdmin
    .from('facilities_admin')
    .select('*')
    .eq('id', data.id)
    .single();

  return NextResponse.json(rowToLocation(created as FacilityRow), { status: 201 });
}
