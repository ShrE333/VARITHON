/**
 * POST /api/v1/palki/ping
 *
 * Ingest ground truth. Accepts a BATCH with client timestamps, because the
 * volunteer's phone loses signal exactly where the Palki does and has to
 * store and forward.
 */

import { NextResponse } from 'next/server';
import { initialState, namedForecasts, replay } from '@/lib/palki/estimator';
import { schedule } from '@/lib/palki/schedule';
import { loadState, savePings, saveState, saveForecasts } from '@/lib/palki/store';
import { getGeometry, isAuthorised } from '@/lib/palki/server';
import type { Ping } from '@/lib/palki/types';

export const dynamic = 'force-dynamic';

interface Body {
  pings?: Partial<Ping>[];
  /** Single-ping convenience form. */
  lat?: number;
  lng?: number;
  tsDevice?: string;
  source?: Ping['source'];
  isSimulated?: boolean;
  reporterId?: string;
}

export async function POST(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const raw = body.pings ?? (body.lat !== undefined ? [body] : []);
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: 'no pings' }, { status: 400 });
  }

  const pings: Ping[] = [];
  for (const p of raw) {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    const ts = p.tsDevice ?? new Date().toISOString();
    if (Number.isNaN(new Date(ts).getTime())) continue;
    pings.push({
      tsDevice: new Date(ts).toISOString(),
      lat: p.lat,
      lng: p.lng,
      source: p.source ?? 'gps',
      reporterId: p.reporterId ?? body.reporterId,
      isSimulated: p.isSimulated ?? body.isSimulated ?? true,
    });
  }

  if (pings.length === 0) {
    return NextResponse.json({ error: 'no valid pings' }, { status: 400 });
  }

  const isSimulated = pings[0]!.isSimulated;
  const geometry = getGeometry();

  const previous =
    (await loadState(isSimulated)) ??
    initialState(
      // Cold start: anchor on the earliest ping rather than assuming km 0,
      // so a demo that begins mid-route does not spend an hour catching up.
      geometry.clampS(
        geometry.project(pings[0]!.lat, pings[0]!.lng).s,
      ),
      new Date(new Date(pings[0]!.tsDevice).getTime() - 1000).toISOString(),
      isSimulated,
    );

  // Sort and replay rather than taking the newest: the intermediate pings
  // carry the speed evidence, and processing them out of order would compute
  // negative time gaps and poison beta.
  const next = replay(previous, pings, geometry, schedule);

  await savePings(
    pings,
    pings.map((p) => geometry.project(p.lat, p.lng, { expectedS: next.sKm }).s),
  );
  await saveState(next);

  // Persist the named horizons so they can be scored once their moment
  // arrives. Without this the accuracy panel would have nothing to grade.
  const named = namedForecasts(next, geometry, schedule);
  await saveForecasts(named, next.ts, isSimulated);

  return NextResponse.json({
    accepted: pings.length,
    state: {
      sKm: Math.round(next.sKm * 1000) / 1000,
      vKmph: Math.round(next.vKmph * 1000) / 1000,
      beta: Math.round(next.beta * 1000) / 1000,
      sigmaKm: Math.round(next.sigmaKm * 1000) / 1000,
      ts: next.ts,
    },
  });
}
