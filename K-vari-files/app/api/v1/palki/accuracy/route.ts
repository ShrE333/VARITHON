/**
 * GET /api/v1/palki/accuracy
 *
 * Mean absolute error per forecast horizon — the number the demo dashboard
 * is judged on, and the one a sharp judge will ask for first.
 *
 * Scoring is done here rather than on a timer: every request grades whatever
 * forecasts have come due since the last call, against the simulator's
 * recorded truth.
 */

import { NextResponse } from 'next/server';
import { SCORED_HORIZONS_MIN } from '@/lib/palki/estimator';
import { allScores, scoreDueForecasts, truthAt } from '@/lib/palki/store';
import { wantsSimulated } from '@/lib/palki/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const isSimulated = wantsSimulated(new URL(req.url));

  await scoreDueForecasts(truthAt, isSimulated);
  const scores = allScores();

  const byHorizon = SCORED_HORIZONS_MIN.map((horizonMin) => {
    const rows = scores.filter((s) => s.horizonMin === horizonMin);
    const n = rows.length;
    const mae = n ? rows.reduce((a, s) => a + s.errorKm, 0) / n : null;
    const worst = n ? Math.max(...rows.map((s) => s.errorKm)) : null;
    return {
      horizonMin,
      n,
      maeKm: mae === null ? null : Math.round(mae * 1000) / 1000,
      worstKm: worst === null ? null : Math.round(worst * 1000) / 1000,
    };
  });

  return NextResponse.json({
    isSimulated,
    // Stated in the payload, not just the UI, so it travels with the data.
    disclosure: isSimulated
      ? 'Scored against a simulator the estimator cannot see. No real Wari data.'
      : 'Scored against reported ground truth.',
    horizons: byHorizon,
    totalScored: scores.length,
    series: scores.slice(-400).map((s) => ({
      horizonMin: s.horizonMin,
      errorKm: Math.round(s.errorKm * 1000) / 1000,
      issuedAt: s.issuedAt,
    })),
  });
}
