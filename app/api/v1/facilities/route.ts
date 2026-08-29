/**
 * POST /api/v1/facilities — camp admin registration.
 *
 * NO AUTH GATE, deliberately, for now. There is no admin login yet — the
 * user asked for the simplest path ("let the admin add directly"). Anyone
 * who can reach this URL can create a facility. That is an accepted,
 * explicit tradeoff for this phase, not an oversight: db/schema.sql's RLS
 * already has the real, owner-gated security model built in and ready
 * (facilities_owner_insert requires auth.uid() = owner_id) — this route
 * bypasses it via the service-role client rather than fighting it, so that
 * turning on real admin login later is a matter of adding auth here and
 * switching this route to the public anon client, not a schema change.
 *
 * Writes review: 'approved' directly, which is ONLY correct because there
 * is no approval gate in front of this yet either (also user-requested:
 * "new spots appear instantly"). If an approval step ever gets built, this
 * line is the first thing to change.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRouteId } from '@/lib/facilities/server';
import { locateFacility } from '@/lib/facilities/chainage-server';
import { isAdminFacilityKind } from '@/lib/facilities-kinds';

export const dynamic = 'force-dynamic';

interface Body {
  kind?: string;
  name?: string;
  lat?: number;
  lng?: number;
  fixAccuracyM?: number;
  contactPhone?: string;
  capacity?: number;
  opensAt?: string;
  closesAt?: string;
}

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'database not configured' }, { status: 503 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body.kind || !isAdminFacilityKind(body.kind)) {
    return NextResponse.json(
      { error: 'kind must be one of health_camp, refreshment_camp, rest_stop, night_stay' },
      { status: 400 },
    );
  }
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'lat/lng are required' }, { status: 400 });
  }
  if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
    return NextResponse.json({ error: 'lat/lng must be finite numbers' }, { status: 400 });
  }

  // Same accuracy floor sampleStablePosition() enforces client-side — a
  // second check here because the client's guarantee is only as good as
  // whatever actually sent this request.
  if (typeof body.fixAccuracyM === 'number' && body.fixAccuracyM > 25) {
    return NextResponse.json(
      { error: `fix accuracy too poor (${body.fixAccuracyM}m > 25m) — move to open sky and retry` },
      { status: 400 },
    );
  }

  const routeId = await getRouteId();
  if (!routeId) {
    return NextResponse.json(
      { error: 'route not seeded — run scripts/seed_facilities.mjs' },
      { status: 503 },
    );
  }

  // Computed here, with the same turf engine the browser uses, rather than
  // left to the database trigger — the trigger's planar approximation
  // disagrees with the client by up to 1.2 km. See
  // lib/facilities/chainage-server.ts.
  const { chainageKm } = locateFacility(body.lat, body.lng);

  const { data, error } = await supabaseAdmin
    .from('facilities')
    .insert({
      route_id: routeId,
      kind: body.kind,
      name: body.name.trim(),
      location: `POINT(${body.lng} ${body.lat})`,
      chainage_km: chainageKm,
      status: 'open',
      review: 'approved',
      source: 'admin',
      owner_id: null,
      contact_phone: body.contactPhone || null,
      capacity: body.capacity ?? null,
      opens_at: body.opensAt || null,
      closes_at: body.closesAt || null,
      fix_accuracy_m: body.fixAccuracyM ?? null,
    })
    .select('id, chainage_km, offset_m')
    .single();

  if (error) {
    console.error('[facilities] insert failed:', error.message);
    return NextResponse.json({ error: 'could not save' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, chainageKm: data.chainage_km, offsetM: data.offset_m });
}
