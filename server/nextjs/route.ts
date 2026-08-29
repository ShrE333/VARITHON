/**
 * Next.js App Router adapter.
 *
 *   GET  /api/v1/admin/locations — every location, including inactive ones
 *   POST /api/v1/admin/locations — create
 *
 * Drop this at `app/api/v1/admin/locations/route.ts` in the host panel.
 * If you mount it somewhere else, tell the client once at app start:
 *
 *     configureLocationService({ baseUrl: '/your/path' });
 *
 * Everything below is plumbing. The actual behaviour is in ../handlers.ts,
 * which knows nothing about Next — that is what makes this feature portable
 * to Express, Remix, Fastify or a Vite dev server.
 *
 * GET is intentionally unauthenticated to match the original module. If the
 * host panel is behind a login (it should be), gate it the same way as the
 * writes below.
 */

import { NextResponse } from 'next/server';
import { listLocations, createLocation } from '../handlers';
import { createSupabaseClient, supabaseLocationStore } from '../store.supabase';
import { isAdminAuthorised } from '../../src/admin-locations/auth';

export const dynamic = 'force-dynamic';

function store() {
  const client = createSupabaseClient();
  return client ? supabaseLocationStore(client) : null;
}

const NOT_CONFIGURED = NextResponse.json(
  { error: 'Database is not configured' },
  { status: 503 },
);

export async function GET() {
  const s = store();
  if (!s) return NOT_CONFIGURED;

  const { status, body } = await listLocations(s);
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
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

  const { status, body } = await createLocation(s, payload);
  return NextResponse.json(body, { status });
}
