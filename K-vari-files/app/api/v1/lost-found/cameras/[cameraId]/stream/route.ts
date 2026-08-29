/**
 * MJPEG multipart proxy for a live camera feed.
 *
 * This connection is meant to stay open indefinitely while an admin has the
 * camera tile mounted, not resolve like a normal JSON request — so unlike
 * every other route in this module, it must never buffer the body
 * (`.json()`/`.arrayBuffer()`) and must never apply a fetch timeout. The
 * upstream fetch is given the incoming request's abort signal so that when
 * the admin closes the tile and the browser drops the connection, the
 * Python service's stream generator is told to stop too instead of leaking
 * a connection against its LIVE_DIR polling loop.
 */

import { NextResponse } from 'next/server';
import { getLostFoundBaseUrl } from '@/lib/lost-found/config';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { cameraId: string } }) {
  let upstream: Response;
  try {
    upstream = await fetch(
      `${getLostFoundBaseUrl()}/cameras/${encodeURIComponent(params.cameraId)}/stream`,
      { signal: req.signal },
    );
  } catch {
    return NextResponse.json({ error: 'Lost & Found service is not running' }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Upstream stream error (${upstream.status})` }, { status: 502 });
  }
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-cache, no-store',
    },
  });
}
