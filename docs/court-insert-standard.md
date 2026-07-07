# Court Insert Standard

This document defines the standard process for inserting courts into the live RacketThailand database.

It applies to all admin-driven court imports, automation-created courts, and quick courts created while importing groups.

Default operating mode is research first, then direct insert only after duplicate and location checks.

## Required Location Standard

Every inserted court must have normalized Thailand location references.

Required fields:

- `address`
- `lat`
- `lng`
- `province_id`
- `district_id`
- `province`
- `district`

`province_id` and `district_id` must come from the canonical Thailand reference tables:

- `public.provinces`
- `public.districts`

`province` and `district` must be stored as the canonical Thai names from those reference tables:

- `courts.province = provinces.name_th`
- `courts.district = districts.name_th`

Do not store raw Google Maps address component text such as `Bangkok`, `Phuket`, `Tambon Tha Sai`, `Huaykwang`, or `Mueang Phuket` in `courts.province` / `courts.district`.

The app can display English from `province_id` / `district_id` through localization helpers. The database row itself should keep the Thai canonical snapshot for consistency.

## Google Maps Requirement

New court inserts should be based on a selected Google Maps place or a location workflow that resolves to the same data quality.

Before insert, resolve:

- Google place ID when available
- exact address
- coordinates
- province ID
- district ID

If the Google result returns a subdistrict/tambon instead of a district/amphoe, resolve the real district from the full address, coordinates, or official map context before inserting.

If the province or district cannot be resolved to the reference tables, do not insert the court.

## Duplicate Standard

Before inserting, check duplicates against the live database.

Minimum duplicate checks:

- normalized exact match on `courts.name`
- `google_place_id` match when available
- website host match against `courts.website_url`

Public sitemap checks are useful as a preview, but Supabase is the source of truth.

## Source Rules

Court names, facilities, hours, contact channels, and location details must come from official sources only.

Official sources include:

- the court or venue's official website
- the court or venue's official social media page
- official map embeds or official map links published by the venue

Do not infer facts from blogs, aggregators, review sites, or third-party booking pages unless the venue itself links to them as its official channel.

## Description Standard

- Thai official text is preferred when the official source provides Thai.
- If the official source is effectively English-only, English text is acceptable.
- If there is no clean official description that can be copied or lightly excerpted without invention, leave `description` empty.
- Do not write promotional copy.
- Do not imply that RacketThailand owns, operates, verifies, or is officially affiliated with the venue.

## Image Standard

- Use official venue images only.
- Never store a remote image link as the final asset record.
- Download the image, upload it into Supabase Storage bucket `court-images`, then insert the Supabase public URL into `court_photos`.
- If there is no verified direct official image URL, skip the image and leave the court without photos.

## Required Data Standard

Insert a court only when the minimum safe production data is available:

- `name`
- `address`
- `lat`
- `lng`
- `province_id`
- `district_id`
- canonical Thai `province`
- canonical Thai `district`
- at least one sport binding in `court_sports`
- `created_by` admin binding

Optional fields:

- `google_place_id`
- `description`
- `phone`
- `line_id`
- `website_url`
- `opening_hours`
- image

Missing optional metadata alone is not a stop condition. Ambiguous location is a stop condition.

## Admin Binding Standard

Default admin binding for this workflow is `RacketThailand`:

- profile id: `01d456af-f9c3-4d9d-9d8e-d2f4bf5e0083`
- username: `racketthailand`

Inserted rows should use this profile as `created_by` unless the run explicitly chooses a different admin.

## Automation Guardrail

Automation must not bypass the normalized location workflow.

Before every automated report is considered complete, run a live Supabase verification query equivalent to:

```sql
select
  count(*) filter (where province_id is null) as missing_province_id,
  count(*) filter (where district_id is null) as missing_district_id
from public.courts;
```

If either count increases after the run, treat the run as incomplete and repair the inserted rows immediately.

Also verify canonical text consistency:

```sql
select count(*)
from public.courts c
left join public.provinces p on p.id = c.province_id
left join public.districts d on d.id = c.district_id
where c.province is distinct from p.name_th
   or c.district is distinct from d.name_th;
```

Expected result is `0`.

## Root Cause Note

The duplicate province filter issue was caused by legacy/direct inserts that mixed old text-only location fields with newer normalized reference IDs. Some rows had `province_id`/`district_id` but retained English text; others had raw Google text and missing IDs.

Current public/admin court forms require `provinceId` and `districtId`, so future regressions are most likely to come from automation, scripts, direct SQL, or group-import quick court creation. Those paths must follow this standard.
