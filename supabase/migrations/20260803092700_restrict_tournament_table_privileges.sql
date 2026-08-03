-- RLS applies to row operations, not TRUNCATE. Public API roles only need
-- SELECT on tournament tables; all writes and schema-adjacent privileges are
-- reserved for trusted server/database roles.
revoke truncate, references, trigger on table public.tournaments
  from anon, authenticated;

revoke truncate, references, trigger on table public.tournament_organizers
  from anon, authenticated;

revoke truncate, references, trigger on table public.tournament_photos
  from anon, authenticated;

revoke truncate, references, trigger on table public.tournament_groups
  from anon, authenticated;
