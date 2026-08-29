# Claude Code Build Prompt — VariMitra AI: Palki Live Location & Offline Forecast

> Paste everything below the line into Claude Code, inside your existing VariMitra repo.

---

## 0. Context — read this first

You are extending an **existing** project, VariMitra AI, built for the Varithon 2026 hackathon (theme: Pandharpur Wari). Do **not** scaffold a new project. Before writing any code:

1. Read the repo. Map out what already exists — the FastAPI backend, the Next.js/React PWA, the Supabase schema, and any prior work on the location/prediction feature (there is an existing design document and possibly partial modules from earlier milestones).
2. Print a short summary of what you found and what you intend to reuse vs. add.
3. Only then start implementing.

If an existing module already does part of what is described below, **extend it — do not duplicate it**. Flag anything in the existing code that conflicts with this spec rather than silently overwriting it.

**Existing stack (do not change):** Python FastAPI, Supabase (Postgres + Auth + Storage), React/Next.js PWA, Leaflet + OpenStreetMap, deployed on Render (API) and Vercel (web).

**Hard constraint:** the demo is in days, not weeks. Prefer working and honest over clever. No new heavy dependencies. No ML frameworks — no PyTorch, no TensorFlow, no scikit-learn.

---

## 1. What we are building, in one paragraph

A live location feature for the Palki (palanquin) during the Pandharpur Wari. The backend maintains a self-correcting estimate of where the Palki is *along its fixed route*, and publishes a small **forecast packet** covering the next several hours. The PWA caches that packet so a pilgrim with no internet still sees a reasonable, honestly-labelled estimate of the Palki's position. Because there is no live Wari right now, the system must be demonstrable end-to-end using a **simulated ground truth** that the prediction model cannot see.

---

## 2. The core modelling decision (this is the most important part)

**Do not model position as (lat, lng).** The Palki walks a fixed, published route. Model its position as a single scalar `s` — arc-length distance travelled along the route polyline, in kilometres.

- The route is a `LineString` of ~2000 points from Pune (Alandi/Dehu) to Pandharpur.
- Precompute a cumulative-distance array so `s → (lat, lng)` and `(lat, lng) → s` are both O(log n) via binary search. Use the haversine formula for segment lengths.
- This guarantees predictions can never place the Palki off the road, and it makes the offline packet tiny.

Put this in a shared module (`route.py` / `route.ts`) with an **identical implementation on both server and client**, so offline interpolation on the phone matches the server exactly. Write a test that asserts server and client `s → latlng` agree to within 1 metre across 100 sample values.

---

## 3. Backend — the estimator

### 3.1 State

```
s      : km travelled along route
v      : current effective walking speed, km/h
sigma  : positional uncertainty, km
```

### 3.2 Schedule prior

The Wari follows a published day-wise timetable — start time, halts, meal breaks, ringan, and the overnight *mukkam* village. Encode this as a **speed profile**: a list of `(start_time, end_time, nominal_speed_kmph)` blocks, where halts are `0.0` and walking blocks are ~3.0 km/h.

Store it as a seedable JSON config at `data/wari_schedule_2026.json`. This is the model's prior — what it believes will happen with no observations at all.

### 3.3 Update step (measurement arrives)

Ground-truth pings arrive roughly every 30 minutes from a GPS device or a volunteer/marshal checkpoint report. On each ping:

1. Snap the reported `(lat, lng)` to the route → `s_actual`.
2. Compute the residual against what the model expected: `err = s_actual - s_predicted`.
3. Correct position: `s ← s_actual` (the measurement is trusted; GPS error is small relative to km-scale forecasting).
4. Correct speed with an exponentially weighted update:
   ```
   v_observed = (s_actual - s_last_ping) / hours_elapsed
   v ← alpha * v_observed + (1 - alpha) * v      # alpha ≈ 0.4
   ```
5. Maintain a **speed bias ratio** `beta = v / v_nominal_for_that_block`, clamped to `[0.5, 1.5]`. This is what lets a "walking 15% slower today" signal carry forward into every future horizon.
6. Recompute `sigma` from the recent residual history: `sigma_0 = max(0.2, rolling_std(err))`.

This is a scalar Kalman filter in all but name. Implement it plainly and comment it as such — do not import a filtering library.

### 3.4 Forecast step

Given the corrected state, produce positions at 30-minute intervals for the next **8 hours**:

- Integrate forward through the schedule's speed blocks, scaling each block's nominal speed by `beta`.
- Respect halts — during a halt block the Palki does not advance.
- Clamp `s` at the route's total length (do not predict past Pandharpur).
- Uncertainty grows with horizon: `sigma(h) = sigma_0 + k * h`, with `k ≈ 0.35 km per hour` (tune against backtest, don't guess in production).

Also compute, for evaluation, an explicit named forecast at **+1h, +2h, +3h, +5h**, and persist it so it can be scored later against reality.

---

## 4. The offline forecast packet

This is the feature's centrepiece. The server does not send "a location" — it sends a precomputed timeline.

```jsonc
{
  "schema": 1,
  "route_id": "pune_pandharpur_2026",
  "route_version": 3,              // client re-downloads polyline only if this changes
  "synced_at": "2026-08-28T14:00:00+05:30",
  "valid_until": "2026-08-28T22:00:00+05:30",
  "confidence_decay_kmph": 0.35,
  "current": { "s_km": 142.3, "sigma_km": 0.0, "source": "gps" },
  "forecast": [
    { "t": "2026-08-28T14:30:00+05:30", "s_km": 143.6, "sigma_km": 0.4 },
    { "t": "2026-08-28T15:00:00+05:30", "s_km": 145.0, "sigma_km": 0.9 }
    // ... 30-min steps out to +8h
  ],
  "landmarks": [
    { "name": "Lonand", "name_mr": "लोणंद", "s_km": 148.2, "eta": "2026-08-28T16:12:00+05:30" }
  ]
}
```

Target size **under 4 KB** gzipped. The route polyline is a **separate, cached-once** resource keyed by `route_version` — never inline it in the packet.

### Endpoints

```
GET  /api/v1/palki/packet          -> the forecast packet above
GET  /api/v1/palki/route/{version} -> polyline + landmarks, Cache-Control: immutable
POST /api/v1/palki/ping            -> ingest ground truth (auth required)
GET  /api/v1/palki/accuracy        -> MAE per horizon, for the demo panel
```

`POST /ping` must accept a **batch with client timestamps**, because the volunteer's phone will also lose signal and needs to store-and-forward. Process out-of-order pings correctly: sort by timestamp, replay the filter, don't just take the latest.

---

## 5. Frontend — the PWA

### 5.1 Offline mechanics

- **Service worker** caches the route polyline (cache-first, immutable) and the latest packet (network-first, falling back to cache).
- **IndexedDB** stores the current packet and a small ring buffer of the last few, so a failed refresh never leaves the user with nothing.
- On render, the client does **no modelling**. It reads the device clock, linearly interpolates between the two bracketing rows of `forecast`, maps `s_km` → `(lat, lng)` via the cached polyline, and draws.
- Refresh the packet on: app open, regaining connectivity (`online` event), and every 10 minutes while foregrounded.

### 5.2 Honesty rules — implement these exactly

The UI must never let a prediction masquerade as a measurement.

| Packet age | Display |
|---|---|
| < 5 min | Solid saffron dot. Badge: **Live** |
| 5 min – 3 h | Hollow dot with a dashed uncertainty ring. Badge: **Estimated · last synced HH:MM · ±X.X km** |
| 3 h – 8 h | No dot. Highlight a **route segment** instead: "Between Lonand and Taradgaon" |
| > `valid_until` | No position. "Location unavailable — connect to refresh." Show last known good with its timestamp. |

Offline state gets an amber banner, not a red error. Being offline is expected on the Wari, not a failure.

### 5.3 What the pilgrim actually sees

Coordinates are useless to a pilgrim. Lead with:

1. **Next landmark + ETA** — "Palki reaches Lonand around 4:15 PM" — in Marathi, Hindi and English.
2. Distance and estimated time from *their* location to the Palki, if they've granted geolocation. Compute on-device; never send their position to the server.
3. The map, below the text. Leaflet, with the route drawn, the Palki marker, halt markers, and their own position.

Marathi is the primary language for this screen. Devanagari must render correctly at small sizes — test on a real phone, not just the desktop browser.

---

## 6. The simulator — how we demo without a live Wari

Build `sim/simulator.py` as a **completely separate process** from the estimator. This is non-negotiable: it plays the role of physical reality, and the estimator must have no access to its internals — only to the pings it emits.

Requirements:

- Walks a virtual Palki along the real polyline using the schedule, plus realistic perturbations:
  - a per-day speed multiplier drawn from `N(1.0, 0.12)`
  - afternoon heat slowdown (12:00–15:00, ×0.85)
  - one randomly-injected disruption per day: a 30–60 minute unscheduled halt (crowd surge / ringan overrun)
  - small GPS noise on emitted positions (~15 m)
- Emits pings to `POST /api/v1/palki/ping` every 30 simulated minutes.
- **Time compression** via a `--speed` multiplier (1×, 60×, 300×). At 300×, a full 12-hour walking day plays out in about 2.5 minutes.
- A `--seed` flag so the demo is reproducible. Find a seed where the disruption lands mid-demo and lock it in.
- CLI controls to pause, resume, and jump the clock forward — you will need these when a judge asks a question mid-run.

**Also build a backtest mode.** If the 2025 Wari's published mukkam-to-mukkam arrival times can be sourced, put them in `data/wari_2025_actuals.json` and add `sim/backtest.py` to replay the filter against them and report real MAE. "Validated against the 2025 Wari" is a far stronger claim than "simulated", and it is the first thing a sharp judge will probe.

---

## 7. The demo dashboard

A route at `/demo` — separate from the pilgrim-facing view, clearly marked **SIMULATION** in the header. Three panels:

1. **Map** — red marker = simulated actual, blue marker = the model's position, faded blue cone ahead = forecast with its uncertainty band. When red and blue overlap, the model is working, and that is visible without any explanation.
2. **Error chart** — live line of prediction error (km) vs. time, one series per horizon (1h / 2h / 3h / 5h). Do **not** hide the spike when the disruption hits. A model that visibly recovers from being wrong is more convincing than one that was never tested. Annotate the spike: "unscheduled 45-min halt injected."
3. **Accuracy table** — MAE per horizon, updating live. Plus a big honest number: *"Model has never seen the simulator's internal state."*

Add a speed slider (1× / 60× / 300×) and a prominent **Airplane Mode** toggle that simulates connectivity loss in the pilgrim view — this is the moment of the demo and it needs to be one click, not a fumble through phone settings.

---

## 8. Database (Supabase)

```sql
palki_pings      (id, ts_device, ts_server, lat, lng, s_km, source, reporter_id, is_simulated)
palki_state      (id, ts, s_km, v_kmph, beta, sigma_km, is_simulated)
palki_forecasts  (id, issued_at, horizon_min, s_km_pred, sigma_km, is_simulated)
palki_scores     (forecast_id, actual_s_km, error_km, scored_at)
routes           (id, version, name, polyline_json, total_km, landmarks_json)
```

`is_simulated` on every row. Never mix simulated and real data in the same query without filtering — and make that filter the default.

---

## 9. Build order

Work in these steps and **stop after each one for my review**. Do not run ahead.

- **Step 1** — Repo audit (§0), plus `route.py` with arc-length maths and its parity test.
- **Step 2** — Schedule config, estimator (update + forecast), packet endpoint. Unit tests for the filter, including: does injecting a slowdown actually shift the +3h forecast?
- **Step 3** — Simulator with time compression. Verify end-to-end: simulator emits → estimator corrects → packet updates.
- **Step 4** — PWA location screen: map, next-landmark ETA, service worker, IndexedDB, staleness rules from §5.2.
- **Step 5** — Demo dashboard, error chart, airplane-mode toggle.
- **Step 6** — Backtest against 2025 data if available; final MAE numbers; a `DEMO.md` runbook with exact commands and a rehearsed sequence.

---

## 10. Guardrails

- Every number shown to a user carries its uncertainty and its age. No exceptions.
- The word "simulated" appears on screen in the demo view. We disclose it before a judge asks.
- Do not describe this as a neural network or deep learning. It is a route-constrained motion model with schedule priors and recursive Bayesian correction. That is both accurate and more defensible.
- The pilgrim's own GPS never leaves their device.
- Comment the estimator heavily. I need to explain the maths to a professor, line by line.

Start with Step 1 and report back.
