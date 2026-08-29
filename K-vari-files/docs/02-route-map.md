# 02 · Route map & mukkam schedule

**Module M2.** The whole 285 km line, and the 15-day stage plan along it.

---

## What it does

Two things on one screen at `/route`:

**The map.** The full route polyline in saffron, the Vitthal temple marked at
the end, your own position as a pulsing blue dot. If you are off the route, a
dashed amber line is drawn from you to the nearest point on it — so "you are
2 km off" is visible, not just stated.

A **📍 follow button** keeps the map centred on you. Dragging the map turns
follow off (that is what dragging *means*), and the button turns it back on.

**The schedule.** All 15 mukkam stages as a list — `Alandi → Pune`,
`Pune → Saswad`, and so on. Today's stage is highlighted in saffron and
labelled आज, and a badge counts the stages you still have left.

A shortened version of both now also appears on the home screen
([`RouteGlance`](../components/RouteGlance.tsx)) — a 260 px map plus today's
stage with a progress bar — because "which stage am I on" turned out to be a
question people asked before they thought to open a second tab.

---

## How it works

The route comes from `public/data/route.json`, prepared **once at build time**
and committed. Nothing here calls a routing service at runtime.

```
public/data/route.json
  → lib/route-data.ts        Dexie-first: IndexedDB instantly, network in background
  → RouteIndex               lib/chainage.ts
  → route.bundle.coordinates → <Polyline>            (GeoJSON [lng,lat] → Leaflet [lat,lng])
  → route.stageAt(km)        → highlighted row
  → route.remainingStages(km) → the "8 stages left" badge
```

Coordinates are stored `[lng, lat]` (GeoJSON order) and flipped to `[lat, lng]`
for Leaflet. Getting that backwards puts the Wari in the Indian Ocean, which
is at least an obvious failure.

**Leaflet is dynamic-imported with `ssr: false`.** It touches `window` at
import time, so it cannot be server-rendered, and it is the heaviest
dependency in the app — keeping it in a lazy chunk is what stops it landing
in the initial payload of every page.

Map tiles are OpenStreetMap raster tiles. No Google, no Mapbox, no API key.
The service worker caches zoom 10–15 stale-while-revalidate, so a route you
have already looked at still draws with no signal.

---

## Files

| File | Role |
|---|---|
| [`app/route/page.tsx`](../app/route/page.tsx) | The screen |
| [`components/RouteMap.tsx`](../components/RouteMap.tsx) | Leaflet map, follow control, off-route line |
| [`components/StageSchedule.tsx`](../components/StageSchedule.tsx) | The 15-stage list |
| [`components/RouteGlance.tsx`](../components/RouteGlance.tsx) | The home-screen short version |
| [`public/data/route.json`](../public/data/route.json) | 4197 points, 285.6 km, stages, destination |
| [`scripts/build_road_route.mjs`](../scripts/build_road_route.mjs) | Generates that file |

---

## How to run it

```bash
npm run dev
```

Open <http://localhost:3000/route>, or <http://localhost:3000/route?sim=1> to
walk the route and watch the dot move and the highlighted stage advance.

### Regenerating the route

```bash
npm run build:route      # or: npm run build:data  (route + schedule + fixtures)
```

`scripts/build_road_route.mjs` snaps the 15 mukkam waypoints to real roads via
OSRM's free public demo server and writes:

- `public/data/route.json` — the road-following polyline
- `route.geojson` — the same line, ready for `build_route_data.py`

> **This does not break the "no routing API" rule.** The *app* never calls a
> routing service — every distance is chainage arithmetic against this file,
> offline. This script calls OSRM **once, at build time, on a developer's
> machine**, and its output is committed. Set `OSRM_BASE` to point at your own
> instance if you would rather not depend on the demo server.

**Re-run `npm run build:fixtures` whenever the route changes.** Chainage is a
position along one specific polyline; old chainages are meaningless against a
new one.

---

## How to verify it is correct

```bash
npm run test:geometry     # 34 checks — arc length, projection, self-overlap
```

Visually: at zoom 14–16 the line should sit on NH965 through Jejuri and on
Budhale Road into Pandharpur, ending at the temple.

---

## Known limits

- **This is the road route, not the official palkhi footpath.** OSRM routes a
  vehicle between mukkam towns; the palkhi occasionally leaves the motor
  road. Two legs (Phaltan→Barad, Velapur→Bhalavani) route noticeably longer
  than the straight line and are worth checking against the official route.
  If you obtain the Sansthan's official GPX/KML, drop it in as
  `route.geojson` and run `build_route_data.py` — nothing downstream changes.
- **The route passes near itself in a few places.** A point a few km off the
  road can legitimately project onto a different stretch than the one it looks
  closest to on screen.
- **The service worker is disabled in `next dev`.** Test offline behaviour
  against `npm run build && npm run start`, never `dev`.
