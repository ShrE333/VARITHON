# 05 · Palki live location & offline forecast

**The headline feature.** M1 answers *"where am **I**?"*. This answers
*"where is the **Palki**?"* — and keeps answering it with no network at all.

---

## The problem

Pilgrims want to know where the palkhi is so they can join it, avoid the
crush, or tell family when it will pass. The obvious solution — a GPS tracker
on the palkhi, streamed to phones — fails on the one thing that matters: the
Wari corridor has stretches with **no coverage for hours**. A live-location
feature that needs live connectivity is exactly useless exactly when it is
needed.

## The answer

The server keeps a self-correcting estimate of the Palki's position and
publishes a small **forecast packet** — not a location, but a **timeline
covering the next eight hours**. The phone caches it and reads its own clock
against it.

```
sim/simulator.mjs  --POST pings-->  /api/v1/palki/ping
                                          |
                                    estimator (predict / update)
                                          |
                                    /api/v1/palki/packet   (~596 B gzipped)
                                          |
                                    IndexedDB on the phone
                                          |
                          /palki  — interpolate, no modelling on-device
```

596 bytes buys eight hours of answers with the radio off.

---

## The honesty rules

**A prediction must never look like a measurement.** This is enforced in
[`lib/palki/client.ts`](../lib/palki/client.ts):

| Age of the observation | What the UI shows |
|---|---|
| under 5 min | solid dot — **Live** |
| 5 min – 3 h | hollow dot, dashed ± ring — **Estimated · synced HH:MM · ± X.X km** |
| 3 h – 8 h | **no dot at all** — *"Between Lonand and Taradgaon"* |
| past `validUntil` | no position — last known, with its timestamp |

Note it keys off the age of the **observation**, not of the packet. A packet
rebuilt one minute ago from a six-hour-old ping is a six-hour-old answer, and
showing it as fresh would be a lie with a timestamp on it.

At three hours the dot disappears entirely. A dot claims metre precision; by
then the honest answer is a stretch of road between two landmarks.

---

## The model

[`lib/palki/estimator.ts`](../lib/palki/estimator.ts) — a **route-constrained
motion model with schedule priors and recursive Bayesian correction**. It is a
scalar Kalman filter in all but name: about 40 lines of arithmetic, no
filtering library.

It is **not a neural network** and should never be described as one.

State is four numbers:

| | |
|---|---|
| `s` | position along the route, km |
| `v` | speed, km/h |
| `beta` | how off-plan today is |
| `sigma` | uncertainty, km |

Two design decisions worth knowing:

**Position is trusted from the measurement outright.** GPS error is metres;
we are forecasting kilometres. There is nothing to infer. The inference goes
into **speed**, which is never observed directly — you cannot measure the
walking pace of a 200,000-person procession, you can only infer it from where
it got to.

**`beta` is a ratio of distance covered to distance the schedule expected**
over the same interval — deliberately not a ratio of speeds. A speed measured
across a lunch halt says nothing about walking pace; a distance ratio across
the same halt correctly says "today is running late".

Because position is one scalar along a fixed line, **a prediction can never
land in a field**. That constraint is doing more work than the filter is.

---

## How to run the demo

One command, from a clean start:

```bash
npm run dev          # terminal 1 — leave it running
npm run demo         # terminal 2
```

`npm run demo` ([`scripts/demo_start.mjs`](../scripts/demo_start.mjs)):

1. waits for the dev server to answer
2. **POSTs `/api/v1/palki/reset`** — clears the estimator state, pings,
   forecasts and simulator truth
3. starts the simulator at **km 0**, seed 7, 300x (a 12-hour walking day in
   about 2.5 minutes)

Step 2 is the one that matters. Without it a second rehearsal inherits the
first run's state and the Palki appears to teleport the moment the simulator
starts — which is exactly the kind of thing that happens in front of judges.

| Command | What it does |
|---|---|
| `npm run demo` | reset, then walk from km 0 at 300x |
| `npm run demo:fast` | same at 1200x |
| `npm run demo:reset` | clear the state and stop, without walking |
| `npm run demo -- --no-reset` | keep whatever state is there |
| `npm run demo -- --speed 600 --seed 12 --start 40` | tune it |
| `npm run sim` | the raw simulator, no reset step |

Two windows to open:

| Window | URL | Role |
|---|---|---|
| A — project it | <http://localhost:3000/demo> | the dashboard |
| B — a phone, or a narrow window | <http://localhost:3000/palki> | what a pilgrim sees |

Mid-demo keys, read from the simulator's stdin:

| Key | Effect |
|---|---|
| `p` | pause / resume — use this when someone asks a question |
| `j 120` | jump 120 simulated minutes forward |
| `q` | quit |

**The full five-minute script for presenting this is in
[06-demo-runbook.md](06-demo-runbook.md).**

---

## Why the simulator is a separate process

The claim "the model is not cheating" has to be *verifiable*, not merely
intended. So [`sim/simulator.mjs`](../sim/simulator.mjs):

- runs as its own process
- **imports nothing from the app** — not even the geometry helper, which it
  reimplements in thirty lines specifically so the separation is checkable
- talks to the estimator **only over HTTP**, by POSTing pings the way a real
  GPS tracker would, every 30 simulated minutes, with noise

It knows its own true position at every moment and never tells the estimator.
The one exception is `/api/v1/palki/truth`, which records truth for the demo
dashboard's red marker and for scoring — and nothing on the estimator's path
reads that table.

The simulator also injects **one unscheduled 30–60 minute halt per simulated
day** (a crowd surge, a ringan running long). With `--seed 7` it lands
mid-run. Watching the error spike and then come back down is the most
convincing thing in the demo; do not apologise for the spike.

---

## Accuracy

Measured against the simulator, which the estimator cannot see:

| Horizon | MAE |
|---|---|
| +1 h | ~0.24 km |
| +2 h | ~0.49 km |
| +3 h | ~0.73 km |
| +5 h | ~1.13 km |

On a 285 km route. Forecasts are scored **only once their target time has
actually passed** — `/api/v1/palki/accuracy` grades them, nothing is
self-reported.

**There is no historical validation.** [`sim/backtest.mjs`](../sim/backtest.mjs)
is written and runs, but `data/wari_2025_actuals.json` is an empty template
and the script **refuses to print a number** until real 2025 arrival times are
supplied. The honest claim is "validated against a simulator the model cannot
see", and nothing stronger.

---

## Files

| File | Role |
|---|---|
| [`lib/palki/geometry.ts`](../lib/palki/geometry.ts) | arc length: `s` to lat/lng and back, self-overlap disambiguation |
| [`lib/palki/estimator.ts`](../lib/palki/estimator.ts) | **the model** — predict / update / forecast |
| [`lib/palki/schedule.ts`](../lib/palki/schedule.ts) | the speed-profile prior. SERVER ONLY |
| [`lib/palki/packet.ts`](../lib/palki/packet.ts) | assembles the offline packet (under 4 KB) |
| [`lib/palki/client.ts`](../lib/palki/client.ts) | interpolation + **the honesty rules** |
| [`lib/palki/use-packet.ts`](../lib/palki/use-packet.ts) | cache-first fetch, refresh on reconnect |
| [`lib/palki/store.ts`](../lib/palki/store.ts) | Supabase, with an in-process fallback |
| [`lib/palki/server.ts`](../lib/palki/server.ts) | shared route loading + ingest auth |
| [`lib/palki/airplane.ts`](../lib/palki/airplane.ts) | demo-only simulated connectivity loss |
| [`app/palki/page.tsx`](../app/palki/page.tsx) | the pilgrim-facing screen |
| [`app/demo/page.tsx`](../app/demo/page.tsx) | the SIMULATION dashboard |
| [`scripts/demo_start.mjs`](../scripts/demo_start.mjs) | reset + launch, one command |
| [`sim/simulator.mjs`](../sim/simulator.mjs) | ground truth, separate process |
| [`sim/backtest.mjs`](../sim/backtest.mjs) | replays the filter against historical arrivals |

### API

| Route | Purpose |
|---|---|
| `GET  /api/v1/palki/packet` | the offline forecast packet |
| `POST /api/v1/palki/ping` | ingest ground truth (batched, auth) |
| `POST /api/v1/palki/reset` | clear a simulated run (auth) |
| `GET  /api/v1/palki/truth` | simulator truth, demo dashboard only |
| `GET  /api/v1/palki/accuracy` | scored MAE per horizon |
| `GET  /api/v1/palki/route/[version]` | route polyline for the client |

---

## How to verify it is correct

```bash
npm run test:geometry     # 34 checks
npm run test:estimator    # 32 checks
```

The estimator suite covers the parts that are easy to get quietly wrong:
out-of-order ping batches, a ping on a doubled-back stretch of road not
teleporting the Palki, `sigma` growing monotonically with horizon, and the
packet staying inside its 4 KB budget (it comes in at 596 B gzipped).

---

## Known limits

- **The schedule prior is synthetic.** `data/wari_schedule_2026.json` has real
  per-day distances (from the road-snapped route) but an invented day shape —
  we do not have the Sansthan's published timetable. It is marked
  `"synthetic": true` so nobody forgets. It is the single most valuable file
  to replace with real data.
- **The in-memory store is single-process.** On serverless (Vercel) each
  invocation may get a fresh isolate, so any deployment that must remember
  state between requests **has to** configure Supabase. The in-memory path
  exists so the demo runs on a laptop with no credentials.
- **Ingest auth is a shared bearer token.** Anyone holding
  `PALKI_INGEST_TOKEN` can move the Palki. Rotate it per Wari and replace it
  with per-reporter auth before this carries real pilgrims.
