-- Player Finder MVP: sport profiles, weekly availability, play requests,
-- and group-owner invitations.

alter table public.profile_sports
  add column if not exists rating_system text,
  add column if not exists rating_value numeric(4, 2),
  add column if not exists area text,
  add column if not exists availability_days text[] not null default '{}',
  add column if not exists time_preference text,
  add column if not exists play_format text not null default 'either',
  add column if not exists looking_note text,
  add column if not exists looking_until timestamptz,
  add column if not exists allow_group_invites boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profile_sports
  drop constraint if exists profile_sports_rating_value_check,
  add constraint profile_sports_rating_value_check
    check (rating_value is null or (rating_value >= 0 and rating_value <= 10)),
  drop constraint if exists profile_sports_time_preference_check,
  add constraint profile_sports_time_preference_check
    check (
      time_preference is null or
      time_preference in ('morning', 'afternoon', 'evening', 'flexible')
    ),
  drop constraint if exists profile_sports_play_format_check,
  add constraint profile_sports_play_format_check
    check (play_format in ('single', 'double', 'either'));

create index if not exists profile_sports_active_finder_idx
  on public.profile_sports (sport_id, looking_until desc)
  where looking_until is not null;

create index if not exists profile_sports_area_idx
  on public.profile_sports (sport_id, area);

create table if not exists public.player_play_requests (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_play_requests_people_check check (sender_id <> recipient_id),
  constraint player_play_requests_status_check
    check (status in ('pending', 'accepted', 'declined', 'cancelled'))
);

create unique index if not exists player_play_requests_pending_unique
  on public.player_play_requests (sport_id, sender_id, recipient_id)
  where status = 'pending';

create index if not exists player_play_requests_recipient_idx
  on public.player_play_requests (recipient_id, status, created_at desc);

create index if not exists player_play_requests_sender_idx
  on public.player_play_requests (sender_id, status, created_at desc);

create table if not exists public.player_group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_group_invitations_status_check
    check (status in ('pending', 'accepted', 'declined', 'cancelled'))
);

create unique index if not exists player_group_invitations_pending_unique
  on public.player_group_invitations (group_id, recipient_id)
  where status = 'pending';

create index if not exists player_group_invitations_recipient_idx
  on public.player_group_invitations (recipient_id, status, created_at desc);

create index if not exists player_group_invitations_group_idx
  on public.player_group_invitations (group_id, status, created_at desc);

create index if not exists player_group_invitations_invited_by_idx
  on public.player_group_invitations (invited_by, created_at desc);

alter table public.profile_sports enable row level security;
alter table public.player_play_requests enable row level security;
alter table public.player_group_invitations enable row level security;

-- The project already has owner-scoped profile_sports policies. Remove names
-- used by early Player Finder drafts so the policies are not evaluated twice.
drop policy if exists "Player sport profiles are discoverable" on public.profile_sports;
drop policy if exists "Players create their sport profiles" on public.profile_sports;
drop policy if exists "Players update their sport profiles" on public.profile_sports;
drop policy if exists "Players delete their sport profiles" on public.profile_sports;

drop policy if exists "Profile sports are viewable by owner" on public.profile_sports;
create policy "Profile sports are viewable by owner"
  on public.profile_sports for select
  to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "Profile sports insert by owner" on public.profile_sports;
create policy "Profile sports insert by owner"
  on public.profile_sports for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists "Profile sports update by owner" on public.profile_sports;
create policy "Profile sports update by owner"
  on public.profile_sports for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists "Profile sports delete by owner" on public.profile_sports;
create policy "Profile sports delete by owner"
  on public.profile_sports for delete
  to authenticated
  using ((select auth.uid()) = profile_id);

drop policy if exists "Request participants can read requests" on public.player_play_requests;
create policy "Request participants can read requests"
  on public.player_play_requests for select
  to authenticated
  using (
    (select auth.uid()) = sender_id or
    (select auth.uid()) = recipient_id
  );

drop policy if exists "Players can send requests" on public.player_play_requests;
create policy "Players can send requests"
  on public.player_play_requests for insert
  to authenticated
  with check ((select auth.uid()) = sender_id);

drop policy if exists "Invitation participants can read invitations" on public.player_group_invitations;
create policy "Invitation participants can read invitations"
  on public.player_group_invitations for select
  to authenticated
  using (
    (select auth.uid()) = recipient_id or
    (select auth.uid()) = invited_by
  );

grant select, insert, update, delete on public.profile_sports to authenticated;
grant select on public.profile_sports to anon;
grant select, insert on public.player_play_requests to authenticated;
grant select on public.player_group_invitations to authenticated;
grant all on public.player_play_requests to service_role;
grant all on public.player_group_invitations to service_role;
