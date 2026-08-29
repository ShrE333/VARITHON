# वारी साथी — Wari Saathi

A Progressive Web App for pilgrims on the Pandharpur Wari (palkhi) — built to
work on low-end Android phones, on rural networks that drop out for hours at
a time.

Modules M1–M4 are in scope. Crowd detection (M5) is not.

| Module | What it does | Status |
|---|---|---|
| **M1** | Home screen — distance to temple, ETA, on/off-route status | ✅ built |
| **M2** | Route map + mukkam (day-stage) schedule | ✅ built |
| **M3** | Nearest medical/food/rest/stay finder | 🚧 stub |
| **M4** | Camp admin app — register &amp; manage a health/food/rest camp | 🚧 stub |
| **Palki** | **Live Palki location + offline forecast packet** | ✅ built |

---

## The Palki live-location feature

The headline feature. M1 answers *"where am **I**?"*; this answers *"where is
the **Palki**?"* — and keeps answering it with no network at all.

The server maintains a self-correcting estimate of the Palki's position along
the route and publishes a small **forecast packet**: not a location, but a
timeline covering the next eight hours. The phone caches it and reads its own
clock against it. That is what makes it work in a dead zone.

```
sim/simulator.mjs  --POST pings-->  /api/v1/palki/ping
                                          |
                                    estimator (predict / update)
                                          |
                                    /api/v1/palki/packet  (~550 B gzipped)
                                          |
                                    IndexedDB on the phone
                                          |
                          /palki  — interpolate, no modelling on-device
```

**Honesty rules** (`lib/palki/client.ts`) — a prediction must never look like
a measurement:

| Observation age | What the UI shows |
|---|---|
| < 5 min | solid dot, **Live** |
| 5 min – 3 h | hollow dot, dashed ± ring, **Estimated · synced HH:MM · ± X.X km** |
| 3 h – 8 h | **no dot at all** — "Between Lonand and Taradgaon" |
| past `validUntil` | no position; last known, with its timestamp |

Note it keys off the age of the *observation*, not of the packet. A packet
rebuilt a minute ago from a six-hour-old ping is a six-hour-old answer.

**The model** (`lib/palki/estimator.ts`) is a route-constrained motion model
with schedule priors and recursive Bayesian correction — a scalar Kalman
filter in all but name, ~40 lines of arithmetic with no filtering library.
It is **not** a neural network and should never be described as one.

- `s` position along the route, km · `v` speed · `beta` how off-plan today is
  · `sigma` uncertainty
- Position is trusted from the measurement outright (GPS error is metres; we
  forecast kilometres). The inference goes into **speed**, which is never
  observed directly.
- `beta` is a ratio of *distance covered* to *distance the schedule expected*
  over the same interval — not a ratio of speeds, because a speed measured
  across a lunch halt says nothing about walking pace.

**Demo** — `/demo`, marked SIMULATION. See [DEMO.md](DEMO.md) for the runbook.

```bash
npm run dev
npm run sim        # separate terminal: 300x, seeded, reproducible
```

Measured against the simulator (which the estimator cannot see): MAE ≈ 0.24 km
at +1h, 0.49 km at +2h, 0.73 km at +3h, 1.13 km at +5h, on a 285 km route.
There is **no** historical validation — `sim/backtest.mjs` refuses to print a
number until real 2025 arrival times are supplied.

## The core idea: chainage, not routing

The Wari route is a fixed polyline, walked in one direction, by people on
foot. That means **every position question collapses to a single number**:
how far a point is along that polyline, in km — its *chainage*.

- The pilgrim's chainage comes from snapping their GPS fix onto the route.
- Every facility (hospital, camp, rest stop) has a chainage too, computed
  once and stored.
- "Distance to temple" = route length − pilgrim's chainage.
- "Nearest hospital ahead" = filter facilities to chainage ≥ mine, sort by
  `chainage − mine`.

All of that is arithmetic on two numbers. **There is no routing/directions
API anywhere in this app** — not for cost, but because a road-routing API
needs a live network connection, and the Wari corridor has long dead zones.
Chainage arithmetic runs entirely offline, client-side, once the route
polyline is cached.

The engine for this lives in [`lib/chainage.ts`](lib/chainage.ts) — read
that file before touching anything else; it's the one piece of business
logic everything else is built around.

## Why GPS smoothing matters here

A phone GPS chip alone gives a fix that can jump 20–40 m between reads,
which is enough to make "distance to temple" flicker or make a pilgrim
briefly look like they're off-route when they're not.
[`lib/geolocation.ts`](lib/geolocation.ts) fixes this in layers: reject fixes
worse than 50 m, reject physically-impossible jumps, exponentially smooth
what survives (weighted by reported accuracy), then snap to the route line.

For **camp registration** (M4), a single fix is not good enough — the error
is permanent once a camp's pin is saved, and every pilgrim who navigates
there inherits it. `sampleStablePosition()` collects ~10 fixes and takes the
median, which is what the admin flow uses instead of a single
`getCurrentPosition()` call.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14, App Router, TypeScript | file-based routing, React Server Components where useful, one deploy target |
| Styling | Tailwind CSS | small utility-class output, easy to keep touch targets ≥64px consistently |
| Maps | Leaflet + `react-leaflet`, OSM raster tiles | no Google/Mapbox key, no paid API, tiles are cacheable for offline |
| Geo math | `@turf/nearest-point-on-line`, `@turf/distance`, `@turf/helpers` (individual packages, not the full `turf` bundle) | keeps the JS bundle small — this is the one dependency on the bundle-size budget |
| Backend | Next.js route handlers (TypeScript) | the Palki estimator. Server and client import the *same* geometry module, so there is no server/client parity problem to test for |
| Data | Supabase (Postgres + PostGIS + Auth + RLS) | route/facility data, phone-OTP admin auth, row-level security instead of a bespoke API |
| Offline data | Dexie (IndexedDB wrapper) | structured client-side cache for route/facility data and the offline submission queue |
| Offline shell | `@ducanh2912/next-pwa` (Workbox) | service worker, stale-while-revalidate for data + map tiles |
| i18n | hand-rolled dictionary (`lib/i18n/`) | Marathi default, Hindi and English toggle, without pulling in a full i18n library |

No paid APIs, no Google Maps, no routing/directions service, anywhere.

---

## How a request flows (M1, today)

```
GPS chip
  → navigator.geolocation.watchPosition        (browser)
  → LocationTracker.accept()                    (lib/geolocation.ts — reject/smooth)
  → RouteIndex.locate()                         (lib/chainage.ts — snap to polyline → chainage)
  → AppProvider                                 (lib/app-context.tsx — one shared instance app-wide)
  → useApp()                                    (any page/component)
  → RouteIndex.distanceToTemple()                (lib/chainage.ts)
  → <DistanceCard>                              (components/DistanceCard.tsx)
```

Route data itself loads **Dexie-first**: on every page load, `route.json` is
read from IndexedDB instantly (works offline), while a background fetch
refreshes both the in-memory state and the Dexie cache if the network is up.
The UI never blocks on the network call — see
[`lib/route-data.ts`](lib/route-data.ts).

## Project structure

```
app/
  layout.tsx          root shell: providers, offline banner, bottom nav
  page.tsx             M1 — home / distance-to-temple
  route/page.tsx        M2 stub — map + schedule
  help/page.tsx          M3 stub — nearest facility finder
  admin/                M4 stub — camp registration (own layout, no bottom nav)
  test/page.tsx         GPS debug screen (raw fix / smoothed fix / chainage / offset)
  manifest.ts           PWA manifest (Next's app-router convention)
  globals.css

components/
  Providers.tsx        wraps LangProvider + AppProvider
  DistanceCard.tsx      M1's main card
  AccuracyChip.tsx       ± accuracy badge
  OfflineBanner.tsx       shows when navigator.onLine is false, with cache age
  SimBadge.tsx             shown only when ?sim=1 is active
  BottomNav.tsx             Home / Route / Help nav (hidden under /admin)
  LangToggle.tsx             mr ⇄ en

lib/
  chainage.ts          ← yours, untouched — route projection, distance, nearest-ahead
  geolocation.ts        ← yours, untouched — fix gating, smoothing, stable pin sampling
  types.ts                ← yours, untouched — shared types incl. KIND_GROUPS
  app-context.tsx      one LocationTracker + RouteIndex for the whole app
  route-data.ts          Dexie-first route.json loader, stale-while-revalidate
  db.ts                    Dexie schema: route cache, facility cache, offline submit queue
  supabase.ts               Supabase client (null-safe — app must work without it)
  sim.ts                      dev-only ?sim=1 walking simulator, patches navigator.geolocation
  use-online.ts                 navigator.onLine hook
  use-raw-fix.ts                 independent raw-GPS watch, for the /test page only
  i18n/                            strings.ts (mr/en dict) + context.tsx (provider/hook)

db/
  schema.sql            ← yours, untouched — Supabase/PostGIS schema

lib/palki/           the Palki live-location feature
  geometry.ts          arc-length maths: s <-> lat/lng, self-overlap disambiguation
  estimator.ts          the model — predict/update/forecast, heavily commented
  schedule.ts            speed-profile prior; SERVER ONLY
  packet.ts               assembles the <4 KB offline forecast packet
  client.ts                client side: interpolate + the staleness honesty rules
  use-packet.ts             cache-first fetch, refresh on reconnect
  store.ts                   Supabase, with an in-process fallback for demos
  server.ts                   shared route/geometry loading + ingest auth
  airplane.ts                  demo-only simulated connectivity loss
  types.ts

app/api/v1/palki/    packet · route/[version] · ping · accuracy · truth
app/palki/           pilgrim-facing "where is the Palki?"
app/demo/            SIMULATION dashboard

sim/
  simulator.mjs        separate process; imports nothing from the app
  backtest.mjs          replays the filter against historical arrivals

data/
  wari_schedule_2026.json   generated speed-profile prior (SYNTHETIC)
  wari_2025_actuals.json     template — no real data yet

tests/
  route-geometry.test.mts    34 checks
  estimator.test.mts          32 checks

scripts/
  build_route_data.py   ← yours, untouched — one-time OSM harvest + pois.json/seed.sql
  test_chainage.mjs      ← yours, untouched — sanity check against a synthetic route
  build_road_route.mjs    snaps the mukkam waypoints to real roads (OSRM), writes route.json
  build_schedule.mjs       generates the schedule prior from stage distances
  build_fixtures.mjs        25 verified test facilities along the current route

public/
  data/route.json        placeholder route (see below) — swap for build_route_data.py's output
  data/fixtures.json      25 fake facilities for testing M3 before real data exists
  icons/                    PWA icons
  sw.js, workbox-*.js        generated by next-pwa at build time — do not hand-edit
```

---

## Setup, start to finish

### 1. Database

Run [`db/schema.sql`](db/schema.sql) in the Supabase SQL editor. This creates
the `routes` / `route_stages` / `facilities` tables, the chainage trigger,
the `nearest_ahead` RPC, and row-level security policies (public read on
approved facilities, owner-only write, organizer-only approval).

### 2. Route data

All route and facility data is prepared **once**, offline, and shipped as
static JSON. Nothing here runs at runtime.

```bash
npm run build:data      # route.json + schedule + fixtures.json
```

That runs three scripts:

**`scripts/build_road_route.mjs`** (`npm run build:route`) snaps the 15
mukkam waypoints to real roads via OSRM and writes:

- `public/data/route.json` — the road-following polyline (4197 points,
  ~68 m spacing, 285.6 km), stage schedule, and the Vitthal temple as the
  destination
- `route.geojson` — the same line in GeoJSON, ready to feed
  `build_route_data.py`

> **On the "no routing API" rule.** The *app* never calls a routing or
> directions service — every distance is chainage arithmetic against this
> file, offline. This script calls OSRM once, at build time, on a
> developer's machine, and its output is committed. That is the same
> pattern `build_route_data.py` already uses for the Overpass harvest.
> OSRM's public demo server is free and keyless; set `OSRM_BASE` to point
> at your own instance if you'd rather not depend on it.

**`scripts/build_fixtures.mjs`** (`npm run build:fixtures`) writes 25 fake
facilities spread along the route so M3 is testable before real camp data
exists — including 3 marked closed and 3 placed outside the 3 km corridor
so the filters are visibly doing something. **Re-run it whenever
`route.json` changes**: chainage is a position along one specific polyline,
so old fixture chainages are meaningless against a new route. The script
verifies every fixture by projecting it back through the same
`@turf/nearest-point-on-line` the app uses, and fails rather than shipping
inconsistent data.

**`scripts/build_schedule.mjs`** (`npm run build:schedule`) writes
`data/wari_schedule_2026.json`, the estimator's prior: per-day
`(start, end, nominal_kmph)` blocks with halts at 0.0. The **day shape is
synthetic** — we do not have the Sansthan's published timetable — but each
day's distance is real, taken from the road-snapped route. It is the single
most valuable file to replace with real data, and it is marked
`"synthetic": true` so nobody forgets.

**For permanent facilities** (hospitals, PHCs, pharmacies from OSM):

```bash
pip install shapely pyproj requests
python scripts/build_route_data.py --route route.geojson --out public/data
```

This produces `public/data/pois.json` plus a `seed.sql` of the same POIs to
run in Supabase after inserting the route row.

#### Accuracy caveat

The polyline follows **real roads** — verified against OSM tiles at zoom
14–16, where it sits on NH965 through Jejuri and on Budhale Road into
Pandharpur, ending at the temple. What it is *not* is a survey of the
official palkhi footpath: OSRM routes a vehicle between the mukkam towns,
and the palkhi occasionally leaves the motor road. Two legs
(Phaltan→Barad, Velapur→Bhalavani) route noticeably longer than the
straight line and are worth checking against the official route.

If you get the Sansthan's official GPX/KML, drop it in as `route.geojson`
and run `build_route_data.py` instead — nothing downstream changes.

### 3. Environment

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_ROUTE_SLUG=dnyaneshwar-2026
```

(Older Supabase projects issue an "anon key" instead of a "publishable
key"; `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback.)

Supabase is **optional for M1–M3** — the Supabase client
(`lib/supabase.ts`) is `null` when the env vars are missing, and the app is
designed to never block its core UI on a Supabase call. It's required for
M4 (admin auth) and for pulling live camp data instead of `fixtures.json`.

### 4. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Other scripts:

```bash
npm run build            # production build (also generates the service worker)
npm run start             # serve the production build
npm run test:chainage      # sanity-check lib/chainage.ts against a synthetic route
npm run prep-route          # shortcut for scripts/build_route_data.py
```

### 5. Testing GPS on an actual phone

Browsers block `navigator.geolocation` on plain HTTP except on `localhost`.
To test on a phone over your LAN, either:

- tunnel it (`ngrok http 3000`, Cloudflare Tunnel, etc.) for a real HTTPS
  URL, or
- on Android Chrome: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
  → add `http://<your-lan-ip>:3000` → relaunch, then run
  `npm run dev -- -H 0.0.0.0` and open that URL from the phone.

No phone handy, or want to demo without walking? Add `?sim=1` in
development — [`lib/sim.ts`](lib/sim.ts) replaces `navigator.geolocation`
with a fake track that walks the route at 3 km/h with realistic jitter.
`LocationTracker` and `sampleStablePosition` aren't aware of this; they just
receive fixes through the normal browser API.

Visit `/test` any time for a raw view of the GPS pipeline: raw fix →
smoothed fix → chainage/offset → rejected-fix count.

---

## Offline behavior

This is not a "nice to have" — the route has multi-hour dead zones — so it's
built in at every layer:

- **Route/facility data**: Dexie-first reads (instant, works with no
  network), background refetch when online, never blocking the UI. See
  `lib/route-data.ts`.
- **Service worker** (`@ducanh2912/next-pwa`, configured in
  `next.config.js`): `route.json`/`pois.json` and OSM tiles (zoom 10–15) use
  a stale-while-revalidate strategy; Supabase API calls use network-first
  with a short timeout so a slow connection doesn't hang the UI.
- **Offline banner**: shown whenever `navigator.onLine` is `false`, with how
  old the cached data is (`components/OfflineBanner.tsx`).
- **M4 camp submissions** made offline queue in IndexedDB
  (`lib/db.ts` → `pendingCamps` table) and sync once the connection returns.
- The service worker is **disabled in `next dev`** (see `next.config.js`) —
  test offline behavior against `npm run build && npm run start`, not `dev`.

---

## Known constraints (inherited from the core engine)

- Polyline density sets distance accuracy — sparse traces read ~15% short.
  Both build scripts warn if average point spacing exceeds 200 m. The
  current route averages 68 m.
- Chainage is a position along **one specific polyline**. Regenerating
  `route.json` invalidates every stored chainage — fixture data, and any
  `facilities` rows in Supabase, whose values come from the `compute_chainage`
  trigger against the `routes.geom` of the same vintage. Re-run
  `npm run build:fixtures`, and re-import the route row, together.
- The route passes near itself in a few places, so a point a few km off the
  road can legitimately project onto a different stretch than the one it
  looks closest to on screen. `build_fixtures.mjs` detects and reports this
  rather than pretending it doesn't happen.
- Chainage assumes forward travel. Someone walking backwards gets stale
  results until they pass a facility again — the `lookbackKm` window in
  `findNearestAhead` covers most of this.
- `sampleStablePosition` needs open sky. Under tree cover it times out and
  returns the best of what it collected — the M4 flow must check `accuracy`
  before saving a pin (reject anything worse than 25 m).
- The Medical button in M3 must call `findNearestEmergency()`, not
  `findNearestAhead()` — in an emergency, direction of travel stops
  mattering, so the search widens instead of biasing "ahead".

## Bundle budget

Initial route (`/`) is ~92 KB gzipped First Load JS as of this build —
under the 300 KB target. Leaflet/`react-leaflet` are only pulled in by M2's
map view (dynamically imported), not by M1, so the home screen stays light.
Turf functions are imported individually
(`@turf/nearest-point-on-line`, not `turf`) for the same reason.

## Roadmap

- **M2** — Leaflet map with the route polyline, user marker, auto-follow
  toggle, mukkam schedule list highlighting `route.stageAt()`'s current
  stage, days remaining.
- **M3** — Medical / Food / Rest / Stay tap targets (≥64px, one-handed use)
  mapped to `KIND_GROUPS`, ranked nearest-ahead list with ETA/status/call
  button, map view with a straight line to the selected facility.
- **M4** — Supabase phone-OTP auth, camp registration form using
  `sampleStablePosition()` with a live "8 of 10 good fixes, best ±12 m"
  progress indicator, open/full/closed toggle post-approval, offline queue
  with a pending-sync badge.
