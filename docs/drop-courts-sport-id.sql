-- Run after docs/multi-sport-courts.sql has backfilled court_sports.
-- court_sports is now the source of truth for court sport membership.
-- The app infers the default sport from court_sports.created_at order, so no
-- replacement column is needed.

alter table public.courts
  drop column if exists sport_id;
