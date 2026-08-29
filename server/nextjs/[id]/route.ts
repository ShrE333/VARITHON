/**
 * Next.js App Router adapter — single location.
 *
 *   GET    /api/v1/admin/locations/:id
 *   PATCH  /api/v1/admin/locations/:id
 *   DELETE /api/v1/admin/locations/:id
 *
 * Drop this at `app/api/v1/admin/locations/[id]/route.ts`.
 *
 * DELETE is permanent. To hide a location recoverably, PATCH it with
 * `{ status: 'inactive' }` — that is what the flag exists for.
 */

import { NextResponse } from 'next/server';
import { getLocation, updateLocation, deleteLocation } from '../../handlers';
import { createSupabaseClient, supabaseLocationStore } from '../../store.supabase';
import { isAdminAuthorised } from '../../../src/admin-locations/auth';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function store() {
  const client = createSupabaseClient();
  return client ? supabaseLocationStore(client) : null;
}

const NOT_CONFIGURED = NextResponse.json(
  { error: 'Database is not configured' },
  { status: 503 },
);

export async function GET(_req: Request, { params }: Params) {
  const s = store();
  if (!s) return NOT_CONFIGURED;

  const { status, body } = await getLocation(s, params.id);
  return NextResponse.json(body, { status });
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isAdminAuthorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const s = store();
  if (!s) return NOT_CONFIGURED;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { status, body } = await updateLocation(s, params.id, payload);
  return NextResponse.json(body, { status });
}

export async function DELETE(req: Request, { params }: Params) {
  if (!(await isAdminAuthorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const s = store();
  if (!s) return NOT_CONFIGURED;

  const { status, body } = await deleteLocation(s, params.id);
  // 204 must not carry a body.
  return status === 204 ? new NextResponse(null, { status }) : NextResponse.json(body, { status });
}
