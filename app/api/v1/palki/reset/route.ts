/**
 * POST /api/v1/palki/reset — put the demo back at the starting line.
 *
 * Clears the estimator's state, the ping history, the stored forecasts and
 * the simulator's ground truth, so the next `npm run demo` starts from km 0
 * with nothing remembered from a previous rehearsal. Without this, a second
 * run inherits the first run's state and the model appears to teleport.
 *
 * Simulated data only — see resetSimulated() in lib/palki/store.ts.
 *
 * Two guards, because this endpoint destroys data:
 *
 *   1. The PALKI_INGEST_TOKEN bearer check, same as /ping.
 *   2. In production, a token MUST be configured. isAuthorised() deliberately
 *      returns true when no token is set so a laptop demo needs no setup —
 *      that is fine for /ping, which only adds data, and not fine for an
 *      unauthenticated public endpoint whose whole job is deletion.
 */

import { NextResponse } from 'next/server';
import { isAuthorised } from '@/lib/palki/server';
import { resetSimulated } from '@/lib/palki/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.PALKI_INGEST_TOKEN) {
    return NextResponse.json(
      { error: 'reset is disabled in production unless PALKI_INGEST_TOKEN is set' },
      { status: 403 },
    );
  }

  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const report = await resetSimulated();

  return NextResponse.json({
    ok: report.errors.length === 0,
    memoryCleared: true,
    supabase: report.supabase,
    deleted: report.deleted,
    errors: report.errors,
  });
}
