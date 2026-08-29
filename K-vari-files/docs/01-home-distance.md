# 01 · Home screen — "How far is Pandharpur?"

**Module M1.** The screen the app opens on, and the only one most pilgrims
will ever use.

---

## What it does

Answers one question in one number: **how much further to the Vitthal temple
at Pandharpur**, walking along the actual Wari route — not the straight-line
distance a maps app would show.

Under that number:

| Element | What it means |
|---|---|
| `142.3 किमी` | Route distance remaining, temple minus your position |
| `🚶 47 तास` | Walking ETA at 3 km/h, the honest pace of a Wari |
| `± 12 m` chip | GPS accuracy right now |
| `सध्याचे स्थान` | Your chainage — how far you have already come |
| Stage line | Which mukkam leg you are on (`Lonand → Taradgaon`) |
| Route glance | A short map with your dot, plus today's stage progress |
| 🆘 / 🛕 buttons | The two shortcuts a pilgrim reaches for in a hurry |

If you wander off the route it switches to an amber card: how far to rejoin
the route, and the straight-line distance, side by side.

---

## How it works

Everything reduces to **chainage** — one number, kilometres along a fixed
polyline. See [09-chainage-engine.md](09-chainage-engine.md) for the maths;
the short version:

```
GPS chip
  → navigator.geolocation.watchPosition        browser
  → LocationTracker.accept()                   lib/geolocation.ts   reject + smooth
  → RouteIndex.locate()                        lib/chainage.ts      snap to polyline
  → AppProvider                                lib/app-context.tsx  one shared instance
  → useApp()                                   any page
  → RouteIndex.distanceToTemple()              lib/chainage.ts
  → <DistanceCard>                             components/DistanceCard.tsx
```

Distance to temple is then just `routeLength − yourChainage`. No routing API,
no network call, no server. It works with the phone in airplane mode as long
as `route.json` has been cached once.

### Why the GPS is smoothed first

A raw phone fix jumps 20–40 m between reads. Unsmoothed, the big distance
number flickers and you intermittently look "off route" when you are not.
`lib/geolocation.ts` fixes that in layers:

1. reject fixes with accuracy worse than 50 m
2. reject physically impossible jumps (teleports)
3. exponentially smooth what survives, weighted by reported accuracy
4. snap the result to the route line

The count of rejected fixes is shown while waiting, so a stuck GPS looks like
a stuck GPS rather than a frozen app.

---

## Files

| File | Role |
|---|---|
| [`app/page.tsx`](../app/page.tsx) | The screen |
| [`components/DistanceCard.tsx`](../components/DistanceCard.tsx) | The big number, ETA, off-route card |
| [`components/RouteGlance.tsx`](../components/RouteGlance.tsx) | Map + today's stage, below the number |
| [`components/AccuracyChip.tsx`](../components/AccuracyChip.tsx) | The ± badge |
| [`lib/chainage.ts`](../lib/chainage.ts) | Projection, distance, nearest-ahead |
| [`lib/geolocation.ts`](../lib/geolocation.ts) | Fix gating and smoothing |
| [`lib/app-context.tsx`](../lib/app-context.tsx) | One `LocationTracker` + `RouteIndex` app-wide |
| [`lib/route-data.ts`](../lib/route-data.ts) | Dexie-first `route.json` loader |

---

## How to run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. On a laptop the browser will ask for location
permission and then place you wherever your IP says you are — which is
nowhere near the Wari route, so you will see the amber "off route" card. That
is correct behaviour, not a bug.

### To see it working properly, simulate a walk

```
http://localhost:3000/?sim=1
```

`?sim=1` (development only — [`lib/sim.ts`](../lib/sim.ts)) replaces
`navigator.geolocation` with a fake track that walks the real route at 3 km/h
with realistic jitter. `LocationTracker` cannot tell the difference; it just
receives fixes through the normal browser API. A **SIMULATION** badge appears
at the top so this can never be mistaken for live data.

### To test on a real phone

Browsers block geolocation on plain HTTP except on `localhost`. Either:

- tunnel it — `ngrok http 3000` — for a real HTTPS URL, or
- Android Chrome: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
  → add `http://<your-lan-ip>:3000` → relaunch, then run
  `npm run dev -- -H 0.0.0.0`

### To inspect the GPS pipeline

<http://localhost:3000/test> shows the raw fix, the smoothed fix, the
resulting chainage and offset, and the rejected-fix count, live.

---

## How to verify it is correct

```bash
npm run test:chainage
```

Projects six known points (Alandi, Pune, Jejuri, Phaltan, Malshiras, the
temple) onto a synthetic route and prints the chainage and remaining distance
for each. Alandi must read 0.0 km and the temple must read the full route
length; an off-route point (Baramati) must report a large offset.

---

## Known limits

- **Polyline density sets accuracy.** A sparse trace reads ~15% short. The
  current route averages 68 m between points; the build scripts warn above
  200 m.
- **Chainage assumes forward travel.** Walking backwards gives stale results
  until you pass a facility again.
- **Regenerating `route.json` invalidates every stored chainage** — fixtures
  and Supabase `facilities` rows alike. Re-run `npm run build:fixtures` and
  re-import the route row together.
