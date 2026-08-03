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

  if photo_count = 0 then
    update public.tournaments
    set status = 'published', updated_at = now()
    where id = p_tournament_id and status = 'draft';
  end if;

  return inserted_photo;
end;
$$;
