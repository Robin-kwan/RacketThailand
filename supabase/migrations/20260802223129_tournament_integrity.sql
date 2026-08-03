create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  court_id uuid not null references public.courts(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text not null check (length(btrim(description)) > 0),
  tournament_start_at timestamptz not null,
  tournament_end_at timestamptz not null,
  registration_url text,
  phone text,
  line_id text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tournament_end_at >= tournament_start_at)
);

create table if not exists public.tournament_organizers (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  organizer_name text,
  phone text,
  line_id text,
  website_url text,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  check (group_id is not null or length(btrim(coalesce(organizer_name, ''))) > 0)
);

create table if not exists public.tournament_photos (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_groups (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tournament_id, group_id)
);

create index if not exists tournaments_sport_status_dates_idx
  on public.tournaments (sport_id, status, tournament_start_at, tournament_end_at);
create index if not exists tournament_organizers_tournament_order_idx
  on public.tournament_organizers (tournament_id, display_order);
create index if not exists tournament_photos_tournament_idx
  on public.tournament_photos (tournament_id, created_at);

alter table public.tournaments enable row level security;
alter table public.tournament_organizers enable row level security;
alter table public.tournament_photos enable row level security;
alter table public.tournament_groups enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tournaments' and policyname = 'Published tournaments are public') then
    create policy "Published tournaments are public" on public.tournaments
      for select to anon, authenticated
      using (
        status = 'published'
        or owner_id = (select auth.uid())
        or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'admin')
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tournaments' and policyname = 'Users create own tournaments') then
    create policy "Users create own tournaments" on public.tournaments
      for insert to authenticated with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tournaments' and policyname = 'Owners update tournaments') then
    create policy "Owners update tournaments" on public.tournaments
      for update to authenticated
      using (owner_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'admin'))
      with check (owner_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tournaments' and policyname = 'Owners delete tournaments') then
    create policy "Owners delete tournaments" on public.tournaments
      for delete to authenticated
      using (owner_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'admin'));
  end if;
end $$;

do $$
declare
  child_table text;
begin
  foreach child_table in array array['tournament_organizers', 'tournament_photos', 'tournament_groups']
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = child_table and policyname = 'Tournament children follow visibility') then
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (exists (select 1 from public.tournaments t where t.id = tournament_id))',
        'Tournament children follow visibility', child_table
      );
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = child_table and policyname = 'Owners manage tournament children') then
      execute format(
        'create policy %I on public.%I for all to authenticated using (exists (select 1 from public.tournaments t where t.id = tournament_id and (t.owner_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = ''admin'')))) with check (exists (select 1 from public.tournaments t where t.id = tournament_id and (t.owner_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = ''admin''))))',
        'Owners manage tournament children', child_table
      );
    end if;
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tournament-images',
  'tournament-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.update_tournament_with_organizers(
  p_tournament_id uuid,
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
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_organizers) <> 'array' or jsonb_array_length(p_organizers) = 0 then
    raise exception 'At least one organizer is required.';
  end if;

  update public.tournaments
  set sport_id = p_sport_id,
      court_id = p_court_id,
      name = p_name,
      description = p_description,
      tournament_start_at = p_tournament_start_at,
      tournament_end_at = p_tournament_end_at,
      registration_url = p_registration_url,
      phone = p_phone,
      line_id = p_line_id,
      updated_at = now()
  where id = p_tournament_id;

  if not found then
    raise exception 'Tournament not found.';
  end if;

  delete from public.tournament_organizers
  where tournament_id = p_tournament_id;

  insert into public.tournament_organizers (
    tournament_id, group_id, organizer_name, phone, line_id, website_url, display_order
  )
  select
    p_tournament_id,
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
end;
$$;

revoke execute on function public.update_tournament_with_organizers(
  uuid, uuid, uuid, text, text, timestamptz, timestamptz, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.update_tournament_with_organizers(
  uuid, uuid, uuid, text, text, timestamptz, timestamptz, text, text, text, jsonb
) to service_role;
