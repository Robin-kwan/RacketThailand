drop policy if exists "Tournament organizers follow tournament visibility" on public.tournament_organizers;
drop policy if exists "Owners insert tournament organizers" on public.tournament_organizers;
drop policy if exists "Owners update tournament organizers" on public.tournament_organizers;
drop policy if exists "Owners delete tournament organizers" on public.tournament_organizers;

drop policy if exists "Tournament photos follow tournament visibility" on public.tournament_photos;
drop policy if exists "Owners insert tournament photos" on public.tournament_photos;
drop policy if exists "Owners update tournament photos" on public.tournament_photos;
drop policy if exists "Owners delete tournament photos" on public.tournament_photos;

drop policy if exists "Tournament groups follow tournament visibility" on public.tournament_groups;
drop policy if exists "Owners insert tournament groups" on public.tournament_groups;
drop policy if exists "Owners update tournament groups" on public.tournament_groups;
drop policy if exists "Owners delete tournament groups" on public.tournament_groups;

create index if not exists tournaments_owner_id_idx on public.tournaments (owner_id);
create index if not exists tournaments_court_id_idx on public.tournaments (court_id);
create index if not exists tournament_organizers_group_id_idx on public.tournament_organizers (group_id);
create index if not exists tournament_groups_group_id_idx on public.tournament_groups (group_id);
