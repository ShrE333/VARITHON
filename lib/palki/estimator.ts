/**
 * The Palki estimator.
 *
 * WHAT THIS IS, IN ONE SENTENCE
 * -----------------------------
 * A route-constrained motion model with schedule priors and recursive
 * Bayesian correction. It is not a neural network and there is no learning
 * in the machine-learning sense; describing it as either would be both wrong
 * and less defensible than the truth.
 *
 * THE STATE
 * ---------
 *   s     km travelled along the route          (position)
 *   v     current effective walking speed km/h  (rate)
 *   beta  v / nominal, clamped [0.5, 1.5]       (how off-plan today is)
 *   sigma positional uncertainty in km          (how much to trust s)
 *
 * WHY IT IS A SCALAR KALMAN FILTER IN ALL BUT NAME
 * ------------------------------------------------
 * A Kalman filter alternates two moves: PREDICT (push the state forward
 * through a motion model, growing uncertainty) and UPDATE (fold in a
 * measurement, shrinking uncertainty). That is exactly what happens here,
 * with two deliberate simplifications:
 *
 *   1. The state is one number (position along a line), not a vector, so the
 *      covariance matrix collapses to a single scalar sigma and all the
 *      matrix algebra disappears.
 *
 *   2. The Kalman gain — how much to trust the measurement versus the
 *      prediction — is effectively 1 for position. A GPS fix is accurate to
 *      ~10 m; we are forecasting kilometres ahead. Blending a 10 m
 *      measurement with a prediction that might be 2 km off would be
 *      throwing away the only hard information we have. So `s` is set
 *      directly from the measurement, and the interesting inference moves to
 *      SPEED, which is not directly observed and genuinely benefits from
 *      being blended.
 *
 * No filtering library is imported. The whole thing is about forty lines of
 * arithmetic, and being able to read it is worth more than the generality.
 */

import { RouteGeometry } from './geometry.ts';
import { advance, type WariSchedule } from './schedule.ts';
import type { ForecastRow, PalkiState, Ping } from './types.ts';

/**
 * How strongly a newly observed speed pulls the running estimate.
 * 0.4 keeps roughly the last two or three pings in view: responsive enough
 * to catch a real slowdown within an hour, damped enough that one stretch of
 * congestion does not rewrite the whole day's forecast.
 */
export const SPEED_ALPHA = 0.4;

/**
 * Clamp on the speed bias. Beyond these the "bias" is no longer a bias — it
 * is a bad ping, a stopped Palki, or a vehicle. Letting beta run to 3.0 on
 * one anomalous reading would put the forecast 20 km wrong within the hour.
 */
export const BETA_MIN = 0.5;
export const BETA_MAX = 1.5;

/** Uncertainty floor. Never claim to be more certain than 200 m. */
export const SIGMA_FLOOR_KM = 0.2;

/**
 * How fast confidence decays with forecast horizon, km per hour of horizon.
 * Tuned against the simulator backtest; see sim/backtest.mjs. Do not guess
 * this in production — measure it.
 */
export const CONFIDENCE_DECAY_KMPH = 0.35;

/** How many residuals to keep when estimating sigma. */
const RESIDUAL_WINDOW = 8;

/**
 * A ping older than this relative to the current state is treated as a cold
 * start rather than a speed observation: the gap is too long for
 * (distance / time) to mean anything about current walking pace.
 */
const MAX_SPEED_GAP_HOURS = 6;

/**
 * How far the snap is allowed to sit behind the last known position before
 * we treat it as the wrong pass over a doubled-back stretch. Generous enough
 * for GPS noise while the Palki stands still, tight enough to rule out the
 * kilometres-away alternative.
 */
const BACKTRACK_TOLERANCE_KM = 0.5;

export function initialState(
  sKm: number,
  ts: string,
  isSimulated: boolean,
  vKmph = 3.0,
): PalkiState {
  return {
    sKm,
    vKmph,
    beta: 1.0,
    sigmaKm: SIGMA_FLOOR_KM,
    ts,
    source: 'schedule',
    residuals: [],
    isSimulated,
  };
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/**
 * PREDICT step: where does the model think the Palki is at time `at`, given
 * the state and no new observation?
 *
 * This is what the forecast integrates and what the residual is measured
 * against — the honest question "what would we have said, before we looked?"
 */
export function predictAt(
  state: PalkiState,
  at: Date,
  sched: WariSchedule,
  totalKm: number,
): number {
  const minutes = (at.getTime() - new Date(state.ts).getTime()) / 60_000;
  if (minutes <= 0) return state.sKm;
  return advance(sched, new Date(state.ts), minutes, state.sKm, state.beta, totalKm);
}

/**
 * UPDATE step: fold one ground-truth ping into the state.
 *
 * Order matters. We compute the residual against the *old* state's
 * prediction before overwriting anything, because that residual is the only
 * evidence we have about how wrong the model currently is.
 */
export function update(
  state: PalkiState,
  ping: Ping,
  geometry: RouteGeometry,
  sched: WariSchedule,
): PalkiState {
  const at = new Date(ping.tsDevice);
  const totalKm = geometry.totalKm;

  // --- 1. PREDICT: where do we think it is, before looking? -------------
  // Computed first because it is needed twice: to disambiguate the snap
  // below, and as the baseline for the residual.
  const sPredicted = predictAt(state, at, sched, totalKm);

  // --- 2. Snap the reported coordinate onto the route -------------------
  // About 15 km of this route is walked twice (the detours into Lonand,
  // Taradgaon, Phaltan, Barad and Velapur), and on those stretches a
  // coordinate maps to two chainages exactly zero metres apart. Something
  // has to break the tie.
  //
  // We score against the PREDICTED position rather than the last known one.
  // Using the stale position is subtly, badly wrong: after thirty minutes of
  // walking, the candidate *behind* the Palki can be closer to where it used
  // to be than the correct candidate ahead of it. Picking that one teaches
  // the filter a negative speed and marches the estimate backwards down the
  // road, which is exactly the failure this line prevents.
  //
  // `minS` adds the physical constraint that a walking palanquin does not
  // reverse; the small tolerance absorbs GPS noise at a standstill.
  const projected = geometry.project(ping.lat, ping.lng, {
    expectedS: sPredicted,
    minS: state.sKm - BACKTRACK_TOLERANCE_KM,
  });
  const sActual = geometry.clampS(projected.s);

  // --- 3. Residual: how wrong was the model, just now? ------------------
  const err = sActual - sPredicted;

  // --- 4. Speed and bias, from distance covered vs distance expected -----
  const minutes = (at.getTime() - new Date(state.ts).getTime()) / 60_000;
  const hours = minutes / 60;

  let vKmph = state.vKmph;
  let beta = state.beta;

  if (hours > 0.01 && hours <= MAX_SPEED_GAP_HOURS) {
    const actualKm = Math.max(0, sActual - state.sKm);

    // How far the schedule ALONE says they should have gone over exactly
    // this interval — beta held at 1, so this is the pure plan.
    const expectedKm =
      advance(sched, new Date(state.ts), minutes, state.sKm, 1.0, totalKm) - state.sKm;

    // v is kept for display and diagnostics. Note it is an average over the
    // interval, so it reads low across a halt; that is honest, and nothing
    // downstream forecasts from it.
    vKmph = SPEED_ALPHA * (actualKm / hours) + (1 - SPEED_ALPHA) * state.vKmph;

    // --- 5. Speed bias -------------------------------------------------
    // beta answers "are they ahead of or behind the plan?" and is the term
    // that carries a slowdown into every future horizon.
    //
    // It is deliberately a RATIO OF DISTANCES over the same interval, not a
    // ratio of speeds. Speeds have to be compared against some nominal, and
    // every choice of nominal is wrong somewhere: the instantaneous one is
    // zero during a halt (infinite ratio), and the day's average punishes a
    // perfectly on-schedule Palki whenever the interval since the last ping
    // happens to straddle a meal break — which, with pings every 30 minutes
    // and three long halts a day, is often. Measuring distance against
    // distance makes halts cancel out on both sides of the ratio, because
    // the plan already accounts for them.
    //
    // Only update when the plan actually expected meaningful movement.
    // Standing still through a scheduled halt is not evidence about pace.
    if (expectedKm > 0.1) {
      const observedBeta = actualKm / expectedKm;
      // Smooth the bias too, so one congested stretch does not rewrite the
      // rest of the day.
      const blended = SPEED_ALPHA * observedBeta + (1 - SPEED_ALPHA) * state.beta;
      beta = Math.min(BETA_MAX, Math.max(BETA_MIN, blended));
    }
  }

  // --- 6. Uncertainty, from the model's own recent track record ---------
  // sigma is not a guess: it is the spread of how far off the predictions
  // have actually been. A model that has been wrong by 1.5 km lately should
  // say so.
  const residuals = [...state.residuals, err].slice(-RESIDUAL_WINDOW);
  const sigmaKm = Math.max(SIGMA_FLOOR_KM, stdDev(residuals));

  return {
    sKm: sActual, // measurement trusted outright; see the header note on gain
    vKmph,
    beta,
    sigmaKm,
    ts: ping.tsDevice,
    source: ping.source,
    residuals,
    isSimulated: ping.isSimulated,
  };
}

/**
 * Replay a batch of pings in timestamp order.
 *
 * The volunteer's phone loses signal too, so a batch may arrive hours late
 * and out of order. Taking only the newest would discard the intermediate
 * speed evidence — and worse, taking them as-delivered would compute
 * negative time gaps and poison beta. So: sort, then replay.
 */
export function replay(
  state: PalkiState,
  pings: Ping[],
  geometry: RouteGeometry,
  sched: WariSchedule,
): PalkiState {
  const ordered = [...pings].sort(
    (a, b) => new Date(a.tsDevice).getTime() - new Date(b.tsDevice).getTime(),
  );

  let s = state;
  for (const p of ordered) {
    // Ignore anything at or before the state we already have — replaying an
    // already-folded ping would double-count it.
    if (new Date(p.tsDevice).getTime() <= new Date(s.ts).getTime()) continue;
    s = update(s, p, geometry, sched);
  }
  return s;
}

/**
 * FORECAST step: positions at fixed intervals out to the horizon.
 *
 * Integrates the schedule forward with every block's nominal speed scaled by
 * beta, so "walking 15% slower today" propagates all the way to +8h instead
 * of being forgotten at the next halt.
 */
export function forecast(
  state: PalkiState,
  geometry: RouteGeometry,
  sched: WariSchedule,
  opts: { from?: Date; horizonHours?: number; stepMinutes?: number } = {},
): ForecastRow[] {
  const { from = new Date(state.ts), horizonHours = 8, stepMinutes = 30 } = opts;
  const totalKm = geometry.totalKm;
  const rows: ForecastRow[] = [];

  const steps = Math.round((horizonHours * 60) / stepMinutes);
  for (let i = 1; i <= steps; i++) {
    const minutes = i * stepMinutes;
    const t = new Date(from.getTime() + minutes * 60_000);

    // Integrate from the state, not from the previous row, so accumulated
    // rounding does not drift across the horizon.
    const sKm = advance(
      sched,
      new Date(state.ts),
      (t.getTime() - new Date(state.ts).getTime()) / 60_000,
      state.sKm,
      state.beta,
      totalKm,
    );

    // Uncertainty grows linearly with how far ahead we are guessing.
    const horizonH = minutes / 60;
    const sigmaKm = state.sigmaKm + CONFIDENCE_DECAY_KMPH * horizonH;

    rows.push({
      t: t.toISOString(),
      sKm: Math.round(sKm * 1000) / 1000,
      sigmaKm: Math.round(sigmaKm * 1000) / 1000,
    });
  }
  return rows;
}

/**
 * Named horizons persisted for scoring (§3.4). These are the numbers the
 * accuracy panel is judged on, so they are stored explicitly rather than
 * re-derived from the forecast rows later.
 */
export const SCORED_HORIZONS_MIN = [60, 120, 180, 300];

export function namedForecasts(
  state: PalkiState,
  geometry: RouteGeometry,
  sched: WariSchedule,
  from: Date = new Date(state.ts),
): { horizonMin: number; sKm: number; sigmaKm: number; t: string }[] {
  return SCORED_HORIZONS_MIN.map((horizonMin) => {
    const t = new Date(from.getTime() + horizonMin * 60_000);
    const sKm = advance(
      sched,
      new Date(state.ts),
      (t.getTime() - new Date(state.ts).getTime()) / 60_000,
      state.sKm,
      state.beta,
      geometry.totalKm,
    );
    return {
      horizonMin,
      sKm: Math.round(sKm * 1000) / 1000,
      sigmaKm: Math.round((state.sigmaKm + CONFIDENCE_DECAY_KMPH * (horizonMin / 60)) * 1000) / 1000,
      t: t.toISOString(),
    };
  });
}
