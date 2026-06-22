# Group Import Standard

This document defines the standard process for importing racket-sport groups from public source material into RacketThailand.

Default intent:

- recover original public group-post content when possible
- create draft groups only when source data is readable and attributable
- avoid replacing corrupted text with generic summaries unless explicitly marked as a temporary repair

## Source Recovery

When a group candidate comes from Facebook or another public community source, preserve the original source trail:

- `source_post_url`
- raw post caption or meta description when available
- OCR text from post images when image text contains schedule or contact details
- local image filenames used during preview
- confidence notes

If a draft has corrupted text such as repeated `????`, treat it as data corruption, not as missing copy.

Recovery order:

1. Check the stored `source_post_url`, raw HTML, preview JSON, OCR text, and local image files from the import run.
2. If the source URL is missing, search by exact group name plus court name, schedule, LINE ID, phone, or website.
3. Re-open the latest relevant public post from the original group/page.
4. Re-read both caption text and text embedded in images.
5. Restore the original Thai content as closely as possible, preserving factual details.
6. If original text cannot be recovered confidently, leave the description empty or keep the draft skipped for manual review.

Do not silently replace corrupted descriptions with generic marketing copy.

## Corruption Stop Rule

Before inserting or updating a group description, check for text corruption.

Stop the import when:

- the chosen description contains a high ratio of literal `?` characters
- OCR output is unreadable or mostly replacement characters
- Thai text has been converted to mojibake or question marks
- the only available description is a truncated social preview ending in `...`

When this happens, skip the candidate and report that the original source post must be recovered.

## Description Standard

- Thai source text is preferred.
- Use the original public post text where possible.
- Light cleanup is acceptable for whitespace, removed tracking links, or duplicated source noise.
- Do not invent player level, fee, rules, or contact instructions.
- If only structured facts are available, use a neutral factual summary only when explicitly approved for repair.

## Import Report

Every import run should report:

- groups imported
- groups skipped
- source-recovery failures
- corrupted-description skips
- image/OCR confidence issues
- courts created during import

