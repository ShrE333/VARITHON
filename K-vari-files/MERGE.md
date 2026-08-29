# VariMitra — merged app

One deployable Next.js 14 app. The React/Vite portal (`react-app/`) and the
Wari Saathi location PWA were merged into this folder; `react-app/` is now
source material only and is not deployed.

Next.js hosts both because only it can serve the API routes the location
features need (`/api/v1/...`, Supabase service-role writes). Vite has no
server, so the merge could only go this direction.

## Routes

| Path | What | From |
|---|---|---|
| `/` | Sign in — role decides where you land | portal |
| `/varimitra` | Pilgrim home | portal |
| `/feature?key=` | Feature explainer | portal |
| `/darshan-booking` | Darshan slot booking | portal |
| `/command-dashboard` | Temple Command Dashboard | portal |
| **`/superadmin/locations`** | **Super Admin → Location Management** | location app |
| `/live` | Distance & ETA to Pandharpur (was `/`) | location app |
| `/route` | Route map + 15 mukkam stages | location app |
| `/palki` | Live Palki position + offline forecast | location app |
| `/help` | SOS / nearest medical, food, rest, stay | location app |
| `/admin` | Camp registration | location app |
| `/demo`, `/test` | Simulation harnesses | location app |
| `/api/v1/**` | Unchanged | location app |

## How the two halves connect

**Pilgrim → location features.** The pilgrim home has a *Live Yatra Services*
row and four matching sidebar entries that route to `/live`, `/palki`,
`/route` and `/help`. Every other tile on that page opens an explainer via the
shared `[data-modal]` layer; these four open the working tools. A return bar at
the top of every location page leads back to whichever dashboard the signed-in
role came from.

**Super Admin → locations.** `<LocationManagement />` is mounted at
`/superadmin/locations` inside the command dashboard's own header and sidebar
(`components/portal/AdminShell.jsx`), under a "Super Admin" section label.

The two are the same data. Location Management writes to the `facilities`
table; the pilgrim SOS screen reads the `facilities_public` view over it. A
camp added by an admin shows up in a pilgrim's "nearest medical" search — which
is why it extends that table instead of owning a second one.

## Things the merge had to solve

**Two stylesheets both wanted bare element selectors.** The portal CSS was
written when each page owned `<body>`, and all three files defined a different
`--cream` on `:root`. Every selector in `styles/portal/*.css` is now prefixed
with that page's scope class (`.vm-pilgrim`, `.vm-admin`, `.vm-login`,
`.vm-feature`, `.vm-darshan`), so `body { … }` became `.vm-pilgrim { … }` and
the files stopped overwriting each other.

**Tailwind preflight is disabled globally** (`tailwind.config.ts`) and
re-applied by hand inside `.wari-scope` (`app/globals.css`). Left global it
stripped the portal's heading sizes and list markers. Anything using Tailwind
must therefore sit inside a `.wari-scope` element — including the Location
Management panel in the admin dashboard. Without it `border` utilities set a
width but no style and render invisibly.

**The portal's vanilla scripts assumed full page loads.**
`components/portal/PortalScripts.jsx` chains them in dependency order, points
`window.reactNavigate` at the Next router so `features.js` navigates without
throwing away the SPA, and re-runs the i18n pass on every route change.
`public/assets/*.js` had its `*.html` links rewritten to app routes, and
`i18n.js` now exposes `boot()` for that re-run.

**The sidebar drawer toggle was never wired** in either page. It is now, in
`AdminShell.jsx` and the pilgrim page.

## Deploy

```bash
npm install
npm run build
npm run start
```

Runs with no environment variables at all — Supabase falls back to an
in-process store and route data is served from `public/data/*.json`, which is
enough for a full demo. For a real deploy set the values in `.env.example`;
`docs/08-deploy.md` has the detail.

Two of them are not optional in public:

- `ADMIN_API_TOKEN` — without it `POST`/`PATCH`/`DELETE` on
  `/api/v1/admin/locations` are unauthenticated and anyone can delete a
  location. The server logs a warning once per process.
- `PALKI_INGEST_TOKEN` — without it anyone can post a fake Palki position.

The sign-in screen is a demo flow (fixed OTP `123456`) that establishes a role,
not an authentication system. To gate the admin screens for real, replace
`isAdminAuthorised()` in `lib/admin-locations/auth.ts` — every write route
calls only that function.

## Manual step: the `temple` category

`lib/admin-locations/categories.ts` has a `temple` category so the same
Super Admin map/CRUD used for SOS and medical points can also mark temples.
It works immediately (writes are validated against that file, not the DB),
but for a Supabase-backed deploy the database enum needs the value too, or
existing code that reads the enum directly falls back to a generic pin. Run
once in the Supabase SQL editor (idempotent, also at the bottom of
`db/admin_locations.sql`):

```sql
alter type facility_kind add value if not exists 'temple';
```

Run `db/admin_locations.sql` in the Supabase SQL editor once; it is idempotent.
