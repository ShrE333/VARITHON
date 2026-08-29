-- ============================================================
-- Admin Location Management — standalone schema
--
-- Run once. Safe to re-run (every statement is guarded).
--
-- WHY THIS IS A PLAIN TABLE
-- --------------------------------------------------------------
-- In the project this was extracted from, locations lived in a `facilities`
-- table with a PostGIS `geography(Point,4326)` column, a foreign key to a
-- `routes` table, and three Postgres enums. That existed because the host
-- app also computed "how far along the pilgrimage route this point sits".
--
-- None of that is part of this feature. Two float columns hold a coordinate
-- perfectly well, and dropping PostGIS removes the single hardest dependency
-- in the whole extraction. If your panel already uses PostGIS, keep using
-- it — change src/admin-locations/mapper.ts and nothing else.
-- ============================================================

-- gen_random_uuid(). Built in from Postgres 13; the extension is a no-op on
-- newer versions and required on older ones.
create extension if not exists pgcrypto;

create table if not exists locations (
  id               uuid primary key default gen_random_uuid(),

  name             text not null,

  -- Free text, not an enum, on purpose. The category registry in
  -- src/admin-locations/categories.ts is the source of truth for labels,
  -- icons and colours. Adding a category there needs no migration; a
  -- Postgres enum would need one, and could never drop a value again.
  category         text not null,

  latitude         double precision not null,
  longitude        double precision not null,

  description      text,
  address          text,
  contact_phone    text,
  operating_hours  text,
  additional_info  text,

  -- Operational state. DELIBERATELY SEPARATE from is_active.
  --   status    = open / full / closed — the place is real and listed, it
  --               just has no capacity right now.
  --   is_active = whether the record is published at all.
  -- Collapsing these would make "hide this mistyped record" impossible to
  -- express without also claiming the place is closed.
  status           text not null default 'open'
                     check (status in ('open', 'full', 'closed')),
  is_active        boolean not null default true,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Coordinates must be real coordinates. Cheap to enforce here, and it stops
-- a bad API client writing something no map can render.
alter table locations drop constraint if exists locations_lat_range;
alter table locations add constraint locations_lat_range
  check (latitude between -90 and 90);

alter table locations drop constraint if exists locations_lng_range;
alter table locations add constraint locations_lng_range
  check (longitude between -180 and 180);

-- The admin list is "everything, newest first"; the public read is
-- "published only". One index serves both.
create index if not exists locations_active_created_idx
  on locations (is_active, created_at desc);

create index if not exists locations_category_idx
  on locations (category);

-- ------------------------------------------------------------
-- Public view — only published rows
--
-- If anything other than the admin panel reads locations, point it here
-- rather than at the table. Then "inactive rows are never exposed" is true
-- everywhere at once, instead of depending on every caller remembering to
-- filter.
-- ------------------------------------------------------------
create or replace view locations_public as
  select
    id, name, category, latitude, longitude,
    description, address, contact_phone,
    operating_hours, additional_info,
    status, created_at, updated_at
  from locations
  where is_active = true;

-- ------------------------------------------------------------
-- Row level security
--
-- The API writes with the SERVICE ROLE key, which bypasses RLS entirely —
-- so these policies are a backstop for any client that ever talks to the
-- database directly, not the primary gate. The primary gate is
-- isAdminAuthorised() in the route adapter.
--
-- Commented out because it depends on how your panel models an admin.
-- Uncomment and adjust once you have real auth.
-- ------------------------------------------------------------
-- alter table locations enable row level security;
--
-- create policy locations_public_read on locations
--   for select using (is_active = true);
--
-- create policy locations_admin_write on locations
--   for all using (auth.jwt() ->> 'role' = 'admin')
--   with check   (auth.jwt() ->> 'role' = 'admin');

grant select on locations_public to anon, authenticated;
