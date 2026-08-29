-- ============================================================
-- Palki live location — additive migration
--
-- PURELY ADDITIVE. Run this AFTER db/schema.sql. It creates no
-- table that already exists and alters nothing.
--
-- NOTE ON `routes`: the build prompt asks for a routes table holding
-- polyline_json / landmarks_json. One already exists in schema.sql with a
-- PostGIS geom, and redefining it would break M1/M2/M3 and the facilities
-- chainage trigger. The polyline is already a static, service-worker-cached
-- asset served by /api/v1/palki/route/[version], so it does not need a
-- second home in the database. That table is left untouched.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Ground truth arriving from GPS devices and marshals
-- ------------------------------------------------------------

create table if not exists palki_pings (
  id           uuid primary key default gen_random_uuid(),
  route_slug   text not null,
  -- Device clock. Authoritative for ordering: a volunteer's phone may have
  -- been offline for hours and is storing-and-forwarding a batch.
  ts_device    timestamptz not null,
  ts_server    timestamptz not null default now(),
  lat          double precision not null,
  lng          double precision not null,
  -- Arc length along the route, km. Computed by the API, not the client,
  -- because resolving it correctly needs the previous state (about 15 km of
  -- this route is walked twice and a bare coordinate is ambiguous there).
  s_km         numeric(8,3),
  source       text not null default 'gps',
  -- NOT NULL with a '' sentinel, not nullable. Postgres treats every NULL as
  -- distinct from every other NULL, so a unique constraint on a nullable
  -- column would silently fail to dedupe two anonymous pings with the same
  -- timestamp — and Supabase's .upsert({onConflict}) can only target a real
  -- column-level unique constraint, not an expression index like
  -- coalesce(reporter_id, ''), so that workaround doesn't work either.
  reporter_id  text not null default '',
  is_simulated boolean not null default true,
  run_id       text
);

create index if not exists palki_pings_order_idx
  on palki_pings (route_slug, is_simulated, ts_device desc);

-- Upgrade path for a table created before reporter_id was made NOT NULL —
-- CREATE TABLE IF NOT EXISTS above is a no-op once the table exists, so this
-- runs unconditionally and is safe to execute again on a fresh table too.
alter table palki_pings alter column reporter_id set default '';
update palki_pings set reporter_id = '' where reporter_id is null;
alter table palki_pings alter column reporter_id set not null;
drop index if exists palki_pings_dedupe_idx;

-- One ping per device-timestamp per reporter, so a store-and-forward retry
-- that resends the same batch cannot double-count it. A real constraint
-- (not just an index) so .upsert({onConflict: '...'}) can target it.
alter table palki_pings drop constraint if exists palki_pings_dedupe_key;
alter table palki_pings add constraint palki_pings_dedupe_key
  unique (route_slug, reporter_id, ts_device);

-- ------------------------------------------------------------
-- The estimator's state over time
-- ------------------------------------------------------------

create table if not exists palki_state (
  id           uuid primary key default gen_random_uuid(),
  route_slug   text not null,
  ts           timestamptz not null,
  s_km         numeric(8,3) not null,
  v_kmph       numeric(6,3) not null,
  beta         numeric(5,3) not null,
  sigma_km     numeric(6,3) not null,
  source       text not null,
  residuals    jsonb not null default '[]'::jsonb,
  is_simulated boolean not null default true,
  run_id       text,
  created_at   timestamptz not null default now()
);

create index if not exists palki_state_latest_idx
  on palki_state (route_slug, is_simulated, ts desc);

-- ------------------------------------------------------------
-- Forecasts, persisted so they can be scored against reality later
-- ------------------------------------------------------------

create table if not exists palki_forecasts (
  id           uuid primary key default gen_random_uuid(),
  route_slug   text not null,
  issued_at    timestamptz not null,
  -- Named horizons only (60/120/180/300 min). The full 30-min timeline lives
  -- in the packet; only the scored horizons need persisting.
  horizon_min  int not null,
  target_ts    timestamptz not null,
  s_km_pred    numeric(8,3) not null,
  sigma_km     numeric(6,3) not null,
  is_simulated boolean not null default true,
  run_id       text
);

create index if not exists palki_forecasts_scoring_idx
  on palki_forecasts (route_slug, is_simulated, target_ts);

-- ------------------------------------------------------------
-- Scores: forecast vs what actually happened
-- ------------------------------------------------------------

create table if not exists palki_scores (
  forecast_id  uuid primary key references palki_forecasts(id) on delete cascade,
  actual_s_km  numeric(8,3) not null,
  error_km     numeric(8,3) not null,
  scored_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Simulator ground truth
--
-- NOT IN THE ORIGINAL SPEC, and deliberately separate.
--
-- The simulator plays the role of physical reality, and the estimator must
-- never see its internals — that is the whole basis of the claim that the
-- model is not cheating. But the demo dashboard needs continuous truth to
-- draw the red marker, and the scorer needs it to compute MAE, and pings
-- alone are too sparse (every 30 min) and too noisy (~15 m GPS error).
--
-- So truth lands here, in a table that ONLY the demo dashboard and the
-- scorer read. Nothing under lib/palki/estimator.ts queries it.
-- ------------------------------------------------------------

create table if not exists palki_sim_truth (
  id           uuid primary key default gen_random_uuid(),
  route_slug   text not null,
  run_id       text not null,
  ts           timestamptz not null,
  s_km         numeric(8,3) not null,
  -- Why the simulator was moving at the speed it was, for annotating the
  -- error chart ("unscheduled 45-min halt injected").
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists palki_sim_truth_idx
  on palki_sim_truth (route_slug, run_id, ts);

-- ------------------------------------------------------------
-- Row level security
--
-- Pilgrims read; only the service role writes. Ingest is authenticated at
-- the API layer with a bearer secret, so the anon key can never insert a
-- ping and spoof the Palki's position.
-- ------------------------------------------------------------

alter table palki_pings     enable row level security;
alter table palki_state     enable row level security;
alter table palki_forecasts enable row level security;
alter table palki_scores    enable row level security;
alter table palki_sim_truth enable row level security;

drop policy if exists palki_pings_read on palki_pings;
drop policy if exists palki_state_read on palki_state;
drop policy if exists palki_forecasts_read on palki_forecasts;
drop policy if exists palki_scores_read on palki_scores;
drop policy if exists palki_sim_truth_read on palki_sim_truth;

create policy palki_pings_read     on palki_pings     for select using (true);
create policy palki_state_read     on palki_state     for select using (true);
create policy palki_forecasts_read on palki_forecasts for select using (true);
create policy palki_scores_read    on palki_scores    for select using (true);
create policy palki_sim_truth_read on palki_sim_truth for select using (true);

-- ------------------------------------------------------------
-- Latest state, with the simulated filter applied BY DEFAULT.
--
-- The spec asks that simulated and real data never mix in a query without
-- filtering, and that the filter be the default. A view is the cheapest way
-- to make the safe thing the easy thing.
-- ------------------------------------------------------------

create or replace view palki_state_live as
  select distinct on (route_slug) *
  from palki_state
  where is_simulated = false
  order by route_slug, ts desc;

create or replace view palki_state_sim as
  select distinct on (route_slug, run_id) *
  from palki_state
  where is_simulated = true
  order by route_slug, run_id, ts desc;
