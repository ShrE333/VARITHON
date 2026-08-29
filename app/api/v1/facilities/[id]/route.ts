/**
 * PATCH /api/v1/facilities/[id] — status toggle (open/full/closed).
 *
 * No ownership check — there is no login, so there is nothing to check
 * against. This is a real, deliberate limitation of the "no admin login"
 * phase: anyone holding a facility's id can toggle its status. It is not
 * hidden — see README's facilities section. Once real auth exists, this
 * route should switch from the service-role client to the public client
 * plus a session check, letting db/schema.sql's existing
 * facilities_owner_update RLS policy do the enforcement it was already
 * written for.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['open', 'full', 'closed'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'database not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'status must be open, full, or closed' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('facilities')
    .update({ status: body.status })
    .eq('id', params.id)
    .select('id, status')
    .maybeSingle();

  if (error) {
    console.error('[facilities] status update failed:', error.message);
    return NextResponse.json({ error: 'could not update' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ id: data.id, status: data.status });
}
