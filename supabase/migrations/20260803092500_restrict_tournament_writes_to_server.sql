-- Tournament writes require server-side validation and atomic RPCs. Keep reads
-- governed by RLS, but prevent authenticated clients from bypassing the API.
revoke insert, update, delete on table public.tournaments
  from anon, authenticated;

revoke insert, update, delete on table public.tournament_organizers
  from anon, authenticated;

revoke insert, update, delete on table public.tournament_photos
  from anon, authenticated;

revoke insert, update, delete on table public.tournament_groups
  from anon, authenticated;
