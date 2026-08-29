/**
 * GET  /api/v1/lost-found/cases — proxy to the Python service's case registry.
 * POST /api/v1/lost-found/cases — create a case; forwards the multipart body
 * (photo + fields) through untouched, no decode/re-encode.
 */

import { NextResponse } from 'next/server';
import { getLostFoundBaseUrl } from '@/lib/lost-found/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${getLostFoundBaseUrl()}/cases`, { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Lost & Found service is not running' }, { status: 502 });
  }
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  try {
    const res = await fetch(`${getLostFoundBaseUrl()}/cases`, { method: 'POST', body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({ error: body?.detail ?? 'Could not create case' }, { status: res.status });
    }
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Lost & Found service is not running' }, { status: 502 });
  }
}
