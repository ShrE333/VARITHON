/**
 * GET /api/v1/palki/route/[version]
 *
 * The polyline and landmarks. ~92 KB, downloaded once and cached
 * immutably — which is the entire reason it is not inlined in the packet.
 * A phone on a 2G edge connection can afford this once; it cannot afford it
 * every ten minutes.
 */

import { NextResponse } from 'next/server';
import { getRoute } from '@/lib/palki/server';

export async function GET(_req: Request, { params }: { params: { version: string } }) {
  const route = getRoute();
  const requested = Number(params.version);

  if (!Number.isFinite(requested)) {
    return NextResponse.json({ error: 'bad version' }, { status: 400 });
  }

  // Asking for a version we no longer have is not an error the client can
  // recover from by retrying — tell it plainly which version to fetch.
  if (requested !== route.version) {
    return NextResponse.json(
      { error: 'unknown route version', currentVersion: route.version },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      version: route.version,
      slug: route.slug,
      totalKm: route.totalKm,
      destination: route.destination,
      coordinates: route.coordinates,
      landmarks: route.landmarks,
      stages: route.stages,
    },
    {
      headers: {
        // Immutable: a given version's geometry never changes. A new trace
        // gets a new version number instead.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  );
}
