# 09 · The chainage engine

Not a feature — the one piece of business logic every feature is built on.
**Read this before touching anything else.**

---

## The core idea

The Wari route is a fixed polyline, walked in one direction, by people on
foot. That means **every position question collapses to a single number**:
how far a point is along that polyline, in kilometres. Its *chainage*.

| Question | Becomes |
|---|---|
| How far to Pandharpur? | `routeLength − myChainage` |
| Where am I? | snap my GPS fix to the line, read the chainage |
| Nearest hospital ahead? | facilities with `chainage >= mine`, sorted by the difference |
| Am I off route? | perpendicular distance from the line, in metres |
| How far through today's stage? | `myChainage − stage.startKm` |

All of it is arithmetic on two numbers.

## Why not a maps API

**There is no routing or directions API anywhere in this app.** Not for cost —
because a road-routing API needs a live network connection, and the Wari
corridor has dead zones lasting hours. A distance that stops working when the
signal drops is not a distance a pilgrim can rely on.

Chainage arithmetic runs entirely offline, client-side, once the route
polyline is cached. That is the whole architectural bet, and everything else
follows from it.

---

## The engine

[`lib/chainage.ts`](../lib/chainage.ts) — `RouteIndex`.

Built once from `route.json` and shared app-wide through
[`lib/app-context.tsx`](../lib/app-context.tsx), because building the
cumulative-distance array for 4197 points on every render would be wasteful
and it never changes.

| Method | Returns |
|---|---|
| `locate(lat, lng)` | `{ chainageKm, offsetM, onRoute, snapped }` |
| `distanceToTemple(lat, lng)` | `{ routeKm, directKm, joinKm, onRoute, position }` |
| `stageAt(km)` | which mukkam stage that chainage falls in |
| `remainingStages(km)` | the stages from here to the end |
| `findNearestAhead(...)` | ranked facilities ahead — the category lists |
| `findNearestEmergency(...)` | ranked facilities in **any** direction — SOS |

Projection uses `@turf/nearest-point-on-line` and `@turf/distance`, imported
as **individual packages, not the full `turf` bundle** — that is the one
dependency on the bundle-size budget.

### The two search variants

`findNearestAhead()` biases forward, because backtracking costs a walking
pilgrim a day.

`findNearestEmergency()` drops that bias entirely: 15 km lookback, 8 km
off-road corridor, no ahead-first ordering. **In an emergency direction of
travel stops mattering** — a hospital 4 km behind beats one 30 km ahead.

Using the wrong one on the SOS button would silently route someone past the
nearest hospital. See [03-facility-finder.md](03-facility-finder.md).

---

## Where chainage is computed

**In TypeScript, by the same `RouteIndex` on both sides.**

| Side | Module |
|---|---|
| Browser | [`lib/chainage.ts`](../lib/chainage.ts) |
| Server (facility writes) | [`lib/facilities/chainage-server.ts`](../lib/facilities/chainage-server.ts) |
| Server (Palki) | [`lib/palki/geometry.ts`](../lib/palki/geometry.ts) |

This matters more than it looks. The Postgres `compute_chainage` trigger
derived chainage from `ST_LineLocatePoint`, which measures in **planar
degrees** and then gets multiplied by a **geodesic** length — two different
measures. At this latitude that ran **0.5 km short on average and 1.2 km at
worst**, always in the same direction, against the turf engine the browser
uses.

Because a pilgrim's chainage comes from turf and `findNearestAhead()`
subtracts one from the other, that error landed directly in every distance
shown to a pilgrim. Chainage is now computed in TypeScript and written
explicitly; the trigger keeps its approximation only as a fallback for
hand-written SQL. See
[`db/fix_chainage_trigger.sql`](../db/fix_chainage_trigger.sql).

`offset_m` was never affected — `ST_Distance` on `geography` is genuinely
geodesic.

---

## GPS smoothing

A raw phone fix jumps 20–40 m between reads, enough to make the distance
number flicker and to make someone briefly look off-route when they are not.
[`lib/geolocation.ts`](../lib/geolocation.ts) fixes this in layers:

1. **reject** fixes with accuracy worse than 50 m
2. **reject** physically impossible jumps
3. **exponentially smooth** what survives, weighted by reported accuracy
4. **snap** to the route line

For camp registration a single fix is not good enough — the error becomes
permanent. `sampleStablePosition()` collects ~10 fixes at ≤25 m and takes the
**median**. See [04-camp-admin.md](04-camp-admin.md).

---

## How to verify it

```bash
npm run test:chainage     # six known points along a synthetic route
npm run test:geometry     # 34 checks on the arc-length maths
```

`test:chainage` projects Alandi, Pune, Jejuri, Phaltan, Malshiras and the
temple. Alandi must read 0.0 km, the temple must read the full route length,
and an off-route point (Baramati) must report a large offset. Then it ranks
facilities ahead of a pilgrim at km 130.

Live, in the browser: <http://localhost:3000/test> shows raw fix, smoothed
fix, chainage, offset and rejected-fix count.

---

## Known limits

- **Polyline density sets accuracy.** Sparse traces read ~15% short. The
  current route averages 68 m; both build scripts warn above 200 m.
- **Chainage is a position along ONE specific polyline.** Regenerating
  `route.json` invalidates every stored chainage — fixtures and Supabase
  `facilities` rows alike. Re-run `npm run build:fixtures` and re-import the
  route row **together**.
- **The route passes near itself in a few places.** A point a few km off the
  road can legitimately project onto a different stretch than the one it
  looks closest to on screen. `build_fixtures.mjs` detects and reports this
  rather than pretending it does not happen. `lib/palki/geometry.ts`
  disambiguates using the previous position.
- **Chainage assumes forward travel.** Walking backwards gives stale results
  until you pass a facility again; the `lookbackKm` window covers most of it.
