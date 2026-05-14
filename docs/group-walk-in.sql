alter table public.groups
  add column if not exists allow_walk_in boolean;

update public.groups
set allow_walk_in = true
where allow_walk_in is null;

alter table public.groups
  alter column allow_walk_in set default true,
  alter column allow_walk_in set not null;
