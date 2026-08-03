revoke execute on function public.update_tournament_with_organizers(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.update_tournament_with_organizers(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  jsonb
) to service_role;
