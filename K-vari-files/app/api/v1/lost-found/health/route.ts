import { NextResponse } from 'next/server';
import { getLostFoundBaseUrl } from '@/lib/lost-found/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${getLostFoundBaseUrl()}/health`, { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { status: 'unreachable', error: 'Lost & Found service is not running' },
      { status: 502 },
    );
  }
}
