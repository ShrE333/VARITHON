import { NextResponse } from 'next/server';
import { getLostFoundBaseUrl } from '@/lib/lost-found/config';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { caseId: string } }) {
  let upstream: Response;
  try {
    upstream = await fetch(
      `${getLostFoundBaseUrl()}/cases/${encodeURIComponent(params.caseId)}/reference`,
      { cache: 'no-store' },
    );
  } catch {
    return NextResponse.json({ error: 'Lost & Found service is not running' }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Reference image not found' }, { status: upstream.status || 404 });
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg' },
  });
}
