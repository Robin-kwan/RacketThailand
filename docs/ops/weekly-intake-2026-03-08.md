# Weekly Court+Group Intake - 2026-03-08

## Run Summary
- Automation: `weekly-court-group-intake`
- Run date (ICT): 2026-03-08
- Scope: discover new Thailand racket courts + active groups, dedupe, and insert up to 8 courts / 8 groups.
- Environment result: outbound HTTP from runtime shell is blocked (`Unable to connect to the remote server`), so live Supabase duplicate checks and inserts could not run.
- Auto-insert totals: courts `0/8`, groups `0/8`.

## Source Discovery

### Official venue websites
- https://www.asokesports.club/
- https://www.bangkokpadel.com/contact
- https://www.sukspace.com/facilities/
- https://www.rbsc.org/sports-categories/tennis/

### Public community pages (active groups)
- https://www.meetup.com/bangkok-pickleball/
- https://www.meetup.com/bangkoktennisgang/
- https://www.meetup.com/badzone-advanced-badminton-games/
- https://www.meetup.com/bangkok-singles-who-love-table-tennis-meetup-group/

### Google Maps references
- https://maps.app.goo.gl/oamzs9Dgh2egd94W8 (Asoke Sports Club map link published on Bangkok Pickleball Meetup page)
- https://maps.google.com/?cid=14620565973076997995 (Bangkok Padel map link in public listing)

## Candidate Courts (Normalized)

### 1) Asoke Sports Club
- Sport: `pickleball`
- Confidence: `high` (official venue site + active community references)
- Evidence:
  - Official site lists pickleball clinics, location, and contact (`@asc_th`): https://www.asokesports.club/
  - Address shown: Foodland Building 11th Floor, Sukhumvit Soi 16, Bangkok
- Candidate payload:
```json
{
  "sport_code": "pickleball",
  "name": "Asoke Sports Club",
  "address": "Foodland Building 11th Floor, Sukhumvit Soi 16",
  "district": "Khlong Toei",
  "province": "Bangkok",
  "phone": null,
  "line_id": "@asc_th",
  "website_url": "https://www.asokesports.club/",
  "google_maps_url": "https://maps.app.goo.gl/oamzs9Dgh2egd94W8",
  "latitude": null,
  "longitude": null,
  "image_url": "https://images.squarespace-cdn.com/content/v1/624bff589c52ef50a0b041f9/47654453-95e8-44ea-82d2-16d8cda51627/Pickleball.JPG"
}
```
- Validation: required core fields mostly present; coordinates missing.

### 2) Bangkok Padel (Ambassador Hotel)
- Sport: `padel`
- Confidence: `high` (official contact page with phone/address)
- Evidence:
  - Official contact + phone: https://www.bangkokpadel.com/contact
- Candidate payload:
```json
{
  "sport_code": "padel",
  "name": "Bangkok Padel",
  "address": "Ambassador Hotel, 171 Soi Sukhumvit 11, Klongtoey Nue, Khet Watthana",
  "district": "Watthana",
  "province": "Bangkok",
  "phone": "+66 61 550 9990",
  "line_id": null,
  "website_url": "https://www.bangkokpadel.com/",
  "google_maps_url": "https://maps.google.com/?cid=14620565973076997995",
  "latitude": null,
  "longitude": null,
  "image_url": "https://static.wixstatic.com/media/23fd2a2be53141ed810f4d3dcdcd01fa.png/v1/fill/w_24%2Ch_24%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/23fd2a2be53141ed810f4d3dcdcd01fa.png"
}
```
- Validation: required core fields mostly present; coordinates missing.

### 3) Suk Space Bangkok
- Sport: `pickleball`
- Confidence: `medium` (official facility page, contact details provided)
- Evidence:
  - Facilities + contact/address/phone: https://www.sukspace.com/facilities/
- Candidate payload:
```json
{
  "sport_code": "pickleball",
  "name": "Suk Space Bangkok",
  "address": "14/1 Sukhumvit 67, Phra Khanong Nuea, Watthana",
  "district": "Watthana",
  "province": "Bangkok",
  "phone": "06-1027-1414",
  "line_id": null,
  "website_url": "https://www.sukspace.com/",
  "google_maps_url": null,
  "latitude": null,
  "longitude": null,
  "image_url": null
}
```
- Validation: required core fields mostly present; coordinates missing.

### 4) Royal Bangkok Sports Club - Tennis Section
- Sport: `tennis`
- Confidence: `high` (official club page with court inventory + phone)
- Evidence:
  - Tennis section page with hours + Tel: https://www.rbsc.org/sports-categories/tennis/
- Candidate payload:
```json
{
  "sport_code": "tennis",
  "name": "Royal Bangkok Sports Club (Tennis)",
  "address": "1 Henri Dunant Road",
  "district": "Pathum Wan",
  "province": "Bangkok",
  "phone": "02-028-7272 ext. 1315",
  "line_id": null,
  "website_url": "https://www.rbsc.org/sports-categories/tennis/",
  "google_maps_url": null,
  "latitude": null,
  "longitude": null,
  "image_url": "https://www.rbsc.org/wp-content/uploads/2025/03/Map-Tennis-1-724x1024.jpg"
}
```
- Validation: required core fields mostly present; coordinates missing.

## Candidate Groups (Normalized)

### 1) Bangkok Pickleball (Meetup)
- Sport: `pickleball`
- Confidence: `high`
- Evidence: 643 members, active scheduling language, LINE group link: https://www.meetup.com/bangkok-pickleball/
- Candidate payload:
```json
{
  "sport_code": "pickleball",
  "name": "Bangkok Pickleball",
  "description": "Meetup group playing twice weekly; organizes in LINE.",
  "phone": null,
  "line_id": "https://line.me/ti/g/7iL1uzO0Bf",
  "source_url": "https://www.meetup.com/bangkok-pickleball/",
  "player_amount": 643,
  "image_url": "https://secure.meetupstatic.com/photos/event/c/1/1/d/clean_516469437.webp"
}
```

### 2) Bangkok Tennis Gang (Meetup)
- Sport: `tennis`
- Confidence: `high`
- Evidence: 1,602 members, states play "pretty much everyday": https://www.meetup.com/bangkoktennisgang/
- Candidate payload:
```json
{
  "sport_code": "tennis",
  "name": "Bangkok Tennis Gang",
  "description": "Community tennis group in Bangkok with LINE chat and frequent play.",
  "phone": null,
  "line_id": null,
  "source_url": "https://www.meetup.com/bangkoktennisgang/",
  "player_amount": 1602,
  "image_url": "https://secure.meetupstatic.com/photos/event/9/f/e/9/clean_452620937.webp"
}
```

### 3) Badzone Advanced Badminton games (Meetup)
- Sport: `badminton`
- Confidence: `high`
- Evidence: 243 members, recurring weekly events at 71 Sports Club, stated weekly average players: https://www.meetup.com/badzone-advanced-badminton-games/
- Candidate payload:
```json
{
  "sport_code": "badminton",
  "name": "Badzone Advanced Badminton games",
  "description": "Advanced badminton club with recurring Sunday sessions at 71 Sports Club.",
  "phone": null,
  "line_id": "Badzone Bangkok",
  "source_url": "https://www.meetup.com/badzone-advanced-badminton-games/",
  "player_amount": 243,
  "image_url": "https://secure.meetupstatic.com/photos/event/4/e/d/5/clean_505820181.webp"
}
```

### 4) Everyone Loves Ping-Pong! (Meetup)
- Sport: `tabletennis`
- Confidence: `medium-high`
- Evidence: 58 members, regular meetups and event history: https://www.meetup.com/bangkok-singles-who-love-table-tennis-meetup-group/
- Candidate payload:
```json
{
  "sport_code": "tabletennis",
  "name": "Everyone Loves Ping-Pong!",
  "description": "Bangkok table tennis Meetup for beginner to experienced players.",
  "phone": null,
  "line_id": null,
  "source_url": "https://www.meetup.com/bangkok-singles-who-love-table-tennis-meetup-group/",
  "player_amount": 58,
  "image_url": "https://secure.meetupstatic.com/photos/event/e/7/7/b/clean_528839259.webp"
}
```

## Duplicate Check Result
- Intended checks: normalized name, normalized phone, province match, nearby coordinates (same sport).
- Runtime blocker: no live DB access from this shell environment, so duplicate checks against existing `courts`/`groups` could not be executed.
- Manual pre-filter against prior automation memory suggests no direct name overlap with already inserted entries (`Padel of Thailand`, `Padel Lodge Koh Chang`, `Ratchaphruek Padel`, and three prior group names), but this is not sufficient for final dedupe.

## Insert Attempt Log
- Courts inserted: `0`
- Groups inserted: `0`
- Inserted IDs: none
- Reason: Supabase connectivity blocked in this runtime.

## Skipped Items and Reasons
- All 4 court candidates skipped for auto-insert this run.
  - Reason A: live duplicate checks unavailable (DB unreachable).
  - Reason B: geocoordinates not fully verified for reliable nearby-coordinate dedupe.
- All 4 group candidates skipped for auto-insert this run.
  - Reason A: live duplicate checks unavailable (DB unreachable).

## Next Actions
1. Re-run from a network-enabled runtime with Supabase access.
2. Resolve sport IDs from `sports` table and enrich missing coordinates via Google Maps place details.
3. Execute dedupe checks by name + province + phone + geo proximity.
4. Insert high-confidence records only (max 8 courts / 8 groups), then record returned IDs.
5. If publish toggle/policy disables public publish, submit as pending according to current project policy.

## Live Sync Rerun (Post-Blocker) - 2026-03-08
- Root cause of prior no-insert run: network egress was blocked in that runtime (not missing `.env.local`, and not a DB policy/schema change).
- Current runtime restored connectivity; `.env.local` loaded successfully and Supabase responded normally.
- Baseline before rerun: courts `16`, groups `5`.

### Live dedupe checks
- Existing exact-name matches found:
  - Court: `Bangkok Padel` (already present)
  - Groups: `Bangkok Pickleball`, `Bangkok Tennis Gang`, `Everyone Loves Ping-Pong!` (already present)
- Nearby coordinate duplicate risk:
  - `Asoke Sports Club` had a nearby pickleball court (`??????????????`) within proximity threshold, so skipped for manual review.

### Inserted in this rerun
- Courts inserted:
  - `25fa6ec0-527f-4ad8-9c1c-517fe0544042` (`Suk Space Bangkok`)
  - `3dc85fa2-133d-4973-a55a-02bb55d89386` (`Royal Bangkok Sports Club (Tennis)`)
- Groups inserted:
  - `9aa1bcee-6cc9-469e-acca-efad1e16caea` (`Badzone Advanced Badminton games`)
- Cap check: courts `2/8`, groups `1/8` in this rerun.

### Current totals after rerun
- Courts: `18`
- Groups: `6`

### Remaining skipped items
- `Asoke Sports Club` (court): duplicate-risk by nearby coordinate; needs manual confirmation.
- `Bangkok Padel`, `Bangkok Pickleball`, `Bangkok Tennis Gang`, `Everyone Loves Ping-Pong!`: already exist.
