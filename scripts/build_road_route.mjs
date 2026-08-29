/**
 * Snap the palkhi mukkam waypoints to real roads and emit the route bundle.
 *
 *     node scripts/build_road_route.mjs
 *
 * Produces:
 *     route.geojson            LineString, the input build_route_data.py expects
 *     public/data/route.json   the bundle the app loads
 *
 * WHY A ROUTING SERVICE IS OK HERE
 * --------------------------------
 * This is build-time data prep, run once by a developer, exactly like the
 * Overpass harvest in build_route_data.py. The output is committed and
 * shipped as static JSON. The app itself never calls a routing or
 * directions API — at runtime every distance question is arithmetic on
 * chainage against this file, offline. Straight lines between town centres
 * (the previous placeholder) read short and cut across fields; a
 * road-snapped polyline is what makes chainage distances real.
 *
 * OSRM's public demo server is free, keyless, and open source. If it is
 * down or rate-limits you, host your own (docker: osrm/osrm-backend) and
 * set OSRM_BASE.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const OSRM_BASE = process.env.OSRM_BASE || 'https://router.project-osrm.org';

/**
 * Route geometry version. Clients cache the polyline immutably against this
 * and only re-download when it changes, so bump it whenever the waypoints,
 * the routing profile, or anything else that moves the line changes.
 */
const ROUTE_VERSION = 1;

/**
 * The Dnyaneshwar Maharaj palkhi mukkam sequence, in walking order.
 *
 * Coordinates are Nominatim (OSM geocoder) results, not hand-typed
 * approximations — every one of these is within ~150 m of a routable road,
 * which the build verifies and reports as "snap". Re-geocode rather than
 * eyeballing if you change one.
 *
 * `date` is the 2026 schedule and must be re-checked against the official
 * Sansthan calendar each year — the road geometry does not change, the
 * dates do.
 */
const MUKKAM = [
  { name: 'Alandi',    mr: 'आळंदी',     lat: 18.677245, lng: 73.898113, date: '2026-06-25' },
  { name: 'Pune',      mr: 'पुणे',       lat: 18.521374, lng: 73.854507, date: '2026-06-26' },
  { name: 'Saswad',    mr: 'सासवड',     lat: 18.344435, lng: 74.029523, date: '2026-06-28' },
  { name: 'Jejuri',    mr: 'जेजुरी',     lat: 18.276899, lng: 74.160229, date: '2026-06-29' },
  { name: 'Walhe',     mr: 'वाल्हे',     lat: 18.186280, lng: 74.153230, date: '2026-06-30' },
  { name: 'Lonand',    mr: 'लोणंद',     lat: 18.038798, lng: 74.186926, date: '2026-07-01' },
  { name: 'Taradgaon', mr: 'तरडगाव',   lat: 18.028547, lng: 74.247209, date: '2026-07-02' },
  { name: 'Phaltan',   mr: 'फलटण',     lat: 17.957934, lng: 74.414235, date: '2026-07-03' },
  { name: 'Barad',     mr: 'बरड',       lat: 17.954725, lng: 74.586482, date: '2026-07-04' },
  { name: 'Natepute',  mr: 'नातेपुते',   lat: 17.900448, lng: 74.752659, date: '2026-07-05' },
  { name: 'Malshiras', mr: 'माळशिरस',  lat: 17.809617, lng: 74.934706, date: '2026-07-06' },
  { name: 'Velapur',   mr: 'वेळापूर',    lat: 17.790305, lng: 75.057244, date: '2026-07-07' },
  // The 13th mukkam is usually listed as Bhandishegaon, which does not
  // resolve in OSM under that name. Bhalavani is the confirmed village on
  // the Velapur->Wakhari road at roughly the right stage distance; swap it
  // if the official schedule names a different halt.
  { name: 'Bhalavani', mr: 'भाळवणी',    lat: 17.697850, lng: 75.129420, date: '2026-07-08' },
  { name: 'Wakhari',   mr: 'वाखरी',     lat: 17.686992, lng: 75.284047, date: '2026-07-09' },
  { name: 'Pandharpur',mr: 'पंढरपूर',   lat: 17.677467, lng: 75.335216, date: '2026-07-10' },
];

/**
 * The Vitthal Rukmini temple itself. The last mukkam entry above already
 * uses the temple coordinate, so the traced line ends at the destination —
 * but distanceToTemple() reads this field, so keep them in sync.
 */
const TEMPLE = { lat: 17.677467, lng: 75.335216 };

function haversineKm(a, b) {
  const R = 6371.0088;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Route one leg. Returns [lng,lat][] following real roads. */
async function routeLeg(from, to) {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url =
    `${OSRM_BASE}/route/v1/driving/${coords}` +
    `?overview=full&geometries=geojson&continue_straight=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status} for ${from.name}->${to.name}`);
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error(`OSRM ${data.code} for ${from.name}->${to.name}`);

  const route = data.routes[0];
  const wps = data.waypoints || [];

  // OSRM snaps each requested point to the nearest routable road. A large
  // snap distance means the coordinate above is wrong / not near a road.
  const snapM = wps.map((w) => Math.round(w.distance ?? 0));

  return {
    coords: route.geometry.coordinates,
    distanceKm: route.distance / 1000,
    snapM,
  };
}

/** Remove consecutive duplicate points left at leg joins. */
function dedupe(coords) {
  const out = [];
  for (const c of coords) {
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== c[0] || prev[1] !== c[1]) out.push(c);
  }
  return out;
}

/** Cumulative geodesic distance along a [lng,lat][] polyline, in km. */
function cumulativeKm(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    const a = { lng: coords[i - 1][0], lat: coords[i - 1][1] };
    const b = { lng: coords[i][0], lat: coords[i][1] };
    cum.push(cum[i - 1] + haversineKm(a, b));
  }
  return cum;
}

async function main() {
  console.log(`routing ${MUKKAM.length} mukkam waypoints via ${OSRM_BASE}\n`);

  let all = [];
  /** Chainage (km) at which each mukkam town sits on the final polyline. */
  const stageKm = [0];
  let running = 0;
  const warnings = [];

  for (let i = 0; i < MUKKAM.length - 1; i++) {
    const from = MUKKAM[i];
    const to = MUKKAM[i + 1];

    const leg = await routeLeg(from, to);
    running += leg.distanceKm;
    stageKm.push(running);

    all = all.length ? all.concat(leg.coords.slice(1)) : leg.coords.slice();

    const maxSnap = Math.max(...leg.snapM);
    const flag = maxSnap > 500 ? '  <-- CHECK COORDINATE' : '';
    console.log(
      `  ${from.name.padEnd(15)} -> ${to.name.padEnd(15)} ` +
        `${leg.distanceKm.toFixed(1).padStart(6)} km  ` +
        `${String(leg.coords.length).padStart(5)} pts  ` +
        `snap ${maxSnap}m${flag}`,
    );
    if (maxSnap > 500) {
      warnings.push(`${from.name}->${to.name} snapped ${maxSnap} m from the requested point`);
    }

    // Be polite to the public demo server.
    await new Promise((r) => setTimeout(r, 400));
  }

  const coords = dedupe(all).map(([lng, lat]) => [
    Math.round(lng * 1e6) / 1e6,
    Math.round(lat * 1e6) / 1e6,
  ]);

  const cum = cumulativeKm(coords);
  const totalKm = cum[cum.length - 1];
  const spacingM = (totalKm * 1000) / (coords.length - 1);

  console.log(`\nroute: ${coords.length} points, ${totalKm.toFixed(2)} km`);
  console.log(`average point spacing: ${spacingM.toFixed(0)} m`);
  if (spacingM > 200) {
    console.warn('  WARNING: sparse polyline, distances will read short');
  }

  // Rescale the per-leg running totals onto the deduped polyline's own
  // cumulative length, so stage boundaries land exactly on the geometry the
  // app measures against rather than on OSRM's reported leg distances.
  const scale = totalKm / running;
  const stages = [];
  for (let i = 0; i < MUKKAM.length - 1; i++) {
    stages.push({
      dayNumber: i + 1,
      stageDate: MUKKAM[i].date,
      fromPlace: MUKKAM[i].name,
      toPlace: MUKKAM[i + 1].name,
      fromPlaceMr: MUKKAM[i].mr,
      toPlaceMr: MUKKAM[i + 1].mr,
      startKm: Math.round(stageKm[i] * scale * 1000) / 1000,
      endKm: Math.round(stageKm[i + 1] * scale * 1000) / 1000,
    });
  }
  // The last stage must reach the very end of the line so stageAt() never
  // returns null for a pilgrim standing at the temple.
  stages[stages.length - 1].endKm = Math.round(totalKm * 1000) / 1000;

  // Landmarks are the mukkam halts expressed as arc lengths. The forecast
  // packet quotes ETAs against these ("Palki reaches Lonand around 4:15 PM"),
  // which is the only form of position a walking pilgrim can actually use —
  // a lat/lng means nothing to them.
  const landmarks = MUKKAM.map((m, i) => ({
    name: m.name,
    name_mr: m.mr,
    s_km: i === 0 ? 0 : Math.round(stageKm[i] * scale * 1000) / 1000,
  }));
  landmarks[landmarks.length - 1].s_km = Math.round(totalKm * 1000) / 1000;

  const bundle = {
    id: 'dnyaneshwar-2026',
    slug: 'dnyaneshwar-2026',
    name: 'Sant Dnyaneshwar Maharaj Palkhi 2026',
    // Bump whenever the geometry changes. Clients cache the polyline
    // immutably against this and only re-download when it moves.
    version: ROUTE_VERSION,
    coordinates: coords,
    totalKm: Math.round(totalKm * 1000) / 1000,
    startName: 'Alandi',
    endName: 'Pandharpur',
    destination: TEMPLE,
    stages,
    landmarks,
    source: 'osrm-road-snapped',
    generatedAt: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(resolve(ROOT, 'public/data'), { recursive: true });
  writeFileSync(resolve(ROOT, 'public/data/route.json'), JSON.stringify(bundle));

  writeFileSync(
    resolve(ROOT, 'route.geojson'),
    JSON.stringify(
      {
        type: 'Feature',
        properties: { slug: bundle.slug, name: bundle.name },
        geometry: { type: 'LineString', coordinates: coords },
      },
      null,
      2,
    ),
  );

  console.log(`\nwrote public/data/route.json  (version ${ROUTE_VERSION}, ${landmarks.length} landmarks)`);
  console.log('wrote route.geojson  (feed this to build_route_data.py for the POI harvest)');
  console.log(`\nstages: ${stages.length}`);
  for (const s of stages) {
    console.log(
      `  day ${String(s.dayNumber).padStart(2)}  ${s.fromPlace.padEnd(15)} -> ` +
        `${s.toPlace.padEnd(15)} km ${s.startKm.toFixed(1).padStart(6)} - ${s.endKm.toFixed(1).padStart(6)}`,
    );
  }

  if (warnings.length) {
    console.warn('\nWARNINGS:');
    for (const w of warnings) console.warn('  ' + w);
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
