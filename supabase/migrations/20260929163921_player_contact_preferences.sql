-- profile_sports already has owner-only SELECT/INSERT/UPDATE RLS.
-- The server exposes only contacts permitted by the owner; never put these on public profiles.
alter table public.profile_sports
  add column if not exists contact_methods jsonb not null default '{}'::jsonb,
  add column if not exists contact_visibility text not null default 'private'
    check (contact_visibility in ('private', 'public', 'accepted')),
  add column if not exists preferred_contact text
    check (preferred_contact in ('line', 'instagram', 'facebook', 'whatsapp', 'phone'));
