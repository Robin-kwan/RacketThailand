create unique index if not exists tournament_photos_one_primary_idx
  on public.tournament_photos (tournament_id)
  where is_primary;

create or replace function public.add_tournament_photo(
  p_tournament_id uuid,
  p_image_url text,
  p_is_primary boolean
)
returns public.tournament_photos
language plpgsql
security invoker
set search_path = ''
as $$
declare
  photo_count integer;
  should_be_primary boolean;
  inserted_photo public.tournament_photos;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));

  select count(*) into photo_count
  from public.tournament_photos
  where tournament_id = p_tournament_id;

  if photo_count >= 8 then
    raise exception 'A tournament can have at most 8 images.';
  end if;

  should_be_primary := p_is_primary or photo_count = 0;
  if should_be_primary then
    update public.tournament_photos
    set is_primary = false
    where tournament_id = p_tournament_id and is_primary;
  end if;

  insert into public.tournament_photos (tournament_id, image_url, is_primary)
  values (p_tournament_id, p_image_url, should_be_primary)
  returning * into inserted_photo;

  return inserted_photo;
end;
$$;

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
  set is_primary = (id = p_photo_id)
  where tournament_id = p_tournament_id;
end;
$$;

revoke execute on function public.set_tournament_primary_photo(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_tournament_primary_photo(uuid, uuid)
  to service_role;
