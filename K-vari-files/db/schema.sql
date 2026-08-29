-- ============================================================
-- Wari location platform — schema
-- Target: Supabase (Postgres 15 + PostGIS)
-- ============================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type facility_kind as enum (
  'hospital',          -- permanent, from OSM
  'phc',               -- primary health centre, permanent
  'pharmacy',          -- permanent
  'health_camp',       -- temporary, admin-registered
  'refreshment_camp',  -- temporary, admin-registered (anna-chhatra / water)
  'rest_stop',         -- temporary, day rest
  'night_stay',        -- mukkam / dharamshala
  'hotel'              -- registered commercial food/stay
);

create type facility_status as enum ('open', 'full', 'closed');
create type review_state    as enum ('pending', 'approved', 'rejected');

-- ------------------------------------------------------------
-- Routes
-- One row per palkhi (Dnyaneshwar Maharaj, Tukaram Maharaj, ...)
-- ------------------------------------------------------------

create table routes (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,            -- 'dnyaneshwar-2026'
  name          text not null,
  year          int  not null,
  geom          geometry(LineString, 4326) not null,
  total_km      numeric(7,3) not null,
  start_name    text not null,                   -- 'Alandi'
  end_name      text not null default 'Pandharpur',
  -- destination is the temple itself, not the end of the traced line
  destination   geography(Point, 4326) not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index routes_geom_idx on routes using gist (geom);

-- ------------------------------------------------------------
-- Stages (mukkam schedule) — powers M2
-- ------------------------------------------------------------

create table route_stages (
  id             uuid primary key default gen_random_uuid(),
  route_id       uuid not null references routes(id) on delete cascade,
  day_number     int  not null,
  stage_date     date,
  from_place     text not null,
  to_place       text not null,
  start_km       numeric(7,3) not null,
  end_km         numeric(7,3) not null,
  distance_km    numeric(6,3) generated always as (end_km - start_km) stored,
  notes          text,
  unique (route_id, day_number)
);

create index route_stages_km_idx on route_stages (route_id, start_km);

-- ------------------------------------------------------------
-- Facilities — powers M3, written by M4
-- ------------------------------------------------------------

create table facilities (
  id            uuid primary key default gen_random_uuid(),
  route_id      uuid not null references routes(id) on delete cascade,
  kind          facility_kind not null,
  name          text not null,
  location      geography(Point, 4326) not null,

  -- derived by trigger, never written by the client
  chainage_km   numeric(7,3),
  offset_m      numeric(8,2),

  status        facility_status not null default 'open',
  review        review_state    not null default 'pending',

  -- provenance: 'osm' rows are pre-seeded and auto-approved,
  -- 'admin' rows come from the camp admin PWA and need review
  source        text not null default 'admin',
  osm_id        text unique,

  owner_id      uuid references auth.users(id) on delete set null,
  contact_phone text,
  capacity      int,
  opens_at      time,
  closes_at     time,
  amenities     jsonb not null default '{}'::jsonb,

  -- accuracy of the GPS fix used to place this pin, in metres
  fix_accuracy_m numeric(6,2),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Nearest-ahead lookups: filter on route + kind + approved, order by chainage
create index facilities_lookup_idx
  on facilities (route_id, kind, chainage_km)
  where review = 'approved';

create index facilities_geo_idx on facilities using gist (location);
create index facilities_owner_idx on facilities (owner_id);

-- ------------------------------------------------------------
-- Chainage trigger
-- ST_LineLocatePoint returns a 0..1 fraction along the line.
-- ------------------------------------------------------------

create or replace function compute_chainage() returns trigger
language plpgsql as $$
declare
  r_geom geometry;
  r_len  numeric;
begin
  select geom, total_km into r_geom, r_len
  from routes where id = new.route_id;

  if r_geom is null then
    raise exception 'route % not found', new.route_id;
  end if;

  new.chainage_km := round(
    (ST_LineLocatePoint(r_geom, new.location::geometry) * r_len)::numeric, 3
  );

  new.offset_m := round(
    ST_Distance(new.location, r_geom::geography)::numeric, 2
  );

  new.updated_at := now();
  return new;
end;
$$;

create trigger facilities_chainage
  before insert or update of location, route_id on facilities
  for each row execute function compute_chainage();

-- ------------------------------------------------------------
-- Nearest-ahead RPC
-- Called from the client when it is online; the offline path
-- runs the same logic in TypeScript against the cached bundle.
-- ------------------------------------------------------------

create or replace function nearest_ahead(
  p_route_id   uuid,
  p_kinds      facility_kind[],
  p_chainage   numeric,
  p_limit      int default 5,
  p_lookback   numeric default 2.0,   -- also surface things just behind you
  p_max_offset numeric default 3000   -- ignore facilities >3km off the road
)
returns setof facilities
language sql stable as $$
  select *
  from facilities
  where route_id = p_route_id
    and kind = any(p_kinds)
    and review = 'approved'
    and status <> 'closed'
    and offset_m <= p_max_offset
    and chainage_km >= p_chainage - p_lookback
  order by chainage_km asc
  limit p_limit;
$$;

-- ------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------

alter table facilities   enable row level security;
alter table routes       enable row level security;
alter table route_stages enable row level security;

-- Anyone (including anon pilgrims) can read approved facilities
create policy facilities_public_read on facilities
  for select using (review = 'approved');

-- A camp admin can always see their own rows, approved or not
create policy facilities_owner_read on facilities
  for select using (auth.uid() = owner_id);

-- A signed-in admin can create a camp, but cannot self-approve
create policy facilities_owner_insert on facilities
  for insert with check (
    auth.uid() = owner_id
    and review = 'pending'
    and source = 'admin'
  );

-- Owners may edit their own camp, including toggling open/full/closed
-- after approval. The review column is protected by the trigger below,
-- not by this policy, because RLS cannot compare OLD to NEW.
create policy facilities_owner_update on facilities
  for update using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Guard: only an organizer may change the review state. Anyone else's
-- attempt is silently reverted rather than erroring, so a camp admin
-- editing their phone number does not get a hard failure.
create or replace function guard_review_state() returns trigger
language plpgsql security definer as $$
begin
  if new.review is distinct from old.review then
    if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'organizer' then
      new.review := old.review;
    end if;
  end if;

  -- Moving the pin sends a camp back for re-approval
  if not ST_Equals(new.location::geometry, old.location::geometry) then
    new.review := 'pending';
  end if;

  return new;
end;
$$;

create trigger facilities_review_guard
  before update on facilities
  for each row execute function guard_review_state();

create policy routes_public_read on routes for select using (true);
create policy stages_public_read on route_stages for select using (true);

-- ------------------------------------------------------------
-- Public read view for the pilgrim client (M3)
--
-- `location` is a PostGIS `geography` column — queried directly through
-- PostgREST it comes back as opaque WKB hex, not {lat, lng}. This view
-- extracts plain numeric lat/lng so the client can read it with an ordinary
-- .select(), and re-applies the "approved only" filter itself (rather than
-- relying on the underlying table's RLS being re-evaluated through the
-- view, which Postgres does not guarantee by default) so it is safe to
-- expose regardless of that nuance.
-- ------------------------------------------------------------

create or replace view facilities_public as
  select
    id, route_id, kind, name,
    ST_Y(location::geometry) as lat,
    ST_X(location::geometry) as lng,
    chainage_km, offset_m, status, source,
    contact_phone, capacity, opens_at, closes_at, amenities
  from facilities
  where review = 'approved';

grant select on facilities_public to anon, authenticated;
