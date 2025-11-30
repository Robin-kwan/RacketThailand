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

The sport context is determined by subdomain and mapped to a `sports` row using `code` (e.g. `'badminton'`).

## Core Goals

1. Help players **find courts**, **groups**, and **matches** for racket sports in Thailand.
2. Provide a **community board** for questions, posts, news, and reviews.
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
  - `is_admin` (boolean) – for platform admins/moderators
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
  - `phone`
  - `line_id`
  - `website_url`
  - `price_note`
  - `is_active` (boolean)
  - `created_by` (uuid → profiles.id)
  - `created_at`

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
  - `location` (free text)
  - `skill_min`, `skill_max` (text)
  - `is_public` (boolean)
  - `owner_id` (uuid → profiles.id)
  - `created_at`

### 7. group_members
- Links profiles to groups.
- Supports multiple admins per group via `role`.
- Columns:
  - `group_id` (uuid → groups.id)
  - `profile_id` (uuid → profiles.id)
  - `role` (text: `'member'`, `'admin'`)
  - `joined_at`
- Primary key: (`group_id`, `profile_id`).

### 8. posts
- Community board posts.
- Used for:
  - Discussions
  - Announcements
  - News
  - Blog-like content
- Columns:
  - `id` (uuid)
  - `sport_id` (uuid → sports.id, optional)
  - `group_id` (uuid → groups.id, optional)
  - `author_id` (uuid → profiles.id)
  - `title`
  - `content`
  - `type` (e.g. `'discussion'`, `'blog'`, `'poll'`, `'news'`)
  - `is_pinned` (boolean)
  - `created_at`

### 9. comments
- Comments on posts.
- Columns:
  - `id` (uuid)
  - `post_id` (uuid → posts.id)
  - `author_id` (uuid → profiles.id)
  - `content`
  - `created_at`

### 10. matches
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

### 11. match_participants
- Who is playing in a match and which team they are on.
- Columns:
  - `match_id` (uuid → matches.id)
  - `profile_id` (uuid → profiles.id)
  - `team` (e.g. `'A'`, `'B'`)
  - `is_winner` (boolean)
- Primary key: (`match_id`, `profile_id`).

### 12. match_games
- Game-level scores within a match (e.g. best-of-3 games).
- Columns:
  - `id` (uuid)
  - `match_id` (uuid → matches.id)
  - `game_no` (integer: 1, 2, 3, ...)
  - `team_a_score` (int)
  - `team_b_score` (int)
  - `created_at`

### 13. feedback
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

- **groups & group_members**
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
- **Group Finder** → `groups`, `group_members`, filtered by `sport_id`, `location`, skill range.
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
