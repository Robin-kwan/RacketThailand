-- Adds multi-sport support for courts.

create table if not exists public.court_sports (
  court_id uuid not null references public.courts(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (court_id, sport_id)
);

create index if not exists court_sports_sport_id_idx
  on public.court_sports (sport_id);

create index if not exists court_sports_court_id_idx
  on public.court_sports (court_id);

insert into public.court_sports (court_id, sport_id)
select id, sport_id
from public.courts
where sport_id is not null
on conflict (court_id, sport_id) do nothing;
