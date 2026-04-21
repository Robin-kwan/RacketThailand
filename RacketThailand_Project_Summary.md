# RacketThailand.com – Project Summary

RacketThailand is a multi-sport community platform focused on **racket sports in Thailand**, including:
- Badminton
- Padel
- Pickleball
- Tennis
- Table Tennis

The main domain is:
- `racketthailand.com`

There are sport-specific subdomains like:
- `badminton.racketthailand.com`
- `padel.racketthailand.com`
- `pickleball.racketthailand.com`
- `tennis.racketthailand.com`
- `tabletennis.racketthailand.com`

All subdomains share:
- One **Supabase project**
- One **Auth system**
- One **Postgres database**

UI/UX principle: Prefer reusable **base components** (shared inputs, selects, buttons, cards) across all sports to keep styling and behavior consistent.

Common storage buckets (public):
- `avatars` (profile pictures)
- `court-images`, `group-images`
- `community-images` (community board uploads – configure via `NEXT_PUBLIC_SUPABASE_COMMUNITY_BUCKET` if the name changes)
The sport context is determined by subdomain and mapped to a `sports` row using `code` (e.g. `'badminton'`).

## Core Goals

1. Help players **find courts**, **groups**, and **matches** for racket sports in Thailand.
2. Provide a **sport-specific community board** for questions, posts, news, and reviews.
3. Provide a **scoreboard and match tracking** system.
4. Allow **multi-sport profiles** with per-sport skill levels.
5. Collect **feedback and reports** from users (about the platform or other users).

The project starts as a **web-first** product (Next.js + Supabase). A mobile app may be added later.

## Tech Stack (high level)

- **Frontend**: Next.js (App Router, TypeScript, Tailwind or similar)
- **Backend / Data**: Supabase (Postgres, Auth, Storage)
- **Auth**: Supabase Auth (single auth for all sports/subdomains)
- **Database**: Postgres with RLS (Row Level Security)

## Key Database Entities

### 1. sports
- Defines available sports: badminton, padel, pickleball, tennis, table tennis.
- Columns:
  - `id` (uuid)
  - `code` (text, unique) – e.g. `'badminton'`
  - `name` (text)
- Used as a foreign key (`sport_id`) throughout the schema.

### 2. profiles
- 1:1 with `auth.users`.
- Represents a person using the platform.
- Columns:
  - `id` (uuid, PK, references `auth.users`)
  - `username` (unique)
  - `display_name`
  - `bio`
  - `default_sport` (uuid → sports.id)
  - `location` (e.g. `'Bangkok - Bang Na'`)
  - `avatar_url`
  - `status` (text, default `'member'`; allowed values: `'member'`, `'court_manager'`, `'admin'`)
  - `created_at`

### 3. profile_sports
- Describes which sports a profile plays, with optional skill and preference.
- Allows **multi-sport users**.
- Columns:
  - `profile_id` (uuid → profiles.id)
  - `sport_id` (uuid → sports.id)
  - `skill_level` (text)
  - `preference` (int, 1–5)
  - `is_primary` (boolean)
  - `created_at`
- Composite primary key: (`profile_id`, `sport_id`).

### 4. courts
- Represents racket courts/venues across Thailand.
- Supports **court finder** and SEO.
- Columns:
  - `id` (uuid)
  - `sport_id` (uuid → sports.id)
  - `name`
  - `description`
  - `address`
  - `district`
  - `province`
  - `lat`, `lng`
  - `google_place_id` (text; optional reference to Google Maps)
  - `phone`
  - `line_id`
  - `website_url`
  - `price_note`
  - `opening_hours` (jsonb; structured weekly schedule)
  - `is_active` (boolean)
  - `created_by` (uuid → profiles.id)
  - `created_at`
  - `updated_at` (timestamptz default `now()`)

### 5. court_photos
- Photos for courts.
- Columns:
  - `id` (uuid)
  - `court_id` (uuid → courts.id)
  - `image_url`
  - `is_primary` (boolean)
  - `created_at`

### 6. groups
- For **group/partner finder**.
- Examples:
  - “Badminton Sukhumvit Intermediate Group”
  - “Padel Bangna Weekend Group”
- Columns:
  - `id` (uuid)
  - `sport_id` (uuid → sports.id)
  - `name`
  - `description`
  - `owner_id` (uuid → profiles.id)
  - `player_amount` (integer, optional — average number of players per session)
  - `phone` (text, optional contact number)
  - `line_id` (text, optional LINE ID)
  - `created_at`
  - `updated_at` (timestamptz default `now()`)

> Cleanup note: if older deployments still have `location`, `skill_min`, or `skill_max` columns on `public.groups`, remove them with:
> ```sql
> alter table public.groups
>   drop column if exists location,
>   drop column if exists skill_min,
>   drop column if exists skill_max;
> ```
>
> Earlier versions also stored `default_court_id` and `schedule` directly on `public.groups`. Migrate those rows into `group_sessions` (below) and drop the legacy columns:
> ```sql
> alter table public.groups
>   drop column if exists default_court_id,
>   drop column if exists schedule;
> ```

### 7. group_sessions *(new)*
- Weekly sessions owned by each community group.
- Columns:
  - `id` (uuid)
  - `group_id` (uuid → groups.id on delete cascade)
  - `court_id` (uuid → courts.id on delete cascade)
  - `day` (text enum: `sunday` … `saturday`)
  - `start_time` (time)
  - `end_time` (time)
  - `created_at`
  - `updated_at`

### 8. community_posts *(revamped)*
- Sport-specific community board posts stored/rendered as plain text.
- Covers announcements, trading, questions, and meetup planning.
- Columns:
  - `id` (uuid, PK)
  - `sport_id` (uuid → sports.id, required)
  - `author_id` (uuid → profiles.id, nullable for imported/system posts)
  - `title` (text)
  - `body_text` (text; raw body content)
  - `category` (enum/text; e.g. `'update'`, `'event'`, `'market'`, `'question'`, `'other'`)
  - `status` (enum: `'draft'`, `'published'`, `'flagged'`, `'archived'`)
  - `pinned` (boolean default false)
  - `attachments` (jsonb array of Supabase Storage URLs)
  - `created_at`, `updated_at`

### 9. community_comments *(revamped)*
- Threaded comments on community posts.
- Columns:
  - `id` (uuid, PK)
  - `post_id` (uuid → community_posts.id)
  - `author_id` (uuid → profiles.id)
  - `body_text` (text)
  - `parent_id` (uuid → community_comments.id, nullable for top-level)
  - `created_at`, `updated_at`

### 10. community_likes *(new)*
- Single-reaction system (“Like”) per user/post.
- Columns:
  - `post_id` (uuid → community_posts.id)
  - `user_id` (uuid → profiles.id)
  - `created_at`
- Composite primary key (`post_id`, `user_id`) prevents duplicate likes.

### 11. notifications *(new)*
- Keeps a history of system notifications (e.g., court verification requests).
- Columns:
  - `id` (uuid, PK, default `gen_random_uuid()`)
  - `recipient_id` (uuid → profiles.id)
  - `type` (text, e.g. `'court-group-request'`)
  - `message` (text, optional fallback message)
  - `metadata` (`jsonb`, stores contextual IDs/names)
  - `read_at` (timestamptz, nullable)
  - `created_at` (timestamptz default `now()`)
- Suggested Supabase SQL:
  ```sql
  create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    message text,
    metadata jsonb,
    read_at timestamptz,
    created_at timestamptz default now()
  );
  alter table public.notifications enable row level security;
  create policy "Recipients can view notifications"
    on public.notifications for select
    using (recipient_id = auth.uid());
  create policy "Recipients can mark notifications"
    on public.notifications for update
    using (recipient_id = auth.uid());
  create policy "System inserts notifications"
    on public.notifications for insert
    with check (auth.role() = 'service_role');
  ```

### 11. matches
- Represents a match for scoreboard / match tracking.
- Can be linked to a group and a court.
- Columns:
  - `id` (uuid)
  - `sport_id` (uuid → sports.id)
  - `group_id` (uuid → groups.id, optional)
  - `court_id` (uuid → courts.id, optional)
  - `scheduled_at`
  - `status` (text: `'scheduled'`, `'in_progress'`, `'finished'`)
  - `created_by` (uuid → profiles.id)
  - `created_at`

### 12. match_participants
- Who is playing in a match and which team they are on.
- Columns:
  - `match_id` (uuid → matches.id)
  - `profile_id` (uuid → profiles.id)
  - `team` (e.g. `'A'`, `'B'`)
  - `is_winner` (boolean)
- Primary key: (`match_id`, `profile_id`).

### 13. match_games
- Game-level scores within a match (e.g. best-of-3 games).
- Columns:
  - `id` (uuid)
  - `match_id` (uuid → matches.id)
  - `game_no` (integer: 1, 2, 3, ...)
  - `team_a_score` (int)
  - `team_b_score` (int)
  - `created_at`

### 14. feedback
- Handles both **general feedback** and **reports**.
- Can optionally attach context (sport, group, court, match, post, reported user).
- Columns:
  - `id` (uuid)
  - `reporter_id` (uuid → profiles.id)
  - `reported_profile_id` (uuid → profiles.id, optional)
  - `sport_id` (uuid → sports.id, optional)
  - `group_id` (uuid → groups.id, optional)
  - `court_id` (uuid → courts.id, optional)
  - `match_id` (uuid → matches.id, optional)
  - `post_id` (uuid → posts.id, optional)
  - `type` (text: `'general'`, `'bug'`, `'feature'`, `'report_user'`, `'report_content'`, etc.)
  - `subject`
  - `message`
  - `status` (text: `'open'`, `'in_review'`, `'resolved'`, `'dismissed'`)
  - `priority` (text: `'low'`, `'normal'`, `'high'`, `'urgent'`)
  - `checked` (boolean, default `false` — admins toggle after reading)
  - `handled_by` (uuid → profiles.id, admin)
  - `resolution_note`
  - `created_at`
  - `updated_at`

## RLS & Access Control Overview

- **profiles**
  - Anyone can read.
  - Users can insert and update only their own row.

- **profile_sports**
  - Only the owner of the profile can read/write their sports.

- **courts & court_photos**
  - Publicly readable.
  - Any authenticated user can insert courts/photos.
  - Only the `created_by` user can update court details.

- **groups**
  - Public groups are readable by everyone.
  - Owners can update their groups.
  - Users can join/leave groups as themselves.
  - Members and group owners can see membership info.

- **posts & comments**
  - Publicly readable.
  - Authenticated users can create posts/comments.
  - Authors can update their own posts/comments.

- **matches, match_participants, match_games**
  - Matches and games are publicly readable.
  - Authenticated users can create matches.
  - Match creator can update matches and games.
  - Participants and match creator can see participants.
  - Participants can add themselves to matches.

- **feedback**
  - Feedback is visible to:
    - The reporter (who submitted it), and
    - Admins (`profiles.is_admin = true`).
  - Only authenticated users can create feedback.
  - Only admins can update status/resolution.

## Main MVP Features Mapped to Schema

- **Court Finder** → `courts`, `court_photos`, filtered by `sport_id`, `province`, `district`.
- **Group Finder** → `groups`, filtered by sport and schedule (day/time) plus proximity sorting.
- **Community Board** → `posts`, `comments`, with optional `sport_id` and `group_id`.
- **Scoreboard / Matches** → `matches`, `match_participants`, `match_games`.
- **Multi-sport Profiles** → `profiles`, `profile_sports`, plus `default_sport`.
- **Feedback & Reports** → `feedback`, optionally linked to users/content.

## Important Design Principles

- Single database and auth for all sports and all subdomains.
- Sports differentiated by `sport_id` (multi-tenant style).
- Focus on:
  - Simplicity
  - Scalability with indexes
  - Ability to extend later (chat, tournaments, booking, etc.)
- No per-sport duplicated tables; everything filters on `sport_id`.

## Recent UI Enhancements

- Public funnel redesign now covers landing, sport portal, court finder, and group finder with stronger CTA hierarchy and editorial-style visual treatment.
- Added an authenticated public court submission page at `/courts/new` that writes to `courts` without introducing a new queue table, while preserving existing admin/dashboard court-management workflows.
- Added an admin-controlled court submission policy toggle:
  - ON: public submissions publish immediately.
  - OFF: public submissions are stored as pending (`is_active = false`) and only become visible after admin publish from `/admin/courts`.
- Conversion instrumentation now tracks key acquisition events: `landing_cta_click`, `sport_cta_click`, `empty_state_cta_click`, `court_submit_started`, `court_submit_success`, `group_submit_success`, and `finder_filter_used`.
- Sitemap now includes every sport community board route (`/{sport}/board`) to improve search discoverability for active community content.
- Court finder’s “Find nearby courts” view now embeds a live Google Maps instance with a blue dot for the user location plus labeled pins for nearby courts, matching the Google Maps experience requested by stakeholders.
- All Google Maps/Places integrations (client map plus server API routes) now read the single `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` value from `.env.local`. For Advanced Marker labels, optionally define `NEXT_PUBLIC_GOOGLE_MAP_ID` with a vector map ID—otherwise the map will gracefully fall back to classic pins.
- Group finder now supports filtering by day and half-hour time slots plus a “Find nearby groups” option that geolocates the user, centers the court map, and surfaces the closest sessions.
- Court and group detail pages now emit localized metadata, canonical URLs, and Schema.org structured data so search engines can index locations and clubs with richer previews.
- Introduced a centralized green palette in `src/app/globals.css` with reusable helpers (`.rt-card`, `.rt-pill`, `.rt-btn-primary`, `.rt-text-muted`) so every court/group/community card pulls from the same `--rt-primary*` tokens. Updating the color now only requires editing those CSS variables.
- Landing hero cards, dashboard court/group lists, and the admin feedback table were migrated to the new `rt-card`/`rt-btn-primary` styles—no more hard-coded blue/emerald values—and their buttons inherit the shared disabled grey state.
- Feedback form inputs now live inside an `rt-card`, adopt the primary palette, and continue to rely on the shared base input styles (rounded corners, white background) so other forms can reuse the same component without extra tweaking.
- Added `BaseCard` (`src/components/base-card.tsx`) so every card wrapper (landing tiles, dashboard cards, admin tables) consumes the exact same radius, border, background, and shadow tokens just by using one component instead of retyping classes.
