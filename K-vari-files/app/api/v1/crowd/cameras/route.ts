import { NextResponse } from 'next/server';
import { getCrowdBaseUrl } from '@/lib/crowd/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${getCrowdBaseUrl()}/cameras`, { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Crowd Congestion service is not running' }, { status: 502 });
  }
}
