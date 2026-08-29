import nearestPointOnLine from '@turf/nearest-point-on-line';
import { lineString, point } from '@turf/helpers';

// Rough waypoints along the Dnyaneshwar Maharaj palkhi corridor, [lng, lat].
const coords = [
  [73.8977, 18.6773], // Alandi
  [73.8567, 18.5204], // Pune
  [74.0333, 18.3475], // Saswad
  [74.1600, 18.2800], // Jejuri
  [74.3833, 18.0500], // Lonand
  [74.4333, 17.9833], // Taradgaon
  [74.4300, 17.9900], // Phaltan
  [74.7000, 17.8000], // Natepute
  [74.9167, 17.8500], // Malshiras
  [75.1167, 17.7500], // Velapur
  [75.3300, 17.6800], //ast Wakhari
  [75.3244, 17.6739], // Pandharpur
];

const line = lineString(coords);

function locate(lat, lng) {
  const snap = nearestPointOnLine(line, point([lng, lat]), { units: 'kilometers' });
  return {
    chainageKm: snap.properties.location,
    offsetM: snap.properties.dist * 1000,
  };
}

const totalKm = locate(17.6739, 75.3244).chainageKm;
console.log(`route length: ${totalKm.toFixed(1)} km\n`);

const cases = [
  ['Alandi (start)', 18.6773, 73.8977],
  ['Pune', 18.5204, 73.8567],
  ['Jejuri', 18.2800, 74.1600],
  ['Phaltan', 17.9900, 74.4300],
  ['Malshiras', 17.8500, 74.9167],
  ['Pandharpur (temple)', 17.6739, 75.3244],
  ['off-route: Baramati', 18.1514, 74.5815],
];

for (const [name, lat, lng] of cases) {
  const p = locate(lat, lng);
  const remaining = Math.max(0, totalKm - p.chainageKm);
  const onRoute = p.offsetM <= 1500;
  console.log(
    `${name.padEnd(22)} km ${p.chainageKm.toFixed(1).padStart(6)}` +
    ` | ${remaining.toFixed(1).padStart(6)} km to go` +
    ` | offset ${(p.offsetM / 1000).toFixed(2).padStart(6)} km` +
    ` | ${onRoute ? 'on route' : 'OFF route'}`
  );
}

// Nearest-ahead check
const facilities = [
  { name: 'Health camp (behind)', chainageKm: 120, offsetM: 50 },
  { name: 'Hospital (ahead, far off road)', chainageKm: 135, offsetM: 4200 },
  { name: 'Health camp (ahead)', chainageKm: 138, offsetM: 120 },
  { name: 'Refreshment camp (ahead)', chainageKm: 152, offsetM: 30 },
];

const me = 130;
console.log(`\npilgrim at km ${me} — nearest ahead:`);
facilities
  .filter(f => f.offsetM <= 3000 && f.chainageKm >= me - 2)
  .map(f => ({ ...f, walk: (f.chainageKm - me) + f.offsetM / 1000 }))
  .sort((a, b) => a.walk - b.walk)
  .forEach(f => console.log(`  ${f.name.padEnd(32)} ${f.walk.toFixed(1)} km (~${Math.round(f.walk / 3 * 60)} min)`));
