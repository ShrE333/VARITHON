/**
 * Step 1 verification for lib/palki/geometry.ts.
 *
 * Run: npm run test:geometry   (plain node — Node 24 strips types natively,
 * so there is no test framework or transpiler dependency here.)
 *
 * The prompt asked for a server/client parity test, but server and client
 * import the same module here, so that test would assert nothing. What we
 * check instead is that this module agrees with @turf/nearest-point-on-line
 * — the engine M1/M2/M3 already rely on — to within one metre.
 *
 * With one deliberate exception. About 15 km of this route is walked twice
 * (the palkhi detours into Lonand, Taradgaon, Phaltan, Barad and Velapur and
 * returns along the same road), so on those stretches a coordinate maps to
 * two valid chainages that are exactly zero metres apart. turf returns one
 * of them arbitrarily. Asserting it returns *ours* would be asserting
 * something unsatisfiable, so there we assert what is actually true — that
 * both answers describe the same physical point — and separately test that
 * `project({ priorS })` picks the right pass.
 */

import { readFileSync } from 'node:fs';
import { RouteGeometry, haversineKm } from '../lib/palki/geometry.ts';
import { RouteIndex } from '../lib/chainage.ts';
import type { RouteBundle } from '../lib/types.ts';

const bundle = JSON.parse(
  readFileSync(new URL('../public/data/route.json', import.meta.url), 'utf8'),
) as RouteBundle;

const geometry = new RouteGeometry(bundle.coordinates);
const index = new RouteIndex(bundle);

let failures = 0;
let checks = 0;

function check(name: string, ok: boolean, detail = '') {
  checks++;
  if (!ok) {
    failures++;
    console.error(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------- totals
section('totals');
check(
  'totalKm matches route.json',
  Math.abs(geometry.totalKm - bundle.totalKm) < 0.001,
  `geometry ${geometry.totalKm.toFixed(4)} vs bundle ${bundle.totalKm}`,
);
check('point count matches', geometry.pointCount === bundle.coordinates.length);
console.log(`  ${geometry.pointCount} points, ${geometry.totalKm.toFixed(3)} km`);

// -------------------------------------------------------- monotonicity
section('cumulative array is non-decreasing');
{
  const cum = geometry.cumulative;
  let worstBackstep = 0;
  for (let i = 1; i < cum.length; i++) {
    const delta = cum[i]! - cum[i - 1]!;
    if (delta < worstBackstep) worstBackstep = delta;
  }
  check('never goes backwards', worstBackstep >= 0, `worst step ${worstBackstep}`);
  check('starts at zero', cum[0] === 0);
}

// --------------------------------------------------------------- parity
section('parity with @turf/nearest-point-on-line (100 samples, 1 m tolerance)');
{
  const SAMPLES = 100;
  let worstOffsetM = 0;
  let worstPointDriftM = 0;
  let ambiguous = 0;

  for (let i = 0; i < SAMPLES; i++) {
    const s = (geometry.totalKm * (i + 0.5)) / SAMPLES;
    const p = geometry.positionAt(s);
    const back = index.locate(p.lat, p.lng);

    // 1. The point must lie ON the line. This is the real assertion, and it
    //    holds everywhere.
    if (back.offsetM > worstOffsetM) worstOffsetM = back.offsetM;

    // 2. turf's chainage must describe the SAME PHYSICAL PLACE. Where the
    //    route walks the same road twice, turf may legitimately name the
    //    other pass — both are zero metres away and it has no way to choose.
    //    Demanding it return our s would be asserting something unsatisfiable,
    //    so we assert the thing that is actually true: the coordinates agree.
    const driftM = haversineKm(p, geometry.positionAt(back.chainageKm)) * 1000;
    if (driftM > worstPointDriftM) worstPointDriftM = driftM;

    if (Math.abs(back.chainageKm - s) > 0.001) ambiguous++;
  }

  check('sampled points lie on the line', worstOffsetM < 1.0, `worst offset ${worstOffsetM.toFixed(3)} m`);
  check(
    'turf chainage maps back to the same point',
    worstPointDriftM < 1.0,
    `worst drift ${worstPointDriftM.toFixed(3)} m`,
  );
  console.log(`  worst offset from line: ${worstOffsetM.toFixed(4)} m`);
  console.log(`  worst point drift:      ${worstPointDriftM.toFixed(4)} m`);
  console.log(`  samples where turf named the other pass: ${ambiguous}/${SAMPLES}`);
}

// --------------------------------------------------- projection candidates
section('projection and self-overlap disambiguation');
{
  // Unambiguous stretches: our own projection must match turf closely.
  let worstAgreeM = 0;
  let singleCandidate = 0;
  for (let i = 0; i < 100; i++) {
    const s = (geometry.totalKm * (i + 0.5)) / 100;
    const p = geometry.positionAt(s);
    const cands = geometry.projectCandidates(p.lat, p.lng);
    if (cands.length === 1) {
      singleCandidate++;
      const turfS = index.locate(p.lat, p.lng).chainageKm;
      const diffM = Math.abs(cands[0]!.s - turfS) * 1000;
      if (diffM > worstAgreeM) worstAgreeM = diffM;
    }
  }
  check(
    'where unambiguous, project agrees with turf within 1 m',
    worstAgreeM < 1.0,
    `worst ${worstAgreeM.toFixed(3)} m`,
  );
  console.log(`  ${singleCandidate}/100 samples had a single candidate; worst disagreement ${worstAgreeM.toFixed(4)} m`);

  // Barad is walked twice: once around km 165, again around km 178.
  const baradPoint = geometry.positionAt(178.48);
  const cands = geometry.projectCandidates(baradPoint.lat, baradPoint.lng);
  check('doubled-back point yields more than one candidate', cands.length >= 2, `got ${cands.length}`);
  console.log(`  Barad point candidates: ${cands.map((c) => c.s.toFixed(1) + ' km').join(', ')}`);

  // The expected position is what resolves it. Note this is where we think
  // the subject IS NOW, not where it was last seen — scoring against a stale
  // position picks the candidate behind it and marches the estimate
  // backwards. See ProjectOptions.
  const outbound = geometry.project(baradPoint.lat, baradPoint.lng, { expectedS: 164 });
  const inbound = geometry.project(baradPoint.lat, baradPoint.lng, { expectedS: 178 });
  check('expected 164 km selects the outbound pass', Math.abs(outbound.s - 165) < 2, `got ${outbound.s.toFixed(2)}`);
  check('expected 178 km selects the return pass', Math.abs(inbound.s - 178.5) < 2, `got ${inbound.s.toFixed(2)}`);
  check('the two passes are actually different', Math.abs(outbound.s - inbound.s) > 5);
  console.log(`  expected 164 km -> ${outbound.s.toFixed(2)} km; expected 178 km -> ${inbound.s.toFixed(2)} km`);

  // minS encodes "a walking palanquin does not reverse".
  const floored = geometry.project(baradPoint.lat, baradPoint.lng, { expectedS: 166, minS: 175 });
  check('minS rules out candidates behind the subject', floored.s > 175, `got ${floored.s.toFixed(2)}`);

  // A point well off the road still projects sensibly.
  const off = geometry.project(17.9525 + 0.02, 74.6187, {});
  check('off-road point reports a real offset', off.offsetM > 1000 && off.offsetM < 4000, `${off.offsetM.toFixed(0)} m`);
}

// ----------------------------------------------------------- round trip
section('round trip s to latlng to s is stable');
{
  let worstDriftM = 0;
  for (let i = 0; i < 100; i++) {
    const s = (geometry.totalKm * (i + 0.5)) / 100;
    const p1 = geometry.positionAt(s);
    const s2 = index.locate(p1.lat, p1.lng).chainageKm;
    const p2 = geometry.positionAt(s2);
    const driftM = haversineKm(p1, p2) * 1000;
    if (driftM > worstDriftM) worstDriftM = driftM;
  }
  check('drift under 1 m', worstDriftM < 1.0, `worst ${worstDriftM.toFixed(3)} m`);
  console.log(`  worst round-trip drift: ${worstDriftM.toFixed(4)} m`);
}

// ---------------------------------------------------------------- edges
section('endpoints and clamping');
{
  const start = geometry.positionAt(0);
  const first = bundle.coordinates[0]!;
  check(
    's=0 is the first vertex (Alandi)',
    haversineKm(start, { lat: first[1], lng: first[0] }) * 1000 < 0.1,
  );

  const end = geometry.positionAt(geometry.totalKm);
  const last = bundle.coordinates[bundle.coordinates.length - 1]!;
  check(
    's=totalKm is the last vertex',
    haversineKm(end, { lat: last[1], lng: last[0] }) * 1000 < 0.1,
  );

  // The route is built to end at the temple, so the far end of the line and
  // the declared destination must agree. If this ever fails, the forecast
  // would be clamping to somewhere that is not Pandharpur.
  const toTempleM = haversineKm(end, bundle.destination) * 1000;
  check('line ends at the declared destination', toTempleM < 50, `${toTempleM.toFixed(1)} m away`);
  console.log(`  end of line to declared temple: ${toTempleM.toFixed(1)} m`);

  const before = geometry.positionAt(-25);
  check('negative s clamps to the start', haversineKm(before, start) * 1000 < 0.1);

  const after = geometry.positionAt(geometry.totalKm + 500);
  check('s past the end clamps to the temple', haversineKm(after, end) * 1000 < 0.1);

  check(
    'clampS bounds both ways',
    geometry.clampS(-5) === 0 && geometry.clampS(1e6) === geometry.totalKm,
  );
  check('clampS survives NaN', geometry.clampS(Number.NaN) === 0);
}

// ------------------------------------------------------------- segments
section('segment lookup');
{
  const cum = geometry.cumulative;
  let ok = true;
  for (let i = 0; i < 200; i++) {
    const s = (geometry.totalKm * i) / 200;
    const seg = geometry.segmentIndexFor(s);
    // s must actually fall inside the segment we were handed.
    if (!(cum[seg]! <= s + 1e-9 && s <= cum[seg + 1]! + 1e-9)) ok = false;
  }
  check('segmentIndexFor brackets s correctly', ok);
  check(
    'last segment index is in range',
    geometry.segmentIndexFor(geometry.totalKm) === geometry.pointCount - 2,
  );
}

// -------------------------------------------------------------- bearing
section('bearing');
{
  const b = geometry.bearingAt(geometry.totalKm / 2);
  check('bearing is a valid compass angle', b >= 0 && b < 360, `got ${b}`);
  console.log(`  bearing at midpoint: ${b.toFixed(1)} deg`);
}

// ---------------------------------------------------------------- slice
section('slice between two arc lengths');
{
  const slice = geometry.sliceLatLngs(100, 110);
  check('slice has interpolated ends plus interior vertices', slice.length > 2);

  const head = { lat: slice[0]![0], lng: slice[0]![1] };
  const tail = { lat: slice[slice.length - 1]![0], lng: slice[slice.length - 1]![1] };
  check('slice starts at fromKm', haversineKm(head, geometry.positionAt(100)) * 1000 < 0.1);
  check('slice ends at toKm', haversineKm(tail, geometry.positionAt(110)) * 1000 < 0.1);

  // Its own measured length should be close to the 10 km we asked for.
  let len = 0;
  for (let i = 1; i < slice.length; i++) {
    len += haversineKm(
      { lat: slice[i - 1]![0], lng: slice[i - 1]![1] },
      { lat: slice[i]![0], lng: slice[i]![1] },
    );
  }
  check('slice length is about 10 km', Math.abs(len - 10) < 0.01, `got ${len.toFixed(4)} km`);
  console.log(`  10 km slice measured ${len.toFixed(4)} km over ${slice.length} points`);

  check(
    'reversed arguments behave the same',
    geometry.sliceLatLngs(110, 100).length === slice.length,
  );
}

// ------------------------------------------------------------ landmarks
section('landmarks (added for the forecast packet)');
{
  const landmarks = (bundle as unknown as { landmarks?: { name: string; s_km: number }[] })
    .landmarks;
  check('route.json carries landmarks', Array.isArray(landmarks) && landmarks.length > 0);
  if (landmarks) {
    const sorted = landmarks.every((l, i) => i === 0 || l.s_km >= landmarks[i - 1]!.s_km);
    check('landmarks are ordered by arc length', sorted);
    check('first landmark is at km 0', landmarks[0]!.s_km === 0);
    check(
      'last landmark is the end of the route',
      Math.abs(landmarks[landmarks.length - 1]!.s_km - bundle.totalKm) < 0.01,
    );
    console.log(
      `  ${landmarks.length} landmarks, ${landmarks[0]!.name} to ${landmarks[landmarks.length - 1]!.name}`,
    );
  }

  const version = (bundle as unknown as { version?: number }).version;
  check('route.json carries a version', typeof version === 'number');
}

// --------------------------------------------------------------- report
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
console.log('route geometry OK');
