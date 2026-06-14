alter table public.groups
  add column if not exists status text;

update public.groups
set status = 'published'
where status is null;

alter table public.groups
  alter column status set default 'published',
  alter column status set not null;

alter table public.groups
  drop constraint if exists groups_status_check;

alter table public.groups
  add constraint groups_status_check
  check (status in ('draft', 'published'));

comment on column public.groups.status is
  'Publication state for group listings. Draft groups stay hidden from public finder/detail pages until published by admin.';
