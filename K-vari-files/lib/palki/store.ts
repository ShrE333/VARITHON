/**
 * Persistence for the Palki estimator.
 *
 * Supabase when it is configured, an in-process fallback when it is not.
 *
 * The fallback is not laziness. The whole point of the feature is that the
 * pilgrim-facing path never blocks on the network, and the same discipline
 * applies to the demo: a judge's laptop with no Supabase credentials must
 * still be able to run the simulator and watch the model track it. Losing
 * the in-memory state on restart is an acceptable price for that; nothing
 * here is the system of record for anything a pilgrim depends on.
 */

import { supabaseAdmin } from './supabase-admin';
import { ROUTE_SLUG } from '../env';
import type { ForecastScore, PalkiState, Ping } from './types';

interface MemoryStore {
  state: Map<string, PalkiState>;
  pings: Ping[];
  forecasts: {
    issuedAt: string;
    horizonMin: number;
    targetTs: string;
    sKm: number;
    sigmaKm: number;
    isSimulated: boolean;
  }[];
  truth: { ts: string; sKm: number; note?: string; runId: string }[];
  scores: ForecastScore[];
}

/**
 * Hung off globalThis rather than kept as a module-level constant.
 *
 * Next.js bundles each route handler separately, so `import`ing this module
 * from /packet and from /ping yields two *different* module instances and
 * therefore two different stores — the ping endpoint would update one while
 * the packet endpoint read the other, and the Palki would sit at km 0
 * forever while the simulator ran. A global survives that duplication, and
 * also survives dev-server hot reloads.
 *
 * IMPORTANT: this is single-process only. On serverless (Vercel) each
 * invocation may get a fresh isolate, so a deployment that actually needs to
 * remember anything between requests MUST configure Supabase. The in-memory
 * path exists so the demo runs on a laptop with no credentials.
 */
const globalStore = globalThis as unknown as { __wariPalkiStore?: MemoryStore };

const memory: MemoryStore =
  globalStore.__wariPalkiStore ??
  (globalStore.__wariPalkiStore = {
    state: new Map(),
    pings: [],
    forecasts: [],
    truth: [],
    scores: [],
  });

/** Keyed so simulated and real runs can never overwrite each other. */
function key(isSimulated: boolean): string {
  return `${ROUTE_SLUG}:${isSimulated ? 'sim' : 'live'}`;
}

export function isSupabaseConfigured(): boolean {
  return supabaseAdmin !== null;
}

// --------------------------------------------------------------- state

export async function loadState(isSimulated: boolean): Promise<PalkiState | null> {
  if (supabaseAdmin) {
    // Ordered by created_at (when we wrote the row), not ts (the state's own
    // domain clock — simulated time for a demo run, device time for a real
    // ping). Those diverge: a simulator restart's clock starts back near the
    // beginning of a Wari day, while an earlier/faster test run may have
    // already advanced its simulated clock past it. Ordering by ts would let
    // that older run's row keep outranking every fresh one forever, since
    // "latest ts" and "most recently computed" are not the same thing once
    // more than one run's history can coexist in the same table.
    const { data, error } = await supabaseAdmin
      .from('palki_state')
      .select('*')
      .eq('route_slug', ROUTE_SLUG)
      .eq('is_simulated', isSimulated)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        sKm: Number(data.s_km),
        vKmph: Number(data.v_kmph),
        beta: Number(data.beta),
        sigmaKm: Number(data.sigma_km),
        ts: new Date(data.ts).toISOString(),
        source: data.source,
        residuals: (data.residuals as number[]) ?? [],
        isSimulated: data.is_simulated,
      };
    }
    if (error) console.error('[palki/store] loadState failed:', error.message);
    // Fall through to memory on error — a Supabase outage must not take the
    // packet endpoint down with it.
  }
  return memory.state.get(key(isSimulated)) ?? null;
}

export async function saveState(state: PalkiState): Promise<void> {
  memory.state.set(key(state.isSimulated), state);

  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('palki_state').insert({
      route_slug: ROUTE_SLUG,
      ts: state.ts,
      s_km: state.sKm,
      v_kmph: state.vKmph,
      beta: state.beta,
      sigma_km: state.sigmaKm,
      source: state.source,
      residuals: state.residuals,
      is_simulated: state.isSimulated,
    });
    if (error) console.error('[palki/store] saveState failed:', error.message);
  }
}

// --------------------------------------------------------------- pings

export async function savePings(pings: Ping[], sKmBySeq: number[]): Promise<void> {
  memory.pings.push(...pings);
  if (memory.pings.length > 5000) memory.pings.splice(0, memory.pings.length - 5000);

  if (supabaseAdmin && pings.length) {
    const { error } = await supabaseAdmin.from('palki_pings').upsert(
      pings.map((p, i) => ({
        route_slug: ROUTE_SLUG,
        ts_device: p.tsDevice,
        lat: p.lat,
        lng: p.lng,
        s_km: sKmBySeq[i] ?? null,
        source: p.source,
        // '' sentinel, matching the column's NOT NULL default — see the
        // comment on palki_pings.reporter_id in db/palki_schema.sql.
        reporter_id: p.reporterId ?? '',
        is_simulated: p.isSimulated,
      })),
      { onConflict: 'route_slug,reporter_id,ts_device', ignoreDuplicates: true },
    );
    if (error) console.error('[palki/store] savePings failed:', error.message);
  }
}

// ----------------------------------------------------------- forecasts

export async function saveForecasts(
  rows: { horizonMin: number; sKm: number; sigmaKm: number; t: string }[],
  issuedAt: string,
  isSimulated: boolean,
): Promise<void> {
  for (const r of rows) {
    memory.forecasts.push({
      issuedAt,
      horizonMin: r.horizonMin,
      targetTs: r.t,
      sKm: r.sKm,
      sigmaKm: r.sigmaKm,
      isSimulated,
    });
  }
  if (memory.forecasts.length > 5000) {
    memory.forecasts.splice(0, memory.forecasts.length - 5000);
  }

  if (supabaseAdmin && rows.length) {
    const { error } = await supabaseAdmin.from('palki_forecasts').insert(
      rows.map((r) => ({
        route_slug: ROUTE_SLUG,
        issued_at: issuedAt,
        horizon_min: r.horizonMin,
        target_ts: r.t,
        s_km_pred: r.sKm,
        sigma_km: r.sigmaKm,
        is_simulated: isSimulated,
      })),
    );
    if (error) console.error('[palki/store] saveForecasts failed:', error.message);
  }
}

/**
 * Score every forecast whose target time has now passed, against the truth
 * we have for that moment.
 *
 * This is what turns "the model looks like it is tracking" into a number.
 */
export async function scoreDueForecasts(
  truthAt: (ts: string) => number | null,
  isSimulated: boolean,
): Promise<ForecastScore[]> {
  const now = Date.now();
  const scored: ForecastScore[] = [];

  for (const f of memory.forecasts) {
    if (f.isSimulated !== isSimulated) continue;
    if (new Date(f.targetTs).getTime() > now) continue;
    if (memory.scores.some((s) => s.issuedAt === f.issuedAt && s.horizonMin === f.horizonMin)) {
      continue;
    }
    const actual = truthAt(f.targetTs);
    if (actual === null) continue;

    const score: ForecastScore = {
      horizonMin: f.horizonMin,
      predictedSKm: f.sKm,
      actualSKm: actual,
      errorKm: Math.abs(f.sKm - actual),
      issuedAt: f.issuedAt,
      scoredAt: new Date().toISOString(),
    };
    memory.scores.push(score);
    scored.push(score);
  }
  return scored;
}

export function allScores(): ForecastScore[] {
  return memory.scores;
}

// ------------------------------------------------- simulator ground truth

/**
 * The estimator never reads any of this. It exists so the demo dashboard can
 * draw the red "actual" marker and the scorer can compute MAE.
 */
export function recordTruth(runId: string, ts: string, sKm: number, note?: string): void {
  memory.truth.push({ runId, ts, sKm, note });
  if (memory.truth.length > 20000) memory.truth.splice(0, memory.truth.length - 20000);
}

export function truthSeries(runId?: string): { ts: string; sKm: number; note?: string }[] {
  return runId ? memory.truth.filter((t) => t.runId === runId) : memory.truth;
}

/** Linearly interpolated simulator truth at an instant, or null if unknown. */
export function truthAt(ts: string): number | null {
  const t = new Date(ts).getTime();
  const series = memory.truth;
  if (series.length === 0) return null;

  let before: (typeof series)[number] | null = null;
  let after: (typeof series)[number] | null = null;
  for (const row of series) {
    const rt = new Date(row.ts).getTime();
    if (rt <= t && (!before || rt > new Date(before.ts).getTime())) before = row;
    if (rt >= t && (!after || rt < new Date(after.ts).getTime())) after = row;
  }
  if (before && after) {
    const bt = new Date(before.ts).getTime();
    const at = new Date(after.ts).getTime();
    if (at === bt) return before.sKm;
    const f = (t - bt) / (at - bt);
    return before.sKm + (after.sKm - before.sKm) * f;
  }
  return before?.sKm ?? after?.sKm ?? null;
}

export interface ResetReport {
  supabase: boolean;
  deleted: string[];
  errors: string[];
}

/**
 * Wipe a simulated run so a demo can start from km 0 again.
 *
 * Every delete is filtered on `is_simulated` (or, for palki_sim_truth, on
 * the fact that the table only ever holds simulator output). A reset run by
 * mistake during a real Wari must not be able to erase real history — losing
 * the demo run is recoverable, losing the live one is not.
 *
 * palki_scores is not listed: it cascades from palki_forecasts.
 */
export async function resetSimulated(): Promise<ResetReport> {
  resetMemory();

  if (!supabaseAdmin) return { supabase: false, deleted: [], errors: [] };

  const deleted: string[] = [];
  const errors: string[] = [];

  for (const table of ['palki_forecasts', 'palki_pings', 'palki_state'] as const) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('route_slug', ROUTE_SLUG)
      .eq('is_simulated', true);
    if (error) errors.push(`${table}: ${error.message}`);
    else deleted.push(table);
  }

  const { error: truthError } = await supabaseAdmin
    .from('palki_sim_truth')
    .delete()
    .eq('route_slug', ROUTE_SLUG);
  if (truthError) errors.push(`palki_sim_truth: ${truthError.message}`);
  else deleted.push('palki_sim_truth');

  return { supabase: true, deleted, errors };
}

export function resetMemory(): void {
  memory.state.clear();
  memory.pings.length = 0;
  memory.forecasts.length = 0;
  memory.truth.length = 0;
  memory.scores.length = 0;
}

export function recentPings(limit = 50): Ping[] {
  return memory.pings.slice(-limit);
}
