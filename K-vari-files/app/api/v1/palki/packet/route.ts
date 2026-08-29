/**
 * GET /api/v1/palki/packet
 *
 * The offline forecast packet. Small, cacheable, and the only thing a
 * pilgrim's phone needs to keep answering "where is the Palki?" for the next
 * eight hours with no signal at all.
 */

import { NextResponse } from 'next/server';
import { buildPacket } from '@/lib/palki/packet';
import { initialState } from '@/lib/palki/estimator';
import { schedule } from '@/lib/palki/schedule';
import { loadState } from '@/lib/palki/store';
import { getGeometry, getRoute, wantsSimulated } from '@/lib/palki/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const isSimulated = wantsSimulated(url);

  const route = getRoute();
  const geometry = getGeometry();

  // With no observation yet, fall back to the schedule prior at the start of
  // the route. The packet still carries source:'schedule' and a wide sigma,
  // so the UI can label it honestly rather than implying a measurement.
  const state =
    (await loadState(isSimulated)) ?? initialState(0, new Date().toISOString(), isSimulated);

  // Build the packet against the ESTIMATOR'S clock, not the wall clock.
  //
  // In a real deployment these are the same thing. Under the simulator they
  // are not: the sim replays a June Wari day at 300x, so its observations
  // carry June timestamps. Building the packet at wall-clock "now" would
  // make every landmark ETA land in the present day while the observation
  // sat months in the past, and the client would correctly conclude the data
  // was hopelessly stale and refuse to show anything.
  //
  // Anchoring on state.ts keeps the packet internally consistent in whatever
  // timebase produced it. The client then ages it forward at real rate from
  // the moment it was fetched, so staleness still behaves correctly.
  const clockNow = new Date(state.ts);

  const packet = buildPacket(state, geometry, schedule, {
    routeId: route.slug,
    routeVersion: route.version,
    landmarks: route.landmarks,
    now: clockNow,
  });

  return NextResponse.json(packet, {
    headers: {
      // Short max-age: the service worker serves this network-first and falls
      // back to its cache, so we want a fresh copy whenever there is signal.
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
    },
  });
}
