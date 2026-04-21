# RacketThailand Frontend

This Next.js 16 app powers `racketthailand.com` and all sport subdomains (for example `badminton.racketthailand.com`, `padel.racketthailand.com`).

The platform uses one Supabase project for all sports, with sport context selected by subdomain in production (or `/[sport]` path in local/dev).

## App Structure

- `/`: Public landing page.
- `/[sport]`: Public sport portal.
- `/[sport]/court-finder`: Public court discovery.
- `/[sport]/group-finder`: Public group discovery.
- `/[sport]/board`: Public community board by sport.
- `/courts/new`: Authenticated public court submission form (publish mode follows admin policy toggle).
- `/groups/create`: Authenticated group creation form.
- `/admin`: Admin dashboard with court submission mode toggle.
- `/admin/courts`: Admin court tools plus pending court request moderation queue.
- `/api/sports/[code]`: Aggregated sport payload for reusable clients.
- `/api/courts`:
  - `GET`: Filtered court finder data.
  - `POST`: Authenticated public court creation (direct publish or pending review by policy).

## Growth Milestone (Implemented)

This release focuses on weekly content supply growth.

- Public funnel redesign for `/`, `/[sport]`, finder pages, shared header/footer.
- New public court submission flow (`/courts/new`) using existing court form stack.
- Policy-based public court API (`POST /api/courts`) for authenticated users.
- Admin toggle and moderation queue for court submissions:
  - Toggle ON: user submissions publish immediately.
  - Toggle OFF: user submissions are created as pending (`is_active = false`) and require admin publish/reject.
- Stronger CTA placement across landing, sport hero, finder headers, and empty states.
- SEO update: sport board routes included in sitemap.
- Vercel analytics conversion events added:
  - `landing_cta_click`
  - `sport_cta_click`
  - `empty_state_cta_click`
  - `court_submit_started`
  - `court_submit_success`
  - `group_submit_success`
  - `finder_filter_used`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.local.example .env.local
```

3. Required environment variables:

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key for map/places features |

4. Run dev server:

```bash
npm run dev
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Localization

- `next-intl` with messages in `src/messages/{locale}.json`.
- Locale is controlled by `?lang=` query parameter.
- Thai (`th`) is default.

## Notes

- Court publishing policy is controlled by `platform_settings.allow_public_court_publish`.
- If `platform_settings` does not exist, the app falls back to direct publish mode (`true`).
- Existing court RLS should allow authenticated inserts to `courts` (`created_by = auth.uid()` pattern).
- Admin and dashboard court-management flows remain unchanged.

### Optional SQL setup for policy toggle

Run this once to persist the admin toggle state:

```sql
create table if not exists public.platform_settings (
  key text primary key,
  enabled boolean,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz default now()
);

alter table public.platform_settings enable row level security;
```
