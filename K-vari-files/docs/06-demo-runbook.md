# Demo runbook — Palki live location

Rehearse this once end to end. It takes about five minutes to run.

## Before the room

```bash
npm install
npm run build:data      # route + schedule + fixtures (only needed once)
npm run test            # 3 suites, 66 checks, all green
npm run dev             # leave this running in its own terminal
```

Open two browser windows:

| Window | URL | Role |
|---|---|---|
| A (project it) | `http://localhost:3000/demo` | the dashboard |
| B (your phone, or a narrow window) | `http://localhost:3000/palki` | what a pilgrim sees |

Leave a terminal visible for the simulator.

---

## The sequence

### 1. Open with the honest claim (30s)

Point at the red banner on `/demo` before anyone reads it themselves:

> "This is a simulation. There is no Wari running today. A separate process is
> playing the role of the Palki, and the model only ever sees its GPS pings —
> every 30 simulated minutes, with noise. It has never seen the simulator's
> internal state."

Disclosing this first is the whole posture of the feature. A judge who
discovers it themselves will assume you were hiding it.

### 2. Start the Wari (30s)

```bash
npm run demo         # 300x — a 12-hour walking day in about 2.5 minutes
```

Or `npm run demo:fast` (1200x) if you are short on time.

`npm run demo` **resets first** — it clears the estimator state, the pings,
the stored forecasts and the simulator truth, then starts the Palki from
km 0. That is what makes this rehearsable: run it twice in a row and the
second run looks exactly like the first. Without the reset, run two inherits
run one's state and the Palki appears to teleport the moment it starts.

If you want to resume rather than restart, `npm run demo -- --no-reset`.

Watch the terminal: each line prints the true position, the model's estimate,
and the error. Then switch to window A. The red and blue markers converge
within two or three pings.

> "Red is where the Palki really is. Blue is what the model thinks. When
> they sit on top of each other, it is working — and you can see that without
> me explaining anything."

### 3. Let the disruption land (60s)

The simulator injects one unscheduled 30–60 minute halt per simulated day
(a crowd surge, or a ringan running long). With `--seed 7` it lands mid-run.

When the terminal prints:

```
!! day 1: unscheduled 42-min halt injected at 15:46 IST
```

point at the error chart. **Do not apologise for the spike.**

> "There it is. The model was wrong by about three kilometres, because
> something happened that no schedule predicted. What matters is the next
> part — watch it come back down. A model that has never been tested is not
> a model I would trust."

The `beta` column in the terminal drops toward 0.50 during the halt and
climbs back afterwards. That is the model learning "today is slower than
planned" and carrying it forward.

### 4. The offline moment (60s) — this is the one that lands

Switch to window B (the pilgrim view). It shows a landmark and a time, in
Marathi: *"पालखी जेजुरी येथे सुमारे 10:45 am वाजता पोहोचेल"*.

Now click **Airplane mode: ON** in window A.

Reload window B. It still works.

> "The phone has no network now. It is not asking a server anything. When it
> last had signal it downloaded a small timeline — under 600 bytes — covering
> the next eight hours. It reads its own clock against that. This is the
> normal case on the Wari, not the exception; there are stretches with no
> coverage for hours."

Then let it sit, or point at the badge:

> "And it degrades honestly. Under five minutes old it says Live. After that
> it says Estimated and shows a ± figure. After three hours it stops drawing
> a dot at all and says 'somewhere between Lonand and Taradgaon' — because a
> dot would be claiming precision we no longer have. Past eight hours it
> refuses to show a position."

### 5. The numbers (30s)

Scroll to the MAE table on `/demo`.

> "Mean absolute error, per horizon, scored live. A forecast is only graded
> once its target time has actually passed. Roughly a quarter of a kilometre
> at one hour, about a kilometre at five — on a 285 km route."

If asked how it works:

> "It is a route-constrained motion model with schedule priors and recursive
> Bayesian correction. Position is one number — kilometres along a fixed
> route — so a prediction can never land in a field. It is a scalar Kalman
> filter in all but name. It is not a neural network, and I would not claim
> it was."

---

## Questions you will get

**"Is this validated against a real Wari?"**
No. Be direct about it. `sim/backtest.mjs` is written and runs, but
`data/wari_2025_actuals.json` is an empty template and the script *refuses*
to print a number until real arrival times are in it. The honest claim is
"validated against a simulator the model cannot see", and nothing stronger.

**"Couldn't the model be tuned to the simulator?"**
The simulator is a separate process that imports nothing from the app — not
even the geometry helper, which it reimplements in thirty lines specifically
so that the separation is verifiable rather than merely intended. It talks to
the estimator only over HTTP, by POSTing pings.

**"What if the volunteer's phone has no signal either?"**
`POST /ping` takes a batch with device timestamps, sorts it, and replays the
filter. Out-of-order delivery is handled; re-delivering the same batch is a
no-op.

**"Why not just use a maps API?"**
Every distance here is arithmetic on one scalar, offline. A routing API needs
a live connection, which is exactly what the Wari corridor does not have.

**"What's the accuracy of the underlying position?"**
Pings are GPS, ~15 m. The uncertainty in the forecast is not GPS error — it
is *schedule* error, which grows at about 0.35 km per hour of horizon, and is
shown as the ± figure.

---

## Mid-demo controls

The simulator reads stdin:

| Key | Effect |
|---|---|
| `p` | pause / resume — use this when a judge asks a question |
| `j 120` | jump 120 simulated minutes forward |
| `q` | quit |

## If something goes wrong

**Dashboard says "Waiting for the simulator"** — the simulator is not running
or is pointed elsewhere. Check `--base` and that `npm run dev` is up.

**Markers do not move** — make sure only ONE dev server is running.
A stray one on port 3000 while yours is on 3001 is the usual cause:

```bash
npx kill-port 3000 3001   # or Stop-Process on the PIDs holding the ports
```

**Everything reads km 0** — the estimator has no state yet. Give the
simulator two pings (a few seconds at 300x).

**The Palki starts somewhere it should not, or jumps forward** — leftover
state from an earlier run. This is what the reset is for:

```bash
npm run demo:reset       # clear it and stop
npm run demo             # or just start again — it resets first anyway
```

**Fresh start** — `npm run demo` is the fresh start; it does not need the dev
server restarted. If you want to clear state without walking, use
`npm run demo:reset`. With Supabase configured the reset deletes the
simulated rows there too (never the live ones — every delete is filtered on
`is_simulated`). Without Supabase, state lives in-process and also dies with
`npm run dev` (see the note in `lib/palki/store.ts` about serverless).
