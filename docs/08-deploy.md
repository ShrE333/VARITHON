# Deploying Wari Saathi (with the Palki feature) to Vercel

Local git repo is initialized and committed. Everything below needs your
login — Vercel and GitHub logins can't be done from here.

## Database setup (one time, before first deploy)

Run these in the Supabase **SQL Editor**, in order:

1. **`db/schema.sql`** — routes, route_stages, facilities, PostGIS chainage
   trigger, RLS policies, and the `facilities_public` view.
   *Not idempotent* — running it twice errors with "type already exists".
   That error is harmless (nothing is corrupted), it just means it already ran.
2. **`db/fix_chainage_trigger.sql`** — required. Fixes a systematic 0.5–1.2 km
   chainage error; see the README's M3/M4 section for the diagnosis. Safe to
   re-run.
3. **`db/palki_schema.sql`** — the Palki tables. Safe to re-run.

Then seed the route geometry and test facilities:

```bash
node scripts/seed_facilities.mjs
```

Idempotent — re-running it repairs chainage on existing rows rather than
duplicating them.

## 1. Install the Vercel CLI and log in

```bash
npm install -g vercel
vercel login
```

This opens a browser to authenticate. Use whichever account you want the
project to live under.

## 2. First deploy

From the project folder:

```bash
vercel
```

Answer the prompts (defaults are fine — "Link to existing project?" → No,
accept the detected framework/settings). This creates a **preview** deployment
and prints a `https://<something>.vercel.app` URL. It will look broken —
that's expected, the environment variables aren't set yet.

## 3. Set environment variables

Go to **vercel.com → your project → Settings → Environment Variables** and
add these five (copy values from your local `.env.local`):

| Key | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from `.env.local` | |
| `NEXT_PUBLIC_ROUTE_SLUG` | `dnyaneshwar-2026` | |
| `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` | **secret** — do not prefix with NEXT_PUBLIC_ |
| `PALKI_INGEST_TOKEN` | from `.env.local` | **secret** — anyone with this can fake the Palki's position |

Set each for **Production, Preview, and Development** (the checkboxes next to
the value) unless you want different values per environment.

## 4. Deploy to production

```bash
vercel --prod
```

This gives you the permanent URL (also visible on the project's Vercel
dashboard page). That's the link to open on a phone.

## 5. Feed it live data

The app needs pings to have anything to show. Point the simulator at the
deployed URL instead of localhost:

```bash
PALKI_INGEST_TOKEN=<the same token you set in Vercel> \
  node sim/simulator.mjs --speed 300 --seed 7 --base https://<your-project>.vercel.app
```

Run this from your own machine — the simulator is a local script that POSTs
to whatever `--base` you give it. It doesn't need to run on Vercel itself.

---

## Testing the offline behavior on a real phone

1. With the simulator running (feeding it data) and phone's WiFi/data **on**,
   open the `https://<project>.vercel.app/palki` link on the phone. Confirm
   it shows live data.
2. **Why this works offline, mechanically:** that first load downloads the
   app's service worker in the background. It installs and precaches the
   app shell (HTML/JS/CSS, the route polyline). Simultaneously, the packet
   your phone just fetched gets written to the phone's own IndexedDB. Once
   both of those have happened once, the phone owns everything it needs.
3. Turn on the phone's **real** airplane mode (Settings, not the in-app
   toggle — that one only exists on `/demo` and doesn't touch real
   connectivity). Reload the page, or reopen it from a homescreen icon if
   you added one.
4. It should still load and show the last-known estimate, correctly labeled
   as stale (age + ± uncertainty), and keep counting up in age as it sits
   there with no network — see the freshness tiers in
   [lib/palki/client.ts](../lib/palki/client.ts).

If step 3 fails to load anything at all: the very first visit needs internet
to install the service worker in the first place — a phone that has *never*
opened the link before can't go straight to offline. Load it online once,
then test offline.

## Notes

- **Vercel is serverless** — every request can hit a different, stateless
  function instance. That's exactly why Part A of this work (wiring a
  service-role Supabase client into `lib/palki/store.ts`) mattered: without
  real database persistence, the Palki's position would appear to reset
  or freeze unpredictably in production, because the in-memory fallback
  only survives within a single process.
- `PALKI_INGEST_TOKEN` gates `POST /api/v1/palki/ping` and `/truth`. Anyone
  who deploys without setting it accepts pings from anyone — fine for a demo
  you control, not fine for a public link you're sharing widely.
- To redeploy after a code change: `vercel --prod` again. To connect GitHub
  for auto-deploy on every push instead, do it from the Vercel dashboard
  (Project → Settings → Git) — optional, not required for this to work.
