create table if not exists public.casual_plays (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete cascade,
  court_id uuid references public.courts(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  venue_name text,
  location_note text,
  play_date date not null,
  start_time time not null,
  end_time time,
  play_format text not null default 'double',
  player_amount integer,
  phone text,
  line_id text,
  allow_public_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint casual_plays_positive_players_check
    check (player_amount is null or player_amount > 0),
  constraint casual_plays_venue_check
    check (court_id is not null or venue_name is not null),
  constraint casual_plays_time_order_check
    check (end_time is null or end_time > start_time),
  constraint casual_plays_play_format_check
    check (play_format in ('single', 'double'))
);

alter table public.casual_plays
  alter column court_id drop not null,
  alter column end_time drop not null,
  add column if not exists venue_name text,
  add column if not exists location_note text,
  add column if not exists play_format text not null default 'double',
  add column if not exists allow_public_contact boolean not null default false;

alter table public.casual_plays
  drop constraint if exists casual_plays_play_format_check,
  add constraint casual_plays_play_format_check
    check (play_format in ('single', 'double'));

alter table public.casual_plays
  drop constraint if exists casual_plays_time_order_check,
  add constraint casual_plays_time_order_check
    check (end_time is null or end_time > start_time);

alter table public.casual_plays
  drop constraint if exists casual_plays_venue_check,
  add constraint casual_plays_venue_check
    check (court_id is not null or venue_name is not null);

create index if not exists casual_plays_sport_date_idx
  on public.casual_plays (sport_id, play_date, start_time);

create index if not exists casual_plays_owner_idx
  on public.casual_plays (owner_id, play_date desc);

create table if not exists public.casual_play_join_requests (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references public.casual_plays(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  contact_name text,
  phone text,
  line_id text,
  message text,
  status text not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint casual_play_join_requests_status_check
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  constraint casual_play_join_requests_contact_check
    check (phone is not null or line_id is not null),
  constraint casual_play_join_requests_unique_requester
    unique (play_id, requester_id)
);

create index if not exists casual_play_join_requests_play_status_idx
  on public.casual_play_join_requests (play_id, status, created_at desc);

create index if not exists casual_play_join_requests_requester_idx
  on public.casual_play_join_requests (requester_id, created_at desc);
