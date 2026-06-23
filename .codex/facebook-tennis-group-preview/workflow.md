# Facebook Tennis Group Preview Workflow

Source group:

- https://www.facebook.com/groups/716723188716013

Sport code:

- `tennis`

Output directory convention:

- `.codex/facebook-tennis-group-preview/runs/YYYY-MM-DD/preview.json`
- `.codex/facebook-tennis-group-preview/runs/YYYY-MM-DD/images/`
- `.codex/facebook-tennis-group-preview/runs/YYYY-MM-DD/raw/`

Goal:

- Find public tennis group-ad posts in the source Facebook group.
- Continue until the preview has 10 high-confidence group candidates or the source is exhausted.
- Prefer original Thai source text over summaries.
- Read both post captions and image text.
- Save local images used for preview where possible.

Candidate fields:

- `groupName`
- `venue`
- `provinceDistrict`
- `schedule`
- `contactMethods`
- `sourcePostUrl`
- `cleanedDescription`
- `originalExcerpt`
- `imageFilenames`
- `confidenceNotes`

Quality rules:

- Skip candidates with corrupted text such as repeated `????`.
- If text is corrupted, recover from the original post/caption/image before including it.
- Do not invent player level, fee, rules, or contact instructions.
- If the court/venue exists in RacketThailand, reference it in notes. If not, include enough venue detail for admin review.
- Keep candidates as preview data only; admin import creates hidden draft groups.

