/**
 * GET    /api/v1/admin/locations/[id] — one location
 * PATCH  /api/v1/admin/locations/[id] — partial update
 * DELETE /api/v1/admin/locations/[id] — permanent delete
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { locateFacility } from '@/lib/facilities/chainage-server';
import { isAdminAuthorised } from '@/lib/admin-locations/auth';
import { rowToLocation, locationToRow, type FacilityRow } from '@/lib/admin-locations/mapper';
import { validateUpdate } from '@/lib/admin-locations/validation';
import type { UpdateLocationInput } from '@/lib/admin-locations/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from('facilities_admin')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    console.error('[admin-locations] read failed:', error.message);
    return NextResponse.json({ error: 'Could not load this location' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  return NextResponse.json(rowToLocation(data as FacilityRow));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  let input: UpdateLocationInput;
  try {
    input = (await req.json()) as UpdateLocationInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { valid, errors } = validateUpdate(input);
  if (!valid) {
    return NextResponse.json(
      { error: 'Please correct the highlighted fields', fieldErrors: errors },
      { status: 400 },
    );
  }

  const row = locationToRow(input);
  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  // Moving the pin changes where the location sits along the route, so
  // chainage has to be recomputed — otherwise the user-side "nearest ahead"
  // list would keep ranking it by its old position.
  if (input.latitude !== undefined && input.longitude !== undefined) {
    row.chainage_km = locateFacility(input.latitude, input.longitude).chainageKm;
  }

  const { data, error } = await supabaseAdmin
    .from('facilities')
    .update(row)
    .eq('id', params.id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[admin-locations] update failed:', error.message);
    return NextResponse.json({ error: 'Could not save your changes' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  const { data: updated } = await supabaseAdmin
    .from('facilities_admin')
    .select('*')
    .eq('id', params.id)
    .single();

  return NextResponse.json(rowToLocation(updated as FacilityRow));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  // Select first so a delete of a non-existent id is reported as 404 rather
  // than a silent success — an admin clicking delete twice should be told
  // the second one did nothing.
  const { data: existing } = await supabaseAdmin
    .from('facilities')
    .select('id')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  const { error } = await supabaseAdmin.from('facilities').delete().eq('id', params.id);

  if (error) {
    console.error('[admin-locations] delete failed:', error.message);
    return NextResponse.json({ error: 'Could not delete this location' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
