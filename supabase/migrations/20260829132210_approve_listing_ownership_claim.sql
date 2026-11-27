create or replace function public.approve_listing_ownership_claim(
  p_claim_id uuid,
  p_admin_id uuid
)
returns table (
  listing_type text,
  listing_id uuid,
  reporter_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_initial_claim public.feedback%rowtype;
  v_claim public.feedback%rowtype;
  v_listing_id uuid;
  v_listing_type text;
  v_now timestamptz := now();
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_admin_id
      and status = 'admin'
  ) then
    raise exception using message = 'ADMIN_REQUIRED', errcode = 'P0001';
  end if;

  select *
  into v_initial_claim
  from public.feedback
  where id = p_claim_id;

  if not found then
    raise exception using message = 'OWNERSHIP_CLAIM_NOT_FOUND', errcode = 'P0002';
  end if;

  if v_initial_claim.type <> 'ownership_claim'
    or v_initial_claim.reporter_id is null
    or (v_initial_claim.court_id is null) = (v_initial_claim.group_id is null)
  then
    raise exception using message = 'INVALID_OWNERSHIP_CLAIM', errcode = 'P0001';
  end if;

  if v_initial_claim.court_id is not null then
    v_listing_type := 'court';
    v_listing_id := v_initial_claim.court_id;

    perform 1
    from public.courts
    where id = v_listing_id
    for update;
  else
    v_listing_type := 'group';
    v_listing_id := v_initial_claim.group_id;

    perform 1
    from public.groups
    where id = v_listing_id
    for update;
  end if;

  if not found then
    raise exception using message = 'LISTING_NOT_FOUND', errcode = 'P0002';
  end if;

  select *
  into v_claim
  from public.feedback
  where id = p_claim_id
  for update;

  if not found then
    raise exception using message = 'OWNERSHIP_CLAIM_NOT_FOUND', errcode = 'P0002';
  end if;

  if v_claim.type <> 'ownership_claim'
    or v_claim.reporter_id is null
    or (v_claim.court_id is null) = (v_claim.group_id is null)
  then
    raise exception using message = 'INVALID_OWNERSHIP_CLAIM', errcode = 'P0001';
  end if;

  if v_claim.status in ('resolved', 'dismissed') then
    raise exception using message = 'CLAIM_ALREADY_CLOSED', errcode = 'P0001';
  end if;

  if v_claim.court_id is distinct from v_initial_claim.court_id
    or v_claim.group_id is distinct from v_initial_claim.group_id
  then
    raise exception using message = 'CLAIM_CHANGED_RETRY', errcode = 'P0001';
  end if;

  if v_listing_type = 'court' then
    update public.courts
    set created_by = v_claim.reporter_id,
        updated_at = v_now
    where id = v_listing_id;
  else
    update public.groups
    set owner_id = v_claim.reporter_id,
        updated_at = v_now
    where id = v_listing_id;
  end if;

  update public.feedback
  set status = 'resolved',
      checked = true,
      handled_by = p_admin_id,
      resolution_note = 'Ownership verified and assigned to the reporter.',
      updated_at = v_now
  where id = p_claim_id;

  update public.feedback
  set status = 'dismissed',
      checked = true,
      handled_by = p_admin_id,
      resolution_note = 'Another verified ownership claim was approved for this listing.',
      updated_at = v_now
  where id <> p_claim_id
    and type = 'ownership_claim'
    and status in ('open', 'in_review')
    and (
      (v_listing_type = 'court' and court_id = v_listing_id)
      or (v_listing_type = 'group' and group_id = v_listing_id)
    );

  return query
  select v_listing_type, v_listing_id, v_claim.reporter_id;
end;
$$;

revoke execute on function public.approve_listing_ownership_claim(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.approve_listing_ownership_claim(uuid, uuid)
to service_role;
