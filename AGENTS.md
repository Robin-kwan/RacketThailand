# AGENTS.md

## Project Snapshot

RacketThailand is a Thai-first multi-sport community platform for racket sports in Thailand. The live product centers on:

- court discovery
- group discovery
- one-off casual play listings
- sport-specific community boards
- profiles, notifications, and lightweight admin tooling

Supported sports in the current app:

- badminton
- padel
- pickleball
- tennis
- table tennis

Production entry points:

- `https://racketthailand.com`
- sport subdomains such as `https://badminton.racketthailand.com`

In local development, sport scope is represented by `/<sport>` routes rather than real subdomains.

## Stack

- Next.js App Router (`next@16`)
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase Auth + Postgres + Storage
- `next-intl` for Thai/English copy
- Vercel Analytics + Speed Insights
- Google Maps / Places for map and location flows

## Runbook

Install and run:

```bash
npm install
npm run dev
```

Useful commands:

- `npm run dev` starts the local app
- `npm run lint` is the main automated check currently available
- `npm run build` is the best pre-ship regression check when changes touch routing, metadata, or server components
- `npm run clean` removes `.next`

There is no dedicated automated test suite in this repository right now, so agents should rely on linting, builds, and targeted manual verification.

## Environment

Common variables used by the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAP_ID` (optional)
- `NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET`
- `NEXT_PUBLIC_SUPABASE_COURT_BUCKET`
- `NEXT_PUBLIC_SUPABASE_COURT_LINE_QR_BUCKET`
- `NEXT_PUBLIC_SUPABASE_GROUP_BUCKET`
- `NEXT_PUBLIC_SUPABASE_GROUP_LINE_QR_BUCKET`

Default storage bucket names used in code when env vars are absent:

- `avatars`
- `court-images`
- `court-line-qr`
- `group-images`
- `group-line-qr`

## Product Architecture

### Routing and Sport Context

- The root landing page is `src/app/page.tsx`.
- Sport portals live at `src/app/[sport]/page.tsx`.
- Public sport flows live under `src/app/[sport]/*`.
- `proxy.ts` rewrites supported sport subdomains to `/<sport>`.
- Supported sport codes are defined in `src/data/sportMeta.ts`.

Important implication: when adding a new sport, update both the route-facing metadata and the subdomain rewrite list.

### Locale Model

- Locale support is currently `th` and `en`.
- Thai is the default locale.
- Locale is controlled by the `?lang=` query string, not a URL prefix.
- Shared helpers live in `src/lib/i18n.ts`.
- Copy lives in `src/messages/th.json` and `src/messages/en.json`.

When adding user-facing text, update both locale files unless the change is intentionally temporary.

### Data and Auth

- Supabase is the system of record.
- Auth is shared across all sports and subdomains.
- Server-side Supabase access is typically done through helpers in `src/lib/supabase-server.ts` and `src/lib/supabase-admin.ts`.
- Many read flows use small server modules in `src/server/*`.

Core live data domains in the current repo:

- courts
- court photos
- groups
- group sessions
- casual plays
- community posts/comments/likes
- profiles
- notifications
- feedback
- admin moderation and deletion tools

The project summary mentions match tracking and scoreboards as product goals, but those are not a primary surfaced feature in the current route tree. Treat them as planned or partial unless the code you are touching proves otherwise.

## Current UX Direction

This codebase already has an established visual language. Preserve it unless the task explicitly asks for a redesign.

- Thai-first editorial landing and sport pages
- white surfaces on soft green atmospheric backgrounds
- shared green token system in `src/app/globals.css`
- reusable shell components such as `BaseCard`
- strong CTA hierarchy for content supply actions like adding courts and creating groups
- avoid decorative page kicker/subtitle labels such as `COMMUNITY • CASUAL PLAYS` or role chips above page titles unless the user explicitly asks for them

Prefer existing shared classes and components:

- `rt-card`
- `rt-pill`
- `rt-btn-primary`
- `rt-text-muted`
- `BaseCard`

Do not reintroduce hard-coded one-off color systems when an existing token already fits.

## Key User Flows

Public discovery:

- `/<sport>/court-finder`
- `/<sport>/group-finder`
- `/<sport>/casual-plays`
- `/<sport>/board`

Authenticated contribution:

- `/courts/new`
- `/groups/create`
- `/casual-plays/create`
- `/profile/edit`

Admin and operational flows:

- `/admin`
- `/admin/courts`
- `/admin/groups`
- `/admin/casual-plays`
- `/admin/feedback`
- `/admin/court-owners`

If you change one of these flows, verify both the page UI and the backing API route.

## Analytics and Growth

This product is optimized around increasing weekly content supply. Existing event names include:

- `landing_cta_click`
- `sport_cta_click`
- `empty_state_cta_click`
- `court_submit_started`
- `court_submit_success`
- `group_submit_success`
- `finder_filter_used`

If you add or move a major CTA in landing, sport, court finder, or group finder surfaces, check whether an analytics event should be preserved or updated.

## SEO and Canonicals

- Canonical URL helpers live in `src/lib/seo.ts`.
- Metadata is generated in route files, often with locale-aware canonical URLs.
- `NEXT_PUBLIC_SITE_URL` falls back to `https://racketthailand.com`.
- Sitemap and robots are implemented in `src/app/sitemap.ts` and `src/app/robots.ts`.

When adding a public route, think about:

- canonical URL
- alternate language URLs
- crawlability
- structured data if the route represents a court or group detail page

## Working Conventions for Agents

### Before Editing

Read the nearest relevant files first. In this repo that usually means:

1. route file in `src/app/...`
2. corresponding component in `src/components/...`
3. data/server helper in `src/server/...`
4. shared helpers in `src/lib/...`

### When Making Changes

- preserve Thai-default behavior
- preserve subdomain-aware sport scoping
- reuse base components before adding new primitives
- prefer extending existing server helpers over duplicating Supabase queries inline
- keep public copy aligned across Thai and English
- keep analytics payload shapes consistent with existing usage

### When Touching Supabase-Backed Features

Check for all of the following:

- auth requirements
- RLS assumptions
- storage bucket names
- locale copy
- optimistic vs server-rendered refresh behavior
- whether the route is public, authenticated, or admin-only

### When Touching Finder Pages

Be careful not to regress:

- query-param driven filters
- map behavior
- empty states and their CTAs
- analytics events
- SEO metadata

### When Touching Auth or Recovery Flows

Review `proxy.ts` carefully. It contains:

- sport subdomain rewrites
- auth-page redirects for signed-in users
- recovery-flow cookie handling and redirects

## Verification Checklist

Pick the subset that matches your change:

1. Run `npm run lint`.
2. Run `npm run build` for route, metadata, or server changes.
3. Check the relevant public page in both Thai default and `?lang=en`.
4. Check mobile and desktop layout for visible UI changes.
5. Confirm links preserve sport scope and locale.
6. Confirm forms still work for the correct auth state.
7. Confirm admin-only actions still require admin access.
8. Confirm analytics hooks still fire at the edited interaction points.

## Useful Reference Files

- `README.md`
- `RacketThailand_Project_Summary.md`
- `docs/growth-design-playbook.md`
- `src/data/sportMeta.ts`
- `src/lib/i18n.ts`
- `src/lib/seo.ts`
- `src/app/globals.css`
- `proxy.ts`

## Practical Notes

- The repository may contain mojibake in some checked-in text output when viewed in terminals with mismatched encoding. Do not blindly "fix" all text at once unless the task is specifically about encoding.
- Prefer minimal, targeted edits. A large visual or copy sweep can easily create Thai/English drift.
- If a feature appears in the project summary but not in the route tree, trust the codebase over the summary for current implementation status.
