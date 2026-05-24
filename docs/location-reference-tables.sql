-- Thailand location normalization for courts.
--
-- Purpose:
-- 1. Keep provinces and districts as canonical Thailand-specific lookup tables.
-- 2. Let public/app clients read those tables safely under RLS.
-- 3. Keep courts.address as the readable location snapshot while courts.province_id
--    and courts.district_id become the normalized geography references.
--
-- Official seed source for the next step:
-- - https://stat.bora.dopa.go.th/stat/statnew/statMenu/newStat/ccaa/
-- - https://stat.bora.dopa.go.th/dload/ccaatt.xlsx
--
-- Intended migration preconditions:
-- - public.provinces and public.districts already exist or will be created here
-- - public.courts already has province_id and district_id columns
-- - public.provinces and public.districts are still empty before switching to official IDs
-- - no courts have province_id or district_id populated yet
--
-- Design choice:
-- - use official DOPA/BORA administrative codes as the primary keys
-- - provinces.id = 2-digit province code
-- - districts.id = 4-digit district code
-- - districts.province_id = 2-digit province code

begin;

create table if not exists public.provinces (
  id smallint primary key,
  name_th text not null,
  name_en text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.districts (
  id integer primary key,
  province_id smallint not null references public.provinces(id) on update cascade on delete restrict,
  name_th text not null,
  name_en text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (select 1 from public.provinces limit 1) then
    raise exception 'public.provinces must be empty before switching ids to official DOPA codes';
  end if;

  if exists (select 1 from public.districts limit 1) then
    raise exception 'public.districts must be empty before switching ids to official DOPA codes';
  end if;
end $$;

alter table public.provinces
  alter column id drop identity if exists;

alter table public.districts
  alter column id drop identity if exists;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'provinces_name_th_unique'
      and conrelid = 'public.provinces'::regclass
  ) then
    alter table public.provinces
      add constraint provinces_name_th_unique unique (name_th);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'provinces_name_en_unique'
      and conrelid = 'public.provinces'::regclass
  ) then
    alter table public.provinces
      add constraint provinces_name_en_unique unique (name_en);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'districts_name_th_per_province_unique'
      and conrelid = 'public.districts'::regclass
  ) then
    alter table public.districts
      add constraint districts_name_th_per_province_unique
      unique (province_id, name_th);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'districts_name_en_per_province_unique'
      and conrelid = 'public.districts'::regclass
  ) then
    alter table public.districts
      add constraint districts_name_en_per_province_unique
      unique (province_id, name_en);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'districts_id_province_unique'
      and conrelid = 'public.districts'::regclass
  ) then
    alter table public.districts
      add constraint districts_id_province_unique
      unique (id, province_id);
  end if;
end $$;

create index if not exists districts_province_idx
  on public.districts (province_id);

create index if not exists provinces_name_th_idx
  on public.provinces (name_th);

create index if not exists provinces_name_en_idx
  on public.provinces (lower(name_en));

create index if not exists districts_name_th_idx
  on public.districts (name_th);

create index if not exists districts_name_en_idx
  on public.districts (province_id, lower(name_en));

alter table public.provinces enable row level security;
alter table public.districts enable row level security;

grant select on public.provinces to anon, authenticated;
grant select on public.districts to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'provinces'
      and policyname = 'public can read provinces'
  ) then
    create policy "public can read provinces"
      on public.provinces
      for select
      to public
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'districts'
      and policyname = 'public can read districts'
  ) then
    create policy "public can read districts"
      on public.districts
      for select
      to public
      using (true);
  end if;
end $$;

comment on table public.provinces is
  'Canonical Thailand provinces for normalized court geography.';

comment on table public.districts is
  'Canonical Thailand districts linked to provinces for normalized court geography.';

comment on column public.provinces.id is
  'Official DOPA/BORA 2-digit province code.';

comment on column public.districts.id is
  'Official DOPA/BORA 4-digit district code.';

comment on column public.districts.province_id is
  'Official DOPA/BORA 2-digit province code for the parent province.';

comment on column public.courts.province_id is
  'Normalized province reference derived from the selected Google place.';

comment on column public.courts.district_id is
  'Normalized district reference derived from the selected Google place.';

commit;

-- Next step after this schema hardening:
-- 1. Seed all Thailand provinces into public.provinces.
-- 2. Seed all Thailand districts into public.districts.
-- 3. Backfill courts.province_id and courts.district_id from existing
--    google_place_id or lat/lng.
-- 4. Remove manual district/province entry from the court form.
