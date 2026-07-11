# RacketThailand.com - Project Summary

RacketThailand is a Thai-first multi-sport community platform for racket sports in Thailand.

Supported sports:
- Badminton
- Padel
- Pickleball
- Tennis
- Table Tennis

Production entry points:
- `https://racketthailand.com`
- `https://badminton.racketthailand.com`
- `https://padel.racketthailand.com`
- `https://pickleball.racketthailand.com`
- `https://tennis.racketthailand.com`
- `https://tabletennis.racketthailand.com`

All sports share:
- one Supabase project
- one Supabase Auth system
- one Postgres database
- one Next.js application

In local development, sport scope is represented by `/<sport>` routes. In production, `proxy.ts` rewrites supported sport subdomains to the matching `/<sport>` route.

## Current Product Surface

Current public discovery flows:
- Landing page: `/`
- Sport portal: `/<sport>`
- Court finder: `/<sport>/court-finder`
- Group finder: `/<sport>/group-finder`
- Casual plays: `/<sport>/casual-plays`
- Community board: `/<sport>/board`
- Court detail: `/courts/[courtId]`
- Group detail: `/groups/[groupId]`
- Casual play detail: `/casual-plays/[playId]`

Current contribution and account flows:
- Public court submission: `/courts/new`
- Group creation: `/groups/create`
- Casual play creation: `/casual-plays/create`
- Profile edit: `/profile/edit`
- Notifications: `/notifications`

Current admin and operations flows:
- `/admin`
- `/admin/courts`
- `/admin/groups`
- `/admin/group-imports`
- `/admin/groups/import`
- `/admin/casual-plays`
- `/admin/feedback`
- `/admin/court-owners`

Planned or schema-only areas:
- Match tracking and scoreboards have database tables, but no primary surfaced product route yet.
- Multi-sport profile preferences have a `profile_sports` table, but the surfaced product flow is still limited.
- `group_events` supports dated upcoming group sessions.

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS with shared RacketThailand tokens in `src/app/globals.css`
- Data/Auth/Storage: Supabase Auth, Postgres, Storage
- Internationalization: `next-intl`
- Maps/Places: Google Maps and Places APIs
- Analytics: Vercel Analytics and Speed Insights

## Locale Model

- Supported locales: Thai (`th`) and English (`en`)
- Thai is the default locale.
- Locale is controlled by the `?lang=` query string, not a URL prefix.
- Copy lives in `src/messages/th.json` and `src/messages/en.json`.
- Shared locale helpers live in `src/lib/i18n.ts`.

## Sport Model

Sports are defined in `public.sports` and by route metadata in `src/data/sportMeta.ts`.

Current sport codes:
- `badminton`
- `padel`
- `pickleball`
- `tennis`
- `tabletennis`

Most sport-scoped records reference `sports.id` through `sport_id`.

Court sport scoping is more flexible: courts can be linked to one or more sports through `court_sports`. Older summary language that described court finder as only `courts.sport_id` is stale.

## Storage Buckets

Default bucket names used by the app:
- `avatars`
- `court-images`
- `court-line-qr`
- `group-images`
- `group-line-qr`

The summary previously mentioned `community-images`; the current app does not expose a mature community image upload flow around that bucket.

## Key Database Entities

### `sports`

Defines supported sports.

Important columns:
- `id`
- `code`
- `name`
- `created_at`

### `profiles`

Represents app users and admin/court-management access.

Important columns:
- `id`
- `username`
- `display_name`
- `bio`
- `default_sport`
- `location`
- `avatar_url`
- `status`
- `created_at`

Common `status` values are `member` and `admin`. Some app code also checks `court_manager` for court-management access, so keep that distinction in mind before changing access rules.

### `profile_sports`

Stores optional per-sport user preferences and skill information.

Important columns:
- `profile_id`
- `sport_id`
- `skill_level`
- `preference`
- `is_primary`
- `created_at`

Current status: schema exists, but the surfaced product flow is still limited.

### `courts`

Represents venues across Thailand.

Important columns:
- `id`
- `name`
- `description`
- `address`
- `district`
- `province`
- `district_id`
- `province_id`
- `lat`
- `lng`
- `google_place_id`
- `phone`
- `line_id`
- `line_qr_url`
- `website_url`
- `price_note`
- `opening_hours`
- `is_active`
- `created_by`
- `created_at`
- `updated_at`

Court finder filters active courts by sport through `court_sports`, plus province/district/location filters.

### `court_sports`

Join table for multi-sport courts.

Important columns:
- `court_id`
- `sport_id`
- `created_at`

Composite primary key:
- `court_id`
- `sport_id`

### `court_photos`

Stores court images.

Important columns:
- `id`
- `court_id`
- `image_url`
- `is_primary`
- `created_at`

### `groups`

Represents recurring player groups and clubs.

Important columns:
- `id`
- `sport_id`
- `name`
- `description`
- `owner_id`
- `player_amount`
- `phone`
- `line_id`
- `line_qr_url`
- `website_url`
- `rating_system`
- `rating_min`
- `rating_max`
- `play_format`
- `allow_walk_in`
- `status`
- `created_at`
- `updated_at`

`status` controls public visibility:
- `published` groups appear in public finder/detail pages.
- `draft` groups are hidden from public discovery until admin publishes them.

### `group_photos`

Stores group images.

Important columns:
- `id`
- `group_id`
- `image_url`
- `is_primary`
- `created_at`

### `group_sessions`

Stores recurring weekly group sessions.

Important columns:
- `id`
- `group_id`
- `court_id`
- `day`
- `weekday`
- `start_time`
- `end_time`
- `note`
- `created_at`
- `updated_at`

The app mostly works with `day` names such as `monday` and `tuesday`. The database also has `weekday` for numeric weekday support.

### `group_events`

Stores dated upcoming group sessions.

Important columns:
- `id`
- `group_id`
- `court_id`
- `venue_name`
- `starts_at`
- `ends_at`
- `notes`
- `created_by`
- `created_at`
- `updated_at`

Current product use:
- Group forms can manage dated events.
- Group finder date filtering can match either recurring weekly sessions or dated events.
- Court detail can show upcoming group events at that court when data exists.

### `court_groups`

Links groups to courts and tracks verification by court/admin.

Important columns:
- `id`
- `court_id`
- `group_id`
- `verification_status`
- `verified_by`
- `verified_at`
- `note`
- `created_at`

Verification statuses:
- `pending`
- `verified`
- `rejected`

### `casual_plays`

Stores one-off play listings.

Important columns:
- `id`
- `sport_id`
- `court_id`
- `owner_id`
- `title`
- `description`
- `venue_name`
- `location_note`
- `play_date`
- `start_time`
- `end_time`
- `player_amount`
- `phone`
- `line_id`
- `allow_public_contact`
- `rating_system`
- `rating_min`
- `rating_max`
- `play_format`
- `created_at`
- `updated_at`

App rules:
- Listings are created for a bounded upcoming date range in Thailand time.
- Public finder/detail routes exclude expired listings.
- Contact visibility can depend on listing settings and join-request status.

### `casual_play_join_requests`

Stores join requests for casual plays.

Important columns:
- `id`
- `play_id`
- `requester_id`
- `contact_name`
- `phone`
- `line_id`
- `message`
- `status`
- `responded_at`
- `created_at`
- `updated_at`

Statuses:
- `pending`
- `accepted`
- `rejected`
- `cancelled`

### `community_posts`

Stores sport-specific community board posts.

Important columns:
- `id`
- `sport_id`
- `author_id`
- `title`
- `body_text`
- `category`
- `status`
- `pinned`
- `attachments`
- `created_at`
- `updated_at`

Current route usage is based on `community_posts`, not the older `posts` table.

### `community_comments`

Stores comments on community posts.

Important columns:
- `id`
- `post_id`
- `author_id`
- `body_text`
- `parent_id`
- `created_at`
- `updated_at`

### `community_likes`

Stores one like per user/post.

Important columns:
- `post_id`
- `user_id`
- `created_at`

Composite primary key:
- `post_id`
- `user_id`

### `notifications`

Stores user notification history.

Important columns:
- `id`
- `recipient_id`
- `type`
- `message`
- `metadata`
- `read_at`
- `created_at`

Used for flows such as court-group requests, casual-play join requests, and feedback notifications.

### `feedback`

Stores general feedback, bug reports, feature ideas, and moderation/report context.

Important columns:
- `id`
- `reporter_id`
- `reported_profile_id`
- `sport_id`
- `group_id`
- `court_id`
- `match_id`
- `post_id`
- `type`
- `subject`
- `message`
- `status`
- `priority`
- `checked`
- `handled_by`
- `resolution_note`
- `created_at`
- `updated_at`

The landing feedback form and admin feedback inbox are part of the current app.

### Match Tables

The following tables exist but are not a primary surfaced product area yet:
- `matches`
- `match_participants`
- `match_games`

They are intended for future match tracking and scoreboards.

### Legacy Community Tables

The older `posts` and `comments` tables may still exist in the database, but current community board routes use:
- `community_posts`
- `community_comments`
- `community_likes`

Avoid building new community features on `posts`/`comments` unless intentionally migrating legacy data.

## Feature Mapping

- Court Finder: `courts`, `court_sports`, `court_photos`, `provinces`, `districts`
- Court Detail: `courts`, `court_photos`, `court_groups`, `group_sessions`, `group_events`
- Group Finder: `groups`, `group_photos`, `group_sessions`, `group_events`, `court_groups`
- Group Detail: `groups`, `group_photos`, `group_sessions`, `group_events`, `court_groups`
- Casual Plays: `casual_plays`, `casual_play_join_requests`
- Community Board: `community_posts`, `community_comments`, `community_likes`
- Notifications: `notifications`
- Feedback/Admin Inbox: `feedback`
- Future Match Tracking: `matches`, `match_participants`, `match_games`
- Profile Preferences: `profiles`, `profile_sports`

## Access Control Overview

RLS is enabled on the core public tables. App-level server code often uses:
- user-scoped Supabase clients for authenticated user actions
- the admin/service-role client for privileged admin operations
- small server modules in `src/server/*` for shared read and validation logic

Current access patterns:
- Public pages can read published/active discovery content.
- Authenticated users can submit courts, create groups, create casual plays, post to boards, submit feedback, and manage their own records.
- Admin users are identified through `profiles.status = 'admin'`.
- Some court-management paths also check for `profiles.status = 'court_manager'`; confirm the allowed profile status values before changing court-manager access rules.
- Draft groups and inactive courts are hidden from public discovery until published/activated.

## SEO and Growth

SEO support includes:
- localized metadata
- canonical URLs
- alternate language URLs where route code supports them
- sitemap coverage for sport portals, finder pages, detail pages, casual plays, and community board routes
- structured data on court and group detail pages

Important analytics events include:
- `landing_cta_click`
- `sport_cta_click`
- `empty_state_cta_click`
- `court_submit_started`
- `court_submit_success`
- `group_submit_success`
- `finder_filter_used`

## UI Direction

The current visual system is Thai-first, soft green, and card-based, with shared tokens in `src/app/globals.css`.

Preferred shared classes/components:
- `rt-card`
- `rt-pill`
- `rt-btn-primary`
- `rt-btn-court`
- `rt-btn-group`
- `rt-text-muted`
- `BaseCard`

CTA convention:
- Add Court CTAs use the black court button style.
- Create/Add Group CTAs use the blue group button style.

Avoid broad one-off redesigns unless the task explicitly asks for a redesign.

## Recent Implementation Notes

- Landing metadata and hero copy were updated to describe the site as a platform for courts, player groups, activities, and racket-sport communities across Thailand.
- Sport portal ordering now gives group discovery more priority than court discovery.
- Group Finder supports a calendar date filter. A selected date matches recurring weekly sessions on that weekday and dated `group_events` on that Thailand-local date.
- Group Finder still supports day, time, location/proximity, search, and nearby-group behavior.
- Court detail can show upcoming dated group sessions from `group_events` when future events exist for that court.
- Public court submissions can be immediately published or held pending based on the admin-controlled court submission policy.
- Admin group import tooling can create hidden draft groups and reuse existing courts/sessions/photos where possible.
- The Husky pre-commit hook runs lint, clean, and build to avoid stale Next.js cache path issues between PowerShell and Git shell.

## Practical Notes

- The database is the source of truth for production content, but the route tree is the source of truth for surfaced product features.
- Some schema exists ahead of the product UI. Do not assume a feature is live only because a table exists.
- When adding public routes, update canonical/alternate metadata and sitemap behavior.
- When adding user-facing text, update both Thai and English message files.
- When touching Supabase-backed features, check RLS assumptions, storage bucket names, auth state, and admin access rules.
