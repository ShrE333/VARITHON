# वारी साथी — documentation

One document per feature. Each one explains what the feature does, how it
works, which files to read, **how to run it**, how to verify it is correct,
and what it cannot do.

Start with whichever screen you are working on. If you are new to the
codebase, read [09-chainage-engine.md](09-chainage-engine.md) first — it is
the one idea everything else is built on.

---

## Features

| # | Doc | Screen | What it covers |
|---|---|---|---|
| 01 | [Home & distance](01-home-distance.md) | `/` | M1 — distance to Pandharpur, ETA, on/off-route, GPS smoothing |
| 02 | [Route map & schedule](02-route-map.md) | `/route` | M2 — the polyline, the 15 mukkam stages, regenerating the route |
| 03 | [Facility finder](03-facility-finder.md) | `/help` | M3 — SOS, the four categories, why SOS searches differently |
| 04 | [Camp admin](04-camp-admin.md) | `/admin` | M4 — registering a camp, stable GPS pins, the offline queue |
| 05 | [Palki live location](05-palki-live-location.md) | `/palki` | The forecast packet, the model, the honesty rules |
| 07 | [Admin locations module](07-admin-locations.md) | `/admin-locations` | Full location CRUD, built to drop into an external dashboard |

## Running and presenting

| # | Doc | What it covers |
|---|---|---|
| 06 | [Demo runbook](06-demo-runbook.md) | The five-minute script for presenting the Palki feature |
| 08 | [Deploy](08-deploy.md) | Going to production — Supabase, env vars, Vercel |

## Cross-cutting

| # | Doc | What it covers |
|---|---|---|
| 09 | [Chainage engine](09-chainage-engine.md) | **Read this first.** The one number every feature reduces to |
| 10 | [Accessibility](10-accessibility.md) | Type, contrast, touch targets, language, and the gaps |

---

## The 60-second version

```bash
npm install
cp .env.example .env.local     # optional — the app runs without it
npm run dev
```

<http://localhost:3000>

On a laptop the browser will place you at your IP location, which is nowhere
near the Wari route, so you will see the "off route" card. That is correct.
To see the app working, simulate a walk:

<http://localhost:3000/?sim=1>

To show the Palki prediction feature to someone:

```bash
npm run dev          # terminal 1
npm run demo         # terminal 2 — resets, then walks from km 0
```

Then open <http://localhost:3000/demo>.

## Everything you can run

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` / `npm run start` | production build and serve — **use this to test offline behaviour** |
| `npm run demo` | reset the Palki state and walk the route from km 0 at 300x |
| `npm run demo:fast` | the same at 1200x |
| `npm run demo:reset` | clear the Palki state and stop |
| `npm run test` | all three suites — 66 checks |
| `npm run test:geometry` | arc-length maths, 34 checks |
| `npm run test:estimator` | the Palki model, 32 checks |
| `npm run test:chainage` | chainage against a synthetic route |
| `npm run build:data` | regenerate route + schedule + fixtures |
| `npm run build:route` | snap the mukkam waypoints to roads (OSRM, build time only) |
| `npm run build:schedule` | regenerate the estimator's schedule prior |
| `npm run build:fixtures` | 25 test facilities — **re-run whenever the route changes** |
| `npm run sim` | the raw simulator, without the reset step |
| `npm run backtest` | replay the filter against historical arrivals |
| `npm run prep-route` | the one-time OSM harvest (Python) |
