import { NextResponse } from 'next/server';
import { getCrowdBaseUrl } from '@/lib/crowd/config';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { cameraId: string } }) {
  let upstream: Response;
  try {
    upstream = await fetch(
      `${getCrowdBaseUrl()}/cameras/${encodeURIComponent(params.cameraId)}/frame`,
      { cache: 'no-store' },
    );
  } catch {
    return NextResponse.json({ error: 'Crowd Congestion service is not running' }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'No live frame yet' }, { status: upstream.status || 404 });
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
