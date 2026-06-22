# Facebook Group Import Workflows

These workflows create local preview data for admin review before importing groups as hidden drafts.

The importer expects each workflow to write:

- `preview.json`
- `images/`
- `raw/`

under:

```text
.codex/<workflow-directory>/runs/YYYY-MM-DD/
```

## Workflows

| Sport | Source URL | Workflow Directory |
| --- | --- | --- |
| Badminton | `https://www.facebook.com/groups/108488876533648` | `.codex/facebook-badminton-group-preview` |
| Pickleball | `https://www.facebook.com/groups/465849552420177` | `.codex/facebook-pickleball-group-preview` |
| Tennis | `https://www.facebook.com/groups/716723188716013` | `.codex/facebook-tennis-group-preview` |

## Preview Contract

Each `preview.json` should include:

```json
{
  "runDate": "YYYY-MM-DD",
  "sportCode": "pickleball",
  "sourceUrl": "https://www.facebook.com/groups/465849552420177",
  "candidates": [
    {
      "groupName": "",
      "venue": [],
      "provinceDistrict": [],
      "schedule": [],
      "contactMethods": [],
      "sourcePostUrl": "",
      "cleanedDescription": "",
      "originalExcerpt": "",
      "imageFilenames": [],
      "confidenceNotes": ""
    }
  ]
}
```

Use `sportCode` values supported by the importer:

- `badminton`
- `pickleball`
- `tennis`

## Recovery Rules

- Prefer original public post text over generated summaries.
- Read post captions and image text.
- Store raw post HTML when available so descriptions can be recovered later.
- Skip candidates with corrupted descriptions such as repeated `????`.
- If a description is corrupted, recover from the original post/source image before importing.
- Do not invent player levels, fees, rules, or contacts.

## Import Behavior

Admin import creates hidden draft groups assigned to the `racketthailand` admin profile.

The importer now resolves sport-specific run folders:

- badminton: `.codex/facebook-badminton-group-preview/runs`
- pickleball: `.codex/facebook-pickleball-group-preview/runs`
- tennis: `.codex/facebook-tennis-group-preview/runs`

The import remains review-first:

- preview candidates locally
- import as draft
- review in admin
- publish only after validation

