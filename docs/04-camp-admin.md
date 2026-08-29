# 04 · Camp admin — registering a camp

**Module M4.** The screen a camp organiser uses to put their health / food /
rest camp on the pilgrims' map.

---

## What it does

`/admin` is a registration form plus a list of what this device has already
submitted.

**Registering** captures the camp's name, kind, contact number, and — the part
that matters — its **exact position**, taken by standing at the camp and
tapping a button.

**"My camps"** lists previous submissions with a status toggle that cycles
`open → full → closed`. A camp that has run out of beds can say so in one tap.

`/admin` has its own layout with **no bottom nav** — it is a different job for
a different person, and mixing it into the pilgrim navigation invites
mistaps.

---

## Why the pin is sampled, not taken once

A single `getCurrentPosition()` routinely lands a pin 40 m into the next
field. For a walking pilgrim that error is transient and smoothing absorbs
it. For a camp it is **permanent** — it is saved once, and every pilgrim who
navigates there inherits it.

So the admin flow uses
[`sampleStablePosition()`](../lib/geolocation.ts) instead:

1. collect up to **10 fixes** with accuracy ≤ 25 m
2. take the **median**, not the mean — one wild outlier cannot drag it
3. show live progress: *"8 of 10 good fixes, best ± 12 m"*

The form must reject anything worse than 25 m rather than saving it.

---

## Offline submissions

Camps get registered in exactly the places with no signal. So a submission
that fails, or is made offline, is **queued in IndexedDB**
(`lib/db.ts` → `pendingCamps`) and flushed automatically on reconnect —
both when the connection returns and once on mount, in case the app was
reopened already online with a queue left from last time.

The UI says which happened: *"✓ registered — pilgrims can see it now"* versus
*"saved — will send when connected"*. Those are different promises and the
screen never blurs them.

---

## Files

| File | Role |
|---|---|
| [`app/admin/page.tsx`](../app/admin/page.tsx) | The screen and the "my camps" list |
| [`app/admin/layout.tsx`](../app/admin/layout.tsx) | Its own layout — no bottom nav |
| [`components/CampForm.tsx`](../components/CampForm.tsx) | The form |
| [`components/LocationCapture.tsx`](../components/LocationCapture.tsx) | The stable-pin button and its progress readout |
| [`lib/camps.ts`](../lib/camps.ts) | Submit, queue, flush, local submission history |
| [`lib/geolocation.ts`](../lib/geolocation.ts) | `sampleStablePosition()` |
| [`lib/db.ts`](../lib/db.ts) | Dexie schema incl. the `pendingCamps` queue |
| [`app/api/v1/facilities/route.ts`](../app/api/v1/facilities/route.ts) | `POST` a new camp |
| [`app/api/v1/facilities/[id]/route.ts`](../app/api/v1/facilities/[id]/route.ts) | `PATCH` its status |

---

## How to run it

```bash
npm run dev
```

Open <http://localhost:3000/admin>.

**The location capture needs real GPS.** On a laptop it will sample your IP
location ten times and report a terrible accuracy — which is the correct
outcome. To exercise the flow properly, open it on a phone over HTTPS (see
[01-home-distance.md](01-home-distance.md#to-test-on-a-real-phone)) and stand
outside.

### To test the offline queue

1. Open `/admin`, fill the form, capture a position
2. Open DevTools → Network → **Offline**
3. Submit — it should say *saved, will send when connected*
4. Set Network back to **Online** — it should flush within a second and move
   into "my camps"

Note the service worker is disabled in `next dev`. For the full offline
picture use `npm run build && npm run start`.

### Where submissions go

With `SUPABASE_SERVICE_ROLE_KEY` set, into the `facilities` table, and they
appear immediately in `/help` for every pilgrim. Without it, the API accepts
the write and holds it in an in-process store that dies with the dev server —
fine for a demo, useless as a record.

---

## Two honest limitations

**No admin login.** `POST /api/v1/facilities` is unauthenticated, and the
`PATCH` has no ownership check. Anyone who can reach the URL can register a
camp or toggle someone else's status. This was a deliberate simplification,
not an oversight: `db/schema.sql` already contains owner-gated RLS policies,
and the API bypasses them with the service-role client. Switching to real
auth is a change to the route handlers, not to the schema.

Consequently **"my camps" means "submitted from this browser"** (localStorage),
not a real account. Clear site data and they are gone from the list — though
not from the database.

**Chainage is computed server-side, in TypeScript, not by the DB trigger.**
The `compute_chainage` trigger derived chainage from `ST_LineLocatePoint`,
which measures in planar degrees and then gets multiplied by a geodesic
length — two different measures. At this latitude that ran **0.5 km short on
average and 1.2 km at worst**, always in the same direction, against the turf
engine the browser uses. Since a pilgrim's chainage comes from turf and the
finder subtracts one from the other, that error landed directly in every
distance shown to a pilgrim.

Chainage is now computed by the same `RouteIndex` the client uses
([`lib/facilities/chainage-server.ts`](../lib/facilities/chainage-server.ts))
and written explicitly. The trigger keeps its approximation only as a
fallback for hand-written SQL. See
[`db/fix_chainage_trigger.sql`](../db/fix_chainage_trigger.sql). `offset_m`
was never affected — `ST_Distance` on `geography` is genuinely geodesic.

---

## Related

A second, richer admin surface for managing **all** facility locations on a
map — search, filters, full CRUD — lives in
[07-admin-locations.md](07-admin-locations.md). That one is built as a
drop-in module for an external admin dashboard.
