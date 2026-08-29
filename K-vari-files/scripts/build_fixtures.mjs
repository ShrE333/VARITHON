/**
 * Generate public/data/fixtures.json — fake facilities spread along the
 * route so M3 is testable before real camp data exists.
 *
 *     node scripts/build_fixtures.mjs
 *
 * Must be re-run whenever route.json changes: chainage is a position along
 * a specific polyline, so a fixture's chainageKm is meaningless against a
 * different route.
 *
 * Placement works backwards from chainage — pick a km position, find that
 * point on the line, push it sideways by the desired offset — and then the
 * stored chainageKm/offsetM come from projecting that point back through
 * the same @turf/nearest-point-on-line the app uses. Turf is the source of
 * truth, not the intent, because the two genuinely disagree where the route
 * passes near itself: a point 5 km off the road at km 143 can be closest to
 * a different stretch entirely. Storing the intent there would put a camp
 * at a chainage the app would never compute for it, and M3 would rank it
 * against the wrong position.
 *
 * Where that happens the script retries on the other side of the road and
 * then at progressively smaller offsets, and fails loudly if a fixture
 * still cannot be placed.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import { lineString, point } from '@turf/helpers';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const route = JSON.parse(readFileSync(resolve(ROOT, 'public/data/route.json'), 'utf8'));
const coords = route.coordinates;
const line = lineString(coords);
const totalKm = route.totalKm;

function haversineKm(a, b) {
  const R = 6371.0088;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const cum = [0];
for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversineKm(coords[i - 1], coords[i]));

/** Point at a given chainage, plus the unit perpendicular there. */
function atChainage(km) {
  const target = Math.max(0, Math.min(cum[cum.length - 1], km));
  let i = 0;
  while (i < cum.length - 2 && cum[i + 1] < target) i++;
  const t = cum[i + 1] > cum[i] ? (target - cum[i]) / (cum[i + 1] - cum[i]) : 0;

  const [lng1, lat1] = coords[i];
  const [lng2, lat2] = coords[i + 1];
  const lng = lng1 + (lng2 - lng1) * t;
  const lat = lat1 + (lat2 - lat1) * t;

  // Perpendicular in local metres, accounting for longitude convergence.
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dx = (lng2 - lng1) * cosLat;
  const dy = lat2 - lat1;
  const len = Math.hypot(dx, dy) || 1;
  return { lat, lng, perp: { x: -dy / len, y: dx / len }, cosLat };
}

/** Move a point `offsetM` metres perpendicular to the route. */
function offsetPoint(base, offsetM, side) {
  const degPerM = 1 / 111320;
  const d = offsetM * degPerM * side;
  return {
    lat: base.lat + base.perp.y * d,
    lng: base.lng + (base.perp.x * d) / base.cosLat,
  };
}

const KINDS = {
  hospital: { en: ['Civil Hospital', 'Rural Hospital'], mr: 'रुग्णालय' },
  phc: { en: ['Primary Health Centre', 'PHC Sub-centre'], mr: 'आरोग्य केंद्र' },
  pharmacy: { en: ['Medical Store', 'Jan Aushadhi Kendra'], mr: 'औषध दुकान' },
  health_camp: { en: ['Arogya Shibir', 'Red Cross Health Camp', 'Wari Aid Post'], mr: 'आरोग्य शिबिर' },
  refreshment_camp: { en: ['Anna Chhatra', 'Panpoi Water Camp', 'Prasad Seva Kendra'], mr: 'अन्नछत्र' },
  rest_stop: { en: ['Vishranti Katta', 'Shade Rest Point'], mr: 'विश्रांती कट्टा' },
  night_stay: { en: ['Mukkam Dharamshala', 'Community Hall Stay'], mr: 'मुक्काम धर्मशाळा' },
  hotel: { en: ['Hotel Shri Sai', 'Wari Lodge'], mr: 'हॉटेल' },
};

const kindNames = Object.keys(KINDS);
const CAPACITY_KINDS = new Set(['health_camp', 'refreshment_camp', 'rest_stop', 'night_stay']);

/**
 * The real contact numbers for this deployment, cycled across fixtures.
 *
 * These used to be procedurally generated fake numbers (+9198000...), which
 * meant every "Call" button in the app dialled a number that doesn't exist.
 * Hard-coded here rather than left generated so that re-running
 * `npm run build:fixtures` cannot silently reintroduce fake numbers.
 */
const CONTACT_NUMBERS = ['+918669966070', '+919112213506', '+917822850386'];

/** Project through the app's own maths. This is the ground truth. */
function project(lat, lng) {
  const snap = nearestPointOnLine(line, point([lng, lat]), { units: 'kilometers' });
  return {
    chainageKm: snap.properties.location,
    offsetM: snap.properties.dist * 1000,
  };
}

/**
 * Place a fixture near `intendedKm` at roughly `intendedOffsetM` off the
 * road, and return where it actually lands. Retries the far side and then
 * smaller offsets when the point snaps to a different stretch of route.
 */
function place(intendedKm, intendedOffsetM, preferredSide) {
  const base = atChainage(intendedKm);
  const attempts = [];
  for (const side of [preferredSide, -preferredSide]) {
    for (const scale of [1, 0.7, 0.45, 0.25]) {
      attempts.push({ side, offsetM: intendedOffsetM * scale });
    }
  }

  let best = null;
  for (const a of attempts) {
    const pos = offsetPoint(base, a.offsetM, a.side);
    const got = project(pos.lat, pos.lng);
    const drift = Math.abs(got.chainageKm - intendedKm);

    // Offset should come back close to what we asked for, and the point
    // should still belong to the stretch of road we aimed at.
    const offsetOk = Math.abs(got.offsetM - a.offsetM) <= Math.max(50, a.offsetM * 0.2);
    if (drift <= 1.0 && offsetOk) return { ...pos, ...got, drift };

    if (!best || drift < best.drift) best = { ...pos, ...got, drift };
  }
  return best;
}

/**
 * Place a fixture that must end up genuinely outside M3's corridor.
 *
 * Pushing N km perpendicular does not guarantee the point is N km from the
 * *nearest* part of the route — where the road curves, it bends back toward
 * the point and the real offset comes out far smaller. So search outward
 * over several bearings and distances and take the first placement whose
 * measured offset actually clears the target.
 */
function placeFarOff(intendedKm, targetOffsetM) {
  const base = atChainage(intendedKm);
  const degPerM = 1 / 111320;
  let best = null;

  for (const distM of [targetOffsetM, targetOffsetM * 1.5, targetOffsetM * 2.2, targetOffsetM * 3]) {
    for (let bearing = 0; bearing < 360; bearing += 30) {
      const rad = (bearing * Math.PI) / 180;
      const lat = base.lat + Math.cos(rad) * distM * degPerM;
      const lng = base.lng + (Math.sin(rad) * distM * degPerM) / base.cosLat;

      const got = project(lat, lng);
      if (got.offsetM >= targetOffsetM) return { lat, lng, ...got, drift: Math.abs(got.chainageKm - intendedKm) };
      if (!best || got.offsetM > best.offsetM) {
        best = { lat, lng, ...got, drift: Math.abs(got.chainageKm - intendedKm) };
      }
    }
  }
  return best;
}

const facilities = [];
const COUNT = 25;
const notes = [];

for (let i = 0; i < COUNT; i++) {
  const kind = kindNames[i % kindNames.length];
  const meta = KINDS[kind];

  // Spread evenly, but nudge so they don't land on suspiciously round km.
  const intendedKm = Math.round(((totalKm * (i + 0.5)) / COUNT + (i % 3) * 0.4) * 10) / 10;

  // 3 of 25 sit well outside the 3 km corridor so the offset filter is
  // visibly doing something; the rest are roadside.
  const isFarOff = i % 9 === 3;
  const side = i % 2 === 0 ? 1 : -1;
  const id = `fixture-${String(i + 1).padStart(3, '0')}`;

  const p = isFarOff
    ? placeFarOff(intendedKm, 3800 + ((i * 137) % 2200))
    : place(intendedKm, 20 + ((i * 53) % 900), side);

  if (isFarOff && p.offsetM < 3000) {
    console.error(`${id}: could not place outside the 3 km corridor (got ${p.offsetM.toFixed(0)} m)`);
    process.exit(1);
  }
  if (p.drift > 1.0) {
    notes.push(
      `${id}: aimed at km ${intendedKm}, settled at km ${p.chainageKm.toFixed(1)}` +
        (isFarOff ? ' (far-off-road, placed by outward search)' : ' (route passes near itself here)'),
    );
  }

  const status = i % 7 === 5 ? 'closed' : i % 11 === 0 ? 'full' : 'open';
  const nameEn = meta.en[i % meta.en.length];

  facilities.push({
    id,
    kind,
    name: `${nameEn} (${meta.mr})`,
    lat: Math.round(p.lat * 1e6) / 1e6,
    lng: Math.round(p.lng * 1e6) / 1e6,
    // Stored values are what the app will compute for these coordinates.
    chainageKm: Math.round(p.chainageKm * 1000) / 1000,
    offsetM: Math.round(p.offsetM * 10) / 10,
    status,
    ...(i % 3 !== 0 ? { contactPhone: CONTACT_NUMBERS[i % CONTACT_NUMBERS.length] } : {}),
    ...(CAPACITY_KINDS.has(kind) ? { capacity: 50 + ((i * 13) % 200) } : {}),
    ...(kind === 'refreshment_camp' ? { amenities: { water: true, food: i % 2 === 0 } } : {}),
  });
}

facilities.sort((a, b) => a.chainageKm - b.chainageKm);

// --- Re-verify: stored values must match a fresh projection exactly ---
const failures = [];
let worstKm = 0;
let worstOffset = 0;

for (const f of facilities) {
  const got = project(f.lat, f.lng);
  const kmErr = Math.abs(got.chainageKm - f.chainageKm);
  const offsetErr = Math.abs(got.offsetM - f.offsetM);
  worstKm = Math.max(worstKm, kmErr);
  worstOffset = Math.max(worstOffset, offsetErr);

  // Rounding to 3dp km / 1dp m is the only permitted difference.
  if (kmErr > 0.001 || offsetErr > 0.1) {
    failures.push(
      `${f.id}: stored km ${f.chainageKm} / ${f.offsetM} m, ` +
        `recomputed km ${got.chainageKm.toFixed(3)} / ${got.offsetM.toFixed(1)} m`,
    );
  }
}

console.log(`generated ${facilities.length} fixtures against a ${totalKm.toFixed(1)} km route`);
console.log(`  closed:          ${facilities.filter((f) => f.status === 'closed').length}`);
console.log(`  full:            ${facilities.filter((f) => f.status === 'full').length}`);
console.log(`  beyond 3 km:     ${facilities.filter((f) => f.offsetM > 3000).length}`);
console.log(`  with phone:      ${facilities.filter((f) => f.contactPhone).length}`);
console.log(
  `  chainage spread: ${facilities[0].chainageKm.toFixed(1)} - ` +
    `${facilities[facilities.length - 1].chainageKm.toFixed(1)} km`,
);
console.log(
  `\nself-consistency: worst chainage delta ${(worstKm * 1000).toFixed(1)} m, ` +
    `worst offset delta ${worstOffset.toFixed(2)} m`,
);

if (notes.length) {
  console.log('\nplacement notes (not errors):');
  for (const n of notes) console.log('  ' + n);
}

if (failures.length) {
  console.error('\nFAILED self-consistency:');
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}

writeFileSync(resolve(ROOT, 'public/data/fixtures.json'), JSON.stringify(facilities, null, 2));
console.log('\nwrote public/data/fixtures.json');
