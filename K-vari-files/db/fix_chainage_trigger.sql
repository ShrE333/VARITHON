-- ============================================================
-- Fix: chainage must come from the same engine the client uses.
--
-- Run this once, after db/schema.sql. Safe to re-run.
--
-- THE BUG
-- -------
-- compute_chainage() derived chainage_km as:
--
--     ST_LineLocatePoint(geom, location) * total_km
--
-- ST_LineLocatePoint operates on `geometry`, i.e. planar degrees. It
-- returns the fraction of the line's length measured in degree-space —
-- but total_km is a true geodesic length, so the two are different
-- measures and multiplying them mixes them.
--
-- At this route's latitude (~18 N) a degree of longitude covers only
-- cos(18) ~= 0.95 of the ground distance a degree of latitude does. On a
-- route trending south-east, east-west movement is therefore under-counted
-- in degree-space, and every chainage comes out short.
--
-- Measured against the turf engine the client actually uses
-- (lib/chainage.ts RouteIndex.locate) across all 25 seeded fixtures:
-- mean error 0.509 km, worst 1.189 km, and biased low in every single
-- case — a systematic offset, not noise.
--
-- WHY THAT MATTERS
-- ----------------
-- A pilgrim's own chainage comes from turf, in the browser. A facility's
-- came from here. findNearestAhead() subtracts one from the other, so a
-- systematic 0.5-1.2 km disagreement puts real error into every "how far
-- is it" answer and can reorder two nearby facilities.
--
-- THE FIX
-- -------
-- Chainage is now computed in TypeScript by the same RouteIndex the client
-- uses (see lib/facilities/chainage-server.ts) and written explicitly. This
-- trigger keeps computing it only as a fallback for rows inserted by hand
-- in SQL, where nothing better is available — and that fallback stays
-- approximate, which is why the app never relies on it.
--
-- offset_m is unchanged and remains correct: ST_Distance on `geography`
-- (not geometry) is a true geodesic distance, so it never had this problem.
-- ============================================================

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

  -- Only fall back to the planar approximation when the caller supplied
  -- nothing. The application always supplies a turf-computed value.
  if new.chainage_km is null then
    new.chainage_km := round(
      (ST_LineLocatePoint(r_geom, new.location::geometry) * r_len)::numeric, 3
    );
  end if;

  -- Geodesic, and correct: `location` is geography, so this is real metres.
  new.offset_m := round(
    ST_Distance(new.location, r_geom::geography)::numeric, 2
  );

  new.updated_at := now();
  return new;
end;
$$;
