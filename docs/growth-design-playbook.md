# Growth + Design Playbook (Public Funnel)

## KPI

Primary KPI for this milestone:

- `weekly_new_content_supply`
  - Definition: total new published records per week across:
    - `courts`
    - `groups`
    - `community_posts`

Suggested weekly report snapshot:

- New courts created
- New groups created
- New community posts created
- Total = supply KPI

## Court Submission Policy

Policy key: `platform_settings.allow_public_court_publish`

- `true`:
  - Public `POST /api/courts` creates active courts (`is_active = true`).
  - Court appears immediately in finder/detail flows.
- `false`:
  - Public `POST /api/courts` creates pending courts (`is_active = false`).
  - Court is hidden from public finder/detail.
  - Admin reviews request in `/admin/courts` and either publishes or rejects.

Admin controls:

- Toggle location: `/admin` (Court Submission Policy card)
- Request moderation queue: `/admin/courts`

Fallback behavior:

- If `platform_settings` table is missing, runtime defaults to `true` (direct publish).
- Admin toggle API returns a setup error until table exists.

## Event Dictionary

All events use the payload convention:

```ts
{
  sport?: string;
  surface: string;
  cta?: string;
  courtId?: string;
}
```

Implemented events:

- `landing_cta_click`
  - Trigger: landing hero/sport-grid CTA clicks.
  - Example payload: `{ surface: "landing_hero", cta: "add_court" }`

- `sport_cta_click`
  - Trigger: sport page and finder header CTA clicks.
  - Example payload: `{ sport: "badminton", surface: "sport_hero", cta: "open_court_finder" }`

- `empty_state_cta_click`
  - Trigger: finder empty-state CTA clicks.
  - Example payload: `{ sport: "tennis", surface: "court_finder", cta: "add_court" }`

- `court_submit_started`
  - Trigger: public court form submit initiated.
  - Example payload: `{ sport: "<sportId>", surface: "public_court_form" }`

- `court_submit_success`
  - Trigger: public court form successfully persisted (both direct publish and pending request mode).
  - Example payload: `{ sport: "<sportId>", surface: "public_court_form", courtId: "<uuid>" }`

- `group_submit_success`
  - Trigger: group creation success.
  - Example payload: `{ sport: "<sportId>", surface: "group_create", cta: "create_group" }`

- `finder_filter_used`
  - Trigger: finder filter interactions (search/day/province/time/nearby/reset).
  - Example payload: `{ sport: "padel", surface: "group_finder", cta: "day" }`

## Weekly Operating Checklist

1. Pull weekly KPI numbers from Supabase (courts/groups/posts).
2. Check event volume trends:
   - `landing_cta_click`
   - `sport_cta_click`
   - `empty_state_cta_click`
3. Compare funnel shape:
   - CTA click volume vs `court_submit_started`
   - `court_submit_started` vs `court_submit_success`
4. Review top sports by contribution volume.
5. If policy mode is request-only, review moderation queue age and publish/reject SLA.
6. List blocker patterns from failed submissions or feedback.
7. Publish one weekly action list:
   - CTA copy/placement experiments
   - Finder empty-state messaging changes
   - Sport-page hero adjustments

## Release QA Checklist

1. Public court flow:
   - Logged-out user opening `/courts/new` is redirected to login.
   - Authenticated non-manager can submit a court.
   - Toggle ON: new court appears in sport court finder and detail page.
   - Toggle OFF: new court is pending (`is_active = false`) and hidden from public listing.

2. Existing admin/dashboard regression:
   - Admin court create still works (`/admin/courts`).
   - Admin can publish/reject pending requests in `/admin/courts`.
   - Dashboard court manager create still works (`/dashboard/courts/new`).
   - Court photo + line QR upload/update flow still works.

3. Event validation:
   - Every event in dictionary fires at expected interaction point.
   - Payload includes correct `surface` and `sport` where applicable.

4. SEO checks:
   - `/sitemap.xml` includes `/{sport}/board` URLs.
   - Canonical + language alternates still render for public pages.

5. Responsive checks:
   - `/`, `/[sport]`, `/[sport]/court-finder`, `/[sport]/group-finder`
   - Verify mobile and desktop layout integrity.

## DB + RLS Fallback (Only if Needed)

Create policy storage for admin toggle:

```sql
create table if not exists public.platform_settings (
  key text primary key,
  enabled boolean,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz default now()
);

alter table public.platform_settings enable row level security;
```

If public `POST /api/courts` fails due insert policy, add a minimal authenticated insert policy:

```sql
create policy "Authenticated users can insert courts"
on public.courts
for insert
to authenticated
with check (auth.uid() = created_by);
```

Keep update ownership enforcement as-is.
