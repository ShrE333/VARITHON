# Admin Location Management

A self-contained module for managing map locations from an admin panel —
list, map, form, search, filters, full CRUD.

Extracted from the Wari Saathi PWA to drop into a separate React admin panel,
with every dependency on that project removed.

```tsx
import { LocationManagement } from './admin-locations';

<LocationManagement />
```

That renders the whole feature. No providers, no context, no wrapper.

---

## 1. What is in the box

```
src/admin-locations/          ← THE MODULE. Copy this folder.
  index.ts                      public surface — import from here
  types.ts                      AdminLocation, inputs, filters, ServiceResult
  categories.ts                 the 15-category registry (labels/icons/colours)
  validation.ts                 field + coordinate rules, duplicate detection
  service.ts                    every network call. The backend seam.
  useLocations.ts               React hook: state, filtering, CRUD
  mapper.ts                     DB row ⇄ AdminLocation          [server only]
  auth.ts                       isAdminAuthorised()             [server only]
  components/
    LocationManagement.tsx      everything wired together — the drop-in
    LocationList.tsx            table + search + filters + edit/delete
    LocationForm.tsx            create/edit with inline validation
    LocationMap.tsx             provider-agnostic map contract
    providers/
      LeafletLocationMap.tsx    the only file that knows Leaflet exists

server/
  handlers.ts                   the five operations, NO web framework
  store.supabase.ts             a LocationStore backed by Supabase
  nextjs/                       ─┐ alternative adapters.
    route.ts                     │ Ship ONE, delete the other.
    [id]/route.ts                │
  express/                      ─┘
    locations.router.ts

db/001_locations.sql          one table, one view. No PostGIS.
examples/BasicUsage.tsx       three ways to mount it
```

**~1,400 lines.** `src/` has zero framework imports — no Next, no Vite, no
router. It is plain React 18.

---

## 2. Install

### Step 1 — copy

```
src/admin-locations/   →   your-panel/src/admin-locations/
```

### Step 2 — dependencies

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

Plus `@supabase/supabase-js` **only** if you use `server/store.supabase.ts`.

### Step 3 — Leaflet CSS

`providers/LeafletLocationMap.tsx` imports `leaflet/dist/leaflet.css` itself.
If your bundler does not handle CSS imports from `node_modules`, add it to
your global stylesheet instead.

### Step 4 — database

Run [`db/001_locations.sql`](db/001_locations.sql). It is idempotent.

### Step 5 — backend

Copy **one** adapter into your API layer:

| Your panel | Copy | To |
|---|---|---|
| Next.js App Router | `server/nextjs/route.ts` | `app/api/v1/admin/locations/route.ts` |
| | `server/nextjs/[id]/route.ts` | `app/api/v1/admin/locations/[id]/route.ts` |
| Express / Vite + Node | `server/express/locations.router.ts` | wherever your routers live |

Both need `server/handlers.ts` and `server/store.supabase.ts` alongside them.

### Step 6 — mount it

```tsx
<LocationManagement />
```

It renders no page chrome and no fixed width — it fills its container, so
your layout stays in charge.

---

## 3. The API it expects

Five endpoints at any base path:

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/` | no | `AdminLocation[]` (incl. inactive) |
| `POST` | `/` | **yes** | `AdminLocation` (201) |
| `GET` | `/:id` | no | `AdminLocation` |
| `PATCH` | `/:id` | **yes** | `AdminLocation` |
| `DELETE` | `/:id` | **yes** | `204` |

Errors: `{ error: string, fieldErrors?: Record<string,string> }`.
`fieldErrors` is keyed by form field name and **renders inline automatically** —
return it and the form highlights the right inputs with no extra work.

### Pointing at a different backend

`service.ts` is the only file that calls `fetch`. Change it once, at app
start, and the hook, form, list and map all keep working:

```ts
import { configureLocationService } from './admin-locations';

configureLocationService({
  baseUrl: '/api/admin/locations',
  headers: () => ({ authorization: `Bearer ${session.token}` }),
});
```

`headers` is called on **every** request, so a refreshed token is picked up.

---

## 4. Using a different database

`server/handlers.ts` talks to a `LocationStore` interface — five methods:

```ts
interface LocationStore {
  list(): Promise<LocationRow[]>;
  get(id: string): Promise<LocationRow | null>;
  create(row: Record<string, unknown>): Promise<LocationRow>;
  update(id: string, row: Record<string, unknown>): Promise<LocationRow | null>;
  remove(id: string): Promise<boolean>;
}
```

Write one against Prisma, Drizzle, raw `pg`, or Mongo and pass it in.
`store.supabase.ts` is a 70-line reference implementation.

If your **column names** differ, edit `src/admin-locations/mapper.ts` — it is
the single translation point between your rows and `AdminLocation`, and it is
commented for exactly this.

---

## 5. Authentication — read this before deploying

Out of the box, writes are gated by a **shared bearer token** in
`ADMIN_API_TOKEN`.

> **If `ADMIN_API_TOKEN` is unset, writes are UNPROTECTED** and the server
> logs a warning once per process. That is fine locally. It is not fine
> deployed, because `DELETE` is a real endpoint anyone could call.

**To use your panel's real auth, replace one function** —
`src/admin-locations/auth.ts`:

```ts
export async function isAdminAuthorised(req: Request): Promise<boolean> {
  const session = await getSessionFromRequest(req);
  return session?.user?.role === 'admin';
}
```

Every write path calls only that function. That is the whole change.

(The Express adapter has its own inline copy, because Express hands you its
own request object rather than a WHATWG `Request` — same edit, same file.)

---

## 6. Component reference

### `<LocationManagement />`

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `mapHeight` | `number` | `420` | map height in px |
| `className` | `string` | `'space-y-4'` | replaces the root class entirely |
| `onChange` | `() => void` | — | fires after any successful create/update/delete |

### `<LocationMap />`

| Prop | Type | Notes |
|---|---|---|
| `locations` | `AdminLocation[]` | **required.** Never fetches its own data |
| `selectedId` | `string \| null` | draws that marker larger, with a dark ring |
| `draftPosition` | `{latitude, longitude} \| null` | the draggable pin being placed |
| `draftCategory` | `string` | so the draft pin previews the right icon/colour |
| `onMapClick` | `(lat, lng) => void` | fires on any map click |
| `onMarkerDrag` | `(lat, lng) => void` | fires when the draft pin is dragged |
| `onMarkerClick` | `(id) => void` | |
| `center` / `zoom` | `[number, number]` / `number` | omit to auto-fit all markers |
| `height` | `number` | px, default `400` |
| `tileUrl` / `attribution` | `string` | swap the basemap without touching code |

### `<LocationForm />`

| Prop | Type | Notes |
|---|---|---|
| `onSubmit` | `(input) => Promise<ServiceResult>` | **required.** Return the result *unchanged* so field errors map to inputs |
| `initial` | `AdminLocation \| null` | supply to edit, omit to create |
| `coordinates` | `{latitude, longitude} \| null` | map-driven position |
| `onCoordinatesChange` | `(lat, lng) => void` | fires when lat/lng typed by hand |
| `onCategoryChange` | `(category) => void` | |
| `onCancel` | `() => void` | hides the cancel button if omitted |
| `submitting` | `boolean` | |

### `<LocationList />`

| Prop | Type | Notes |
|---|---|---|
| `locations` | `AdminLocation[]` | **required** |
| `loading` / `error` | `boolean` / `string \| null` | |
| `filters` / `onFiltersChange` | `LocationFilters` | |
| `onSelect` / `onEdit` / `onDelete` | `(location) => void` | buttons hidden if the handler is omitted |
| `showFilters` | `boolean` | `false` if your panel has its own filter bar |

### `useLocations()`

`{ locations, filtered, loading, error, filters, setFilters, refresh, create, update, remove, mutating }`

---

## 7. Design decisions worth knowing

**`status` and `availability` are separate fields on purpose.**

- `status`: `active` / `inactive` — is this record published at all?
- `availability`: `open` / `full` / `closed` — operational state.

A place can be *active* (listed) but *closed* (no capacity tonight).
Collapsing them would make "hide this mistyped record" impossible to express
without also claiming the place is shut.

**Categories are a TypeScript registry, not a database enum.**
`categories.ts` owns labels, icons and colours. Adding one is a single line
there — the dropdown, map markers, list badges and filters all pick it up.
No migration. A Postgres enum would need one, and could never drop a value
again.

**Validation is shared between the form and the server.** The same
`validateCreate` runs in both places, so the client and API can never
disagree about what a valid location is.

**Delete is permanent.** Set `status: 'inactive'` to hide something
recoverably.

**Styling is stock Tailwind only.** No custom tokens, no theme config
required. Every component takes a `className` override, so it renders
functional-but-unstyled without Tailwind and can be restyled entirely.

---

## 8. What was deliberately left behind

This module came out of a pilgrimage app. These were removed as
project-specific — the feature does not need them:

| Removed | Why |
|---|---|
| **Chainage** (`lib/chainage.ts`, `@turf/*`, `route.json`) | Computed "km along the Pandharpur route" for each pin. Meaningless outside that app. **No UI component ever read it** — it was server-side only. |
| **PostGIS** (`geography(Point,4326)`, `ST_X`/`ST_Y`, WKT) | Two `double precision` columns hold a coordinate fine. This was the single hardest dependency to carry. |
| **`routes` table + FK, 3 Postgres enums** | Existed only to scope facilities to one pilgrimage route. |
| Pilgrim-side SOS UI, distance/ETA cards, offline Dexie queue, GPS smoothing, Palki forecast, i18n | Unrelated features of the host app. |

If you ever need "distance along a fixed path", it can come back — but it
belongs in your own code, not in this module.

---

## 9. Compatibility

| | Status |
|---|---|
| **React** | 18+. Hooks only — `useState/useEffect/useMemo/useCallback/useRef`. No context, no Redux, no router. |
| **Next.js** | **Not required.** `src/` has zero Next imports. The map uses `React.lazy` + `Suspense`. |
| **Vite / CRA / Remix / Next** | All fine. `npm run typecheck` in this repo proves `src/` compiles with no framework installed. |
| **SSR** | Leaflet touches `window` at import time, so the map is code-split and client-only by design. Safe to render on a server. |
| **Map provider** | Leaflet is isolated behind `LocationMapProps` in one file. Swap to Mapbox/Google by writing one new provider against that interface. |
| **Database** | Any. Supabase reference impl included; swap via `LocationStore`. |
| **Styling** | Tailwind (stock utilities). Overridable via `className` on every component. |

---

## 10. Troubleshooting

**Map area is blank / grey** — Leaflet CSS is not loaded. See Step 3.

**Markers do not appear** — `locations` is empty, or lat/lng arrived as
strings. `mapper.ts` normalises with `Number()`; if you replaced it, do the
same.

**Every write returns 401** — `ADMIN_API_TOKEN` differs between client and
server, or you replaced `auth.ts` and the session check is failing.

**Writes succeed but nothing persists** — the Supabase service-role key is
missing, so `createSupabaseClient()` returned `null` and the route answered
503. Check the server log.

**Form shows no error messages** — your API is not returning `fieldErrors`,
or `onSubmit` is not returning the `ServiceResult` unchanged.

---

## Verify before you hand it over

```bash
npm install
npm run typecheck      # must be clean
```
