# Intake Encoding Guardrail

Use the Node intake tool for all future automated court/group inserts. It sends UTF-8 JSON and verifies stored text integrity after each insert.

## Commands

```bash
npm run intake:audit-encoding
npm run intake:audit-db
npm run intake:repair-mojibake
npm run intake:safe-insert -- --entity courts --input docs/ops/courts-candidates.json --max 8
npm run intake:safe-insert -- --entity groups --input docs/ops/groups-candidates.json --max 8
```

## Why this prevents the `?` issue

- Avoids PowerShell JSON encoding ambiguity during insert operations.
- Forces `Content-Type: application/json; charset=utf-8`.
- Runs post-insert integrity checks on text fields.
- Auto-repairs once using original UTF-8 payload and fails hard if corruption remains.
- Validates court `google_place_id` geometry against provided `lat/lng` before insert.
- If `image_url` is provided in candidate payload, uploads image to Supabase Storage and attaches photo row using a stable Supabase public URL.

## Required run order (every intake)

1. `npm run intake:audit-db`
2. `npm run intake:audit-encoding`
3. `npm run intake:safe-insert -- --entity courts ...`
4. `npm run intake:safe-insert -- --entity groups ...`
5. `npm run intake:audit-db`

## Input shape

Court candidates:

```json
[
  {
    "sport_code": "pickleball",
    "name": "Example Court",
    "address": "Street, District, Province",
    "district": "District",
    "province": "Province",
    "phone": null,
    "line_id": null,
    "website_url": "https://example.com",
    "latitude": 13.7,
    "longitude": 100.5,
    "google_place_id": "place-id",
    "created_by": "profile-uuid"
  }
]
```

Group candidates:

```json
[
  {
    "sport_code": "badminton",
    "name": "Example Group",
    "description": "Weekly sessions.",
    "owner_id": "profile-uuid",
    "player_amount": 40,
    "phone": null,
    "line_id": "line-contact"
  }
]
```
