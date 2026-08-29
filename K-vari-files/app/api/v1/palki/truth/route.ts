/**
 * Simulator ground truth. DEMO ONLY.
 *
 * POST records where the simulated Palki really is; GET is read by the demo
 * dashboard to draw the red marker and by the accuracy endpoint to score
 * forecasts.
 *
 * The estimator does not import this module. That separation is the entire
 * basis for the claim that the model has never seen the simulator's internal
 * state, so it is worth keeping literal rather than merely intended.
 */

import { NextResponse } from 'next/server';
import { isAuthorised } from '@/lib/palki/server';
import { recordTruth, truthSeries } from '@/lib/palki/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.sKm !== 'number') {
    return NextResponse.json({ error: 'sKm required' }, { status: 400 });
  }
  recordTruth(
    body.runId ?? 'default',
    body.ts ?? new Date().toISOString(),
    body.sKm,
    body.note,
  );
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const runId = new URL(req.url).searchParams.get('runId') ?? undefined;
  const series = truthSeries(runId);
  return NextResponse.json({
    simulated: true,
    count: series.length,
    // Cap the payload; the dashboard only draws a trailing window.
    series: series.slice(-600),
    latest: series.length ? series[series.length - 1] : null,
  });
}
