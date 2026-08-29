# 03 · Facility finder — the SOS screen

**Module M3.** "Where can I get help?" — medical, food, rest, stay.

---

## What it does

`/help` opens on a large red **🆘 SOS** button and four category tiles.

**The SOS button** skips every intermediate screen and goes straight to the
detail view of the single nearest medical facility. One tap, one answer. That
is the entire design: someone pressing it is not in a state to browse a list.

**The four tiles** — ⚕️ Medical, 🍲 Food, 🪑 Rest, 🏨 Stay — each open a
ranked list of facilities ahead of you. Tapping a row opens a detail view
with:

- distance and walking ETA
- a `tel:` **call button** wired to the facility's real contact number
- a map drawing a **straight line** from you to it

The line is deliberately straight, not a routed path. There is no routing API
anywhere in this app (see below), and drawing a fake road would be claiming
guidance the app does not have.

---

## Why SOS uses a different search

This is the one piece of logic worth reading the code for.

| | Category tiles | SOS button |
|---|---|---|
| Function | `findNearestAhead()` | `findNearestEmergency()` |
| Direction bias | ahead of you only | none |
| Lookback | short | **15 km behind** |
| Off-route corridor | 3 km | **8 km** |
| Result | a ranked list | jumps to the single nearest |

Both live in [`lib/chainage.ts`](../lib/chainage.ts).

The reasoning: a walking pilgrim wants the next food camp *ahead*, because
backtracking wastes a day. But **in an emergency, direction of travel stops
mattering** — a hospital 4 km behind you beats one 30 km ahead. So the
emergency variant widens the corridor and drops the ahead-first bias.

Getting this wrong is not a cosmetic bug. `findNearestAhead()` on the Medical
button would silently route someone past the nearest hospital.

---

## How it works

Distance is arithmetic, not navigation:

```
your chainage        from GPS, via RouteIndex.locate()
facility chainage    computed once when the camp was registered, stored
distance             = facilityChainage − yourChainage
```

Both numbers are kilometres along the same polyline, so the subtraction is
the answer. This runs **entirely offline** once `route.json` and the facility
list are cached — which matters, because the Wari corridor has multi-hour
dead zones and a routing API needs a live connection.

Facility data loads Dexie-first ([`lib/facilities-data.ts`](../lib/facilities-data.ts)):
IndexedDB answers instantly, a background fetch refreshes it if the network is
up. The UI never blocks on the network.

---

## Files

| File | Role |
|---|---|
| [`app/help/page.tsx`](../app/help/page.tsx) | Three states on one route: categories → list → detail |
| [`components/FacilityCard.tsx`](../components/FacilityCard.tsx) | A row in the list |
| [`components/FacilityDetail.tsx`](../components/FacilityDetail.tsx) | Distance, ETA, call button |
| [`components/FacilityMap.tsx`](../components/FacilityMap.tsx) | The straight-line map |
| [`lib/chainage.ts`](../lib/chainage.ts) | `findNearestAhead` / `findNearestEmergency` |
| [`lib/facilities-data.ts`](../lib/facilities-data.ts) | Dexie-first facility loader |
| [`lib/types.ts`](../lib/types.ts) | `KIND_GROUPS` — which kinds map to which tile |
| [`app/api/v1/facilities/route.ts`](../app/api/v1/facilities/route.ts) | `GET` (public) / `POST` (register) |

---

## How to run it

```bash
npm run dev
```

Open <http://localhost:3000/help?sim=1>.

The `?sim=1` matters here. Without a position the app cannot rank anything by
distance, and every list shows "location needed" — which is correct, but not
a demo. With it, you are walking the real route and the lists populate.

### Where the facility data comes from

With no Supabase configured, the app serves **25 test facilities** from
`public/data/fixtures.json`:

```bash
npm run build:fixtures
```

These are deliberately imperfect: 3 are marked closed and 3 sit outside the
3 km corridor, so you can see the filters actually doing something rather
than trusting that they are. The script verifies every fixture by projecting
it back through the same turf engine the app uses, and fails rather than
shipping inconsistent data.

For real permanent facilities (hospitals, PHCs, pharmacies from OpenStreetMap):

```bash
pip install shapely pyproj requests
python scripts/build_route_data.py --route route.geojson --out public/data
```

This writes `public/data/pois.json` and a `seed.sql` to run in Supabase.

---

## How to verify it is correct

```bash
npm run test:chainage
```

The tail of the output ranks facilities ahead of a pilgrim at km 130 and
prints each distance and walking ETA. Check that the list is sorted, that
nothing behind the pilgrim appears, and that the ETAs match the distances at
3 km/h.

---

## Known limits

- **No admin login.** `POST /api/v1/facilities` is unauthenticated, and
  `PATCH /api/v1/facilities/[id]` has no ownership check — anyone who can
  reach the URL can add a camp or toggle its status. `db/schema.sql` already
  contains the real owner-gated RLS policies; the API bypasses them with the
  service-role client, so switching to real auth is a change to the route
  handlers, not the schema. See [04-camp-admin.md](04-camp-admin.md).
- **The straight line is not a walking route.** It shows bearing and
  distance, nothing more.
- **Facility chainages are tied to one route version.** Regenerate
  `route.json` and every stored chainage is meaningless until re-imported.
