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
  inserted_photo public.tournament_photos;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));

  select count(*) into photo_count
  from public.tournament_photos
  where tournament_id = p_tournament_id;

  if photo_count >= 8 then
    raise exception 'A tournament can have at most 8 images.';
  end if;

  insert into public.tournament_photos (tournament_id, image_url, is_primary)
  values (p_tournament_id, p_image_url, p_is_primary and photo_count = 0)
  returning * into inserted_photo;

  return inserted_photo;
end;
$$;

create or replace function public.delete_tournament_photo(
  p_tournament_id uuid,
  p_photo_id uuid
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  photo_count integer;
  deleted_image_url text;
  deleted_was_primary boolean;
  replacement_photo_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));

  select count(*) into photo_count
  from public.tournament_photos
  where tournament_id = p_tournament_id;

  if photo_count <= 1 then
    raise exception 'A tournament must keep at least one image.';
  end if;

  delete from public.tournament_photos
  where id = p_photo_id and tournament_id = p_tournament_id
  returning image_url, is_primary into deleted_image_url, deleted_was_primary;

  if deleted_image_url is null then
    raise exception 'Photo not found.';
  end if;

  if deleted_was_primary then
    select id into replacement_photo_id
    from public.tournament_photos
    where tournament_id = p_tournament_id
    order by created_at asc
    limit 1;

    update public.tournament_photos
    set is_primary = true
    where id = replacement_photo_id;
  end if;

  return deleted_image_url;
end;
$$;

revoke execute on function public.add_tournament_photo(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.add_tournament_photo(uuid, text, boolean)
  to service_role;

revoke execute on function public.delete_tournament_photo(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_tournament_photo(uuid, uuid)
  to service_role;
