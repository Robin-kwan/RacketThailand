alter table public.groups
  add column if not exists website_url text;

comment on column public.groups.website_url is
  'Optional public website or social URL for a community group.';
