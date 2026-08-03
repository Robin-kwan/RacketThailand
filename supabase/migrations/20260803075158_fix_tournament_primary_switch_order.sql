create or replace function public.set_tournament_primary_photo(
  p_tournament_id uuid,
  p_photo_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));

  if not exists (
    select 1 from public.tournament_photos
    where id = p_photo_id and tournament_id = p_tournament_id
  ) then
    raise exception 'Photo not found.';
  end if;

  update public.tournament_photos
  set is_primary = false
  where tournament_id = p_tournament_id and is_primary;

  update public.tournament_photos
  set is_primary = true
  where id = p_photo_id and tournament_id = p_tournament_id;
end;
$$;
