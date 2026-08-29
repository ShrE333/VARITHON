# Admin Location Management — Integration Guide

A self-contained module for managing the locations that appear in the
user-facing SOS / help feature. Built to drop into an existing admin panel
without changing that panel's layout, routing, or styling.

**Quickest possible integration:**

```tsx
import { LocationManagement } from '@/components/admin-locations';

<LocationManagement />
```

That renders the whole feature — list, map, form, search, filters, CRUD.
No providers, no context, no wrapper required.

---

## 1. Files created

Nothing existing was modified except `db/schema.sql`'s `facilities_public`
view (extended, not replaced — see §8).

### Logic — `lib/admin-locations/`

| File | Purpose |
|---|---|
| `types.ts` | `AdminLocation`, inputs, filters, `ServiceResult`. No framework imports. |
| `categories.ts` | The category registry. **Single source of truth** for labels, icons, colours. |
| `validation.ts` | Field + coordinate validation, duplicate detection. Shared by form and API. |
| `service.ts` | All network calls. `getLocations` / `getLocationById` / `createLocation` / `updateLocation` / `deleteLocation`. |
| `useLocations.ts` | React hook: state, filtering, CRUD, loading/error. |
| `mapper.ts` | DB row ⇄ `AdminLocation`. Server-side. |
| `auth.ts` | **The file you replace with your own auth** — see §6. |

### UI — `components/admin-locations/`

| File | Purpose |
|---|---|
| `index.ts` | Barrel export. Import from here. |
| `LocationManagement.tsx` | Everything wired together. The drop-in. |
| `LocationList.tsx` | Table + search + filters + edit/delete. |
| `LocationForm.tsx` | Create/edit form with inline validation. |
| `LocationMap.tsx` | Provider-agnostic map contract. No map library imported here. |
| `providers/LeafletLocationMap.tsx` | The only file that knows about Leaflet. |

### API — `app/api/v1/admin/locations/`

| Route | Methods |
|---|---|
| `route.ts` | `GET` (all, including inactive), `POST` |
| `[id]/route.ts` | `GET`, `PATCH`, `DELETE` |

### Other

- `db/admin_locations.sql` — migration. **Must be run.** See §8.
- `app/admin-locations/page.tsx` — test harness. **Delete after integrating.**

---

## 2. Dependencies added

**None.** The module uses only what the project already had:
`react`, `next`, `leaflet`, `react-leaflet`, `@supabase/supabase-js`,
and Tailwind.

---

## 3. Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | already set |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server-side writes; already set |
| `NEXT_PUBLIC_ROUTE_SLUG` | yes | already set |
| `ADMIN_API_TOKEN` | **recommended** | gates create/update/delete. See §6. |

---

## 4. Integrating into your admin panel

### Option A — the whole feature

```tsx
import { LocationManagement } from '@/components/admin-locations';

export default function LocationsPage() {
  return (
    <YourAdminLayout title="Locations">
      <LocationManagement />
    </YourAdminLayout>
  );
}
```

`LocationManagement` renders no page chrome, no background, no fixed width.
It fills its container.

Props (all optional):

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `mapHeight` | `number` | `420` | Map height in px |
| `className` | `string` | `'space-y-4'` | Replaces the root class entirely |
| `onChange` | `() => void` | — | Fires after any successful create/update/delete |

### Option B — compose the pieces yourself

```tsx
import {
  useLocations, LocationList, LocationMap, LocationForm,
} from '@/components/admin-locations';

function MyLocationsScreen() {
  const { filtered, loading, error, filters, setFilters, create, remove } = useLocations();
  const [draft, setDraft] = useState(null);

  return (
    <>
      <LocationMap
        locations={filtered}
        draftPosition={draft}
        onMapClick={(lat, lng) => setDraft({ latitude: lat, longitude: lng })}
        height={500}
      />
      <LocationForm coordinates={draft} onSubmit={create} />
      <LocationList
        locations={filtered}
        loading={loading}
        error={error}
        filters={filters}
        onFiltersChange={setFilters}
        onDelete={remove}
      />
    </>
  );
}
```

### Component prop reference

**`<LocationMap />`**

| Prop | Type | Notes |
|---|---|---|
| `locations` | `AdminLocation[]` | **Required.** Never fetches its own data |
| `selectedId` | `string \| null` | Draws that marker larger, with a dark ring |
| `draftPosition` | `{latitude, longitude} \| null` | The draggable pin being placed |
| `draftCategory` | `string` | So the draft pin previews the right icon/colour |
| `onMapClick` | `(lat, lng) => void` | Fires on any map click |
| `onMarkerDrag` | `(lat, lng) => void` | Fires when the draft pin is dragged |
| `onMarkerClick` | `(id) => void` | |
| `center` / `zoom` | `[number, number]` / `number` | Omit to auto-fit all markers |
| `height` | `number` | px, default `400` |
| `tileUrl` / `attribution` | `string` | Swap the basemap without touching code |

**`<LocationForm />`**

| Prop | Type | Notes |
|---|---|---|
| `onSubmit` | `(input) => Promise<ServiceResult>` | **Required.** Return the result unchanged so field errors map to inputs |
| `initial` | `AdminLocation \| null` | Supply to edit, omit to create |
| `coordinates` | `{latitude, longitude} \| null` | Map-driven position |
| `onCoordinatesChange` | `(lat, lng) => void` | Fires when lat/lng typed by hand |
| `onCategoryChange` | `(category) => void` | |
| `onCancel` | `() => void` | Hides the cancel button if omitted |
| `submitting` | `boolean` | |

**`<LocationList />`**

| Prop | Type | Notes |
|---|---|---|
| `locations` | `AdminLocation[]` | **Required** |
| `loading` / `error` | `boolean` / `string \| null` | |
| `filters` / `onFiltersChange` | `LocationFilters` | |
| `onSelect` / `onEdit` / `onDelete` | `(location) => void` | Buttons hidden if handler omitted |
| `showFilters` | `boolean` | Set `false` if your panel has its own filter bar |

---

## 5. API endpoints

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/api/v1/admin/locations` | no | `AdminLocation[]` (incl. inactive) |
| `POST` | `/api/v1/admin/locations` | **yes** | `AdminLocation` (201) |
| `GET` | `/api/v1/admin/locations/:id` | no | `AdminLocation` |
| `PATCH` | `/api/v1/admin/locations/:id` | **yes** | `AdminLocation` |
| `DELETE` | `/api/v1/admin/locations/:id` | **yes** | `204` |

Errors return `{ error: string, fieldErrors?: Record<string,string> }`.
`fieldErrors` is keyed by form field name and renders inline automatically.

**Pointing the module at different endpoints** (e.g. if your panel mounts
them elsewhere, or you add a session token):

```ts
import { configureLocationService } from '@/components/admin-locations';

configureLocationService({
  baseUrl: '/api/admin/locations',
  headers: () => ({ authorization: `Bearer ${session.token}` }),
});
```

Call once at app start. Nothing else changes.

---

## 6. Security — read this

**Right now, write operations are protected only by a shared token**, because
this project has no admin login. Set `ADMIN_API_TOKEN` in the environment and
send it as `Authorization: Bearer <token>`.

If `ADMIN_API_TOKEN` is unset, **writes are unprotected** and a warning is
logged once per process. That is fine locally; it is not fine deployed,
because `DELETE` is now a real endpoint anyone could call.

**To use your panel's real auth**, replace one function —
`lib/admin-locations/auth.ts`:

```ts
export async function isAdminAuthorised(req: Request): Promise<boolean> {
  const session = await getSessionFromRequest(req);
  return session?.user?.role === 'admin';
}
```

Every write route calls only that function, so this is the whole change.

---

## 7. Backend changes required

**One migration must be run** in the Supabase SQL Editor:

```
db/admin_locations.sql
```

Idempotent — safe to run more than once.

---

## 8. Design decisions worth knowing

**This extends the existing `facilities` table rather than creating a new
`locations` table.** The user-facing SOS feature already exists and reads
`facilities`. A separate table would mean nothing an admin adds ever reaches
a pilgrim — the opposite of the requirement. One table, one source of truth.

**`status` and `availability` are separate fields on purpose.**

- `status`: `active` / `inactive` — is this record published at all?
- `availability`: `open` / `full` / `closed` — operational state.

A camp can be *active* (listed) but *closed* (no beds tonight). Collapsing
them would make "hide this mistyped record" indistinguishable from "this
place is shut".

**Only `active` locations reach users.** Enforced in the `facilities_public`
database view, not in application code — so it holds for every reader
automatically rather than depending on each one remembering to filter.

**Chainage is computed server-side, in TypeScript.** Each location stores its
distance along the pilgrimage route, which is what the user-side "nearest
ahead" search sorts by. It is deliberately *not* left to the PostGIS trigger:
that trigger measures in planar degrees and disagrees with the browser's turf
engine by up to 1.2 km. Since the user-side search subtracts the pilgrim's
turf-derived position from the facility's, mixing the two puts real error
into every distance shown. See `db/fix_chainage_trigger.sql`.

**Styling uses stock Tailwind only.** This project defines custom tokens
(`saffron-*`, `tap-target`) in its own `tailwind.config.ts` and `globals.css`.
Using them would silently render unstyled in a panel without that config, so
the module sticks to standard utilities. Every component takes a `className`
override.

**No app-specific context.** The module never calls this project's `useLang()`
or `useApp()`. If it did, it would crash in a panel without those providers.
All labels are plain English strings in the components.

---

## 9. Assumptions made

1. The host panel uses **Tailwind CSS**. If not, the components render
   unstyled but functional — pass `className` props or restyle.
2. The host panel is **Next.js App Router** (for the API routes). The
   `lib/admin-locations/` logic is framework-agnostic; only the route
   handlers are Next-specific.
3. **One route/pilgrimage.** Locations are scoped to `NEXT_PUBLIC_ROUTE_SLUG`.
   Multi-route support would need a route selector in the UI and a
   `routeId` parameter through the service layer.
4. **Admin-created locations are published immediately.** The `review`
   (pending/approved/rejected) workflow exists in the schema but has no UI;
   the API writes `review: 'approved'` directly.
5. Delete is **permanent**, not soft. Set `status: 'inactive'` to hide
   something recoverably.
6. Categories map 1:1 to the DB enum, which is what lets admin locations
   appear in the existing SOS feature with no translation layer.

---

## 10. What you need to connect

| # | What | Where |
|---|---|---|
| 1 | Run the migration | `db/admin_locations.sql` |
| 2 | Render the component in your panel | §4 |
| 3 | Replace the auth stub with your session check | `lib/admin-locations/auth.ts` |
| 4 | Set `ADMIN_API_TOKEN`, or do #3 | environment |
| 5 | Delete the test harness | `app/admin-locations/page.tsx` |
| 6 | *(optional)* Restyle to match your panel | `className` props |
| 7 | *(optional)* Point at different endpoints | `configureLocationService()` |

Items 1–2 are enough to have it working. 3–4 are required before deploying
anywhere public.

---

## 11. Adding a category later

Two lines, both mechanical:

```ts
// lib/admin-locations/categories.ts
{ id: 'fire_station', label: 'Fire Station', icon: '🚒', color: '#dc2626', group: 'safety' },
```

```sql
-- run in Supabase SQL Editor
alter type facility_kind add value if not exists 'fire_station';
```

The dropdown, map markers, list badges and filters all pick it up from the
registry — nothing else to change.

To *retire* a category, delete its registry entry. Postgres cannot drop an
enum value, but nothing reads the enum's contents, so existing rows keep
working and the category simply stops being offered.
