-- ============================================================
-- Admin Location Management — additive migration
--
-- Run AFTER db/schema.sql. Safe to re-run (every statement is guarded).
--
-- WHY THIS EXTENDS `facilities` RATHER THAN CREATING A NEW TABLE
-- --------------------------------------------------------------
-- The brief asks that admin-managed locations be visible to the user-side
-- SOS feature. That feature already exists and reads `facilities` (through
-- the facilities_public view). A separate `locations` table would mean
-- nothing an admin adds ever reaches a pilgrim — the exact opposite of the
-- requirement. So this adds the missing columns to the table the app
-- already reads, and there stays exactly one source of truth.
-- ============================================================

-- ------------------------------------------------------------
-- 1. New columns
-- ------------------------------------------------------------

alter table facilities add column if not exists description      text;
alter table facilities add column if not exists address          text;
alter table facilities add column if not exists operating_hours  text;
alter table facilities add column if not exists additional_info  text;

-- Admin visibility toggle. DELIBERATELY SEPARATE from `status`.
--
--   status    = operational state (open / full / closed) — the camp is
--               real and listed, it just has no beds right now. Already
--               shown to pilgrims.
--   is_active = whether the record should be published at all.
--
-- Collapsing these would mean an admin could not take a mis-entered record
-- off the map without also claiming the place is "closed".
alter table facilities add column if not exists is_active boolean not null default true;

create index if not exists facilities_active_idx
  on facilities (route_id, is_active, kind);

-- ------------------------------------------------------------
-- 2. Categories
--
-- `facility_kind` is a Postgres enum. Adding a value is one line here plus
-- one line in lib/admin-locations/categories.ts (which owns the labels and
-- icons). Postgres cannot REMOVE an enum value, so retire a category by
-- dropping it from the TypeScript registry instead — the column keeps
-- accepting it, nothing breaks, and it stops being offered in the UI.
-- ------------------------------------------------------------

alter type facility_kind add value if not exists 'water_point';
alter type facility_kind add value if not exists 'police';
alter type facility_kind add value if not exists 'ambulance';
alter type facility_kind add value if not exists 'emergency_help';
alter type facility_kind add value if not exists 'toilet';
alter type facility_kind add value if not exists 'parking';
alter type facility_kind add value if not exists 'other';

-- ------------------------------------------------------------
-- 3. Public view — now also gated on is_active
--
-- This is the only thing the pilgrim-facing app reads, so adding the
-- is_active filter here is what makes "only active locations are exposed
-- to normal users" true everywhere at once, rather than depending on every
-- caller remembering to filter.
-- ------------------------------------------------------------

create or replace view facilities_public as
  select
    id, route_id, kind, name,
    ST_Y(location::geometry) as lat,
    ST_X(location::geometry) as lng,
    chainage_km, offset_m, status, source,
    contact_phone, capacity, opens_at, closes_at, amenities,
    description, address, operating_hours, additional_info,
    created_at, updated_at
  from facilities
  where review = 'approved'
    and is_active = true;

grant select on facilities_public to anon, authenticated;

-- ------------------------------------------------------------
-- 4. Admin view — everything, including inactive rows
--
-- The admin panel must be able to see and re-activate what it has
-- deactivated, which the public view by definition hides. Not granted to
-- anon: reads go through the service-role API route, not the browser.
-- ------------------------------------------------------------

create or replace view facilities_admin as
  select
    id, route_id, kind, name,
    ST_Y(location::geometry) as lat,
    ST_X(location::geometry) as lng,
    chainage_km, offset_m, status, review, source,
    contact_phone, capacity, opens_at, closes_at, amenities,
    description, address, operating_hours, additional_info,
    is_active, fix_accuracy_m, created_at, updated_at
  from facilities;
