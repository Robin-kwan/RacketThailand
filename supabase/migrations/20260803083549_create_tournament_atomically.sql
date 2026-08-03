create or replace function public.create_tournament_with_organizers(
  p_owner_id uuid,
  p_sport_id uuid,
  p_court_id uuid,
  p_name text,
  p_description text,
  p_tournament_start_at timestamptz,
  p_tournament_end_at timestamptz,
  p_registration_url text,
  p_phone text,
  p_line_id text,
  p_organizers jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_tournament_id uuid;
begin
  if jsonb_typeof(p_organizers) <> 'array' or jsonb_array_length(p_organizers) = 0 then
    raise exception 'At least one organizer is required.';
  end if;

  insert into public.tournaments (
    sport_id,
    court_id,
    owner_id,
    name,
    description,
    tournament_start_at,
    tournament_end_at,
    registration_url,
    phone,
    line_id,
    status
  ) values (
    p_sport_id,
    p_court_id,
    p_owner_id,
    p_name,
    p_description,
    p_tournament_start_at,
    p_tournament_end_at,
    p_registration_url,
    p_phone,
    p_line_id,
    'draft'
  )
  returning id into created_tournament_id;

  insert into public.tournament_organizers (
    tournament_id,
    group_id,
    organizer_name,
    phone,
    line_id,
    website_url,
    display_order
  )
  select
    created_tournament_id,
    organizer.group_id,
    organizer.organizer_name,
    organizer.phone,
    organizer.line_id,
    organizer.website_url,
    organizer.display_order
  from jsonb_to_recordset(p_organizers) as organizer(
    group_id uuid,
    organizer_name text,
    phone text,
    line_id text,
    website_url text,
    display_order integer
  );

  return created_tournament_id;
end;
$$;

revoke execute on function public.create_tournament_with_organizers(
  uuid, uuid, uuid, text, text, timestamptz, timestamptz, text, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.create_tournament_with_organizers(
  uuid, uuid, uuid, text, text, timestamptz, timestamptz, text, text, text, jsonb
) to service_role;
