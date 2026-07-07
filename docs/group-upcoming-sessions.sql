-- Group upcoming sessions for rotating-venue groups.
--
-- Use this when a stable group does not play at the same court every week
-- but publishes a dated schedule of upcoming sessions around a city.

create table if not exists public.group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  court_id uuid references public.courts(id) on delete set null,
  venue_name text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_events_location_check check (
    court_id is not null or nullif(btrim(coalesce(venue_name, '')), '') is not null
  ),
  constraint group_events_time_check check (
    ends_at is null or ends_at > starts_at
  )
);

create index if not exists group_events_group_starts_idx
  on public.group_events(group_id, starts_at);

create index if not exists group_events_court_starts_idx
  on public.group_events(court_id, starts_at)
  where court_id is not null;

create index if not exists group_events_starts_idx
  on public.group_events(starts_at);

alter table public.group_events enable row level security;

revoke insert, update, delete, truncate, references, trigger
  on public.group_events
  from anon, authenticated;

grant select on public.group_events to anon, authenticated;
grant select, insert, update, delete on public.group_events to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_events'
      and policyname = 'public can read published group events'
  ) then
    create policy "public can read published group events"
      on public.group_events
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.groups
          where groups.id = group_events.group_id
            and groups.status = 'published'
        )
      );
  end if;
end $$;
