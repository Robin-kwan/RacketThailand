# RacketThailand Monorepo Frontend

This Next.js 16 project powers both the default landing page (`racketthailand.com`) and every sport-specific experience that lives on subdomains such as `badminton.racketthailand.com` or `padel.racketthailand.com`. All sports pull from the same Supabase project and Postgres schema—the sport context comes from the requested subdomain (or slug when testing locally).

## App structure

- `/` – Marketing/landing hub that explains the multi-sport system and links out to each sport.
- `/[sport]` – Server-rendered tenant page fed by the `/api/sports/[code]` endpoint. Supported codes: `badminton`, `padel`, `pickleball`, `tennis`, `tabletennis`.
- `/api/sports/[code]` – API contract (currently mocked with schema-driven data) that any client—including the `/[sport]` page—uses to request structured content for a sport.

The landing page remains lightweight, while every sport route displays real feature modules (courts, groups, community, matches, profiles, feedback) hydrated via the API so the frontend stays the same no matter which subdomain a user visits.

## Getting started

1. Install dependencies
   ```bash
   npm install
   ```

2. Copy the example environment file and edit for your setup
   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `SUPABASE_URL` | Supabase project URL. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key used by the server to aggregate sport data. Keep this secret (server-only). |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL exposed to the browser for Auth. |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key used client-side for login/signup. |

3. Run the dev server
   ```bash
   npm run dev
   ```

4. Visit:
   - `http://localhost:3000/` – Thai by default; use the language switcher in the header or append `?lang=en` to view English copy.
   - `http://localhost:3000/badminton` (Thai) or `http://localhost:3000/badminton?lang=en` – sport experiences that mirror the production subdomains while reusing the same frontend.

## Available scripts

| Script        | Description                                               |
| ------------- | --------------------------------------------------------- |
| `npm run dev` | Start Next.js in development mode.                        |
| `npm run build` | Create an optimized production build.                   |
| `npm run start` | Run the production server after building.               |
| `npm run lint` | Run ESLint against the project sources.                  |

## Subdomain & locale routing

In production you can map each subdomain (e.g., `badminton.racketthailand.com`) to the same deployment. Locale handling is implemented via query parameters (`?lang=en`) plus an in-app toggle—Thai remains the default if no parameter is supplied. Both the landing page and sport pages share the same Supabase-backed aggregation logic, so switching languages only affects the copy.

## Localization

- Translations are handled by [`next-intl`](https://next-intl-docs.vercel.app/) with message files in `src/messages/{locale}.json`.
- The helper in `src/lib/i18n.ts` normalizes the `?lang=` query, loads the correct messages, and exposes a `t('namespace.key')` translator for pages.
- Sport-specific copy (e.g., closing CTAs, feature labels) stores localized values in `src/data/sportMeta.ts`, so adding more languages means updating a single object instead of sprinkling ternaries throughout the UI.

## Sport API contract

- `GET /api/sports/:code` returns structured data for a sport (hero copy, stats, feature cards, closing CTA). The route aggregates data directly from Supabase tables (`courts`, `groups`, `posts`, `matches`, `profile_sports`, `feedback`) so web, mobile, or marketing surfaces can reuse the same contract.
- The sport detail pages reuse that same aggregation logic directly on the server, so they render instantly from Supabase without needing an extra HTTP hop. If a table has no rows yet, the UI shows an empty state so the design still works pre-launch.
- Add additional API endpoints (courts, groups, matches, etc.) so mobile clients can reuse the same contract.
- Wire DNS or an edge middleware to redirect subdomains to the proper `/[sport]` route when needed.
