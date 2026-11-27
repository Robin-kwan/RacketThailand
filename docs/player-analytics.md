# Player activity measurement

Admin Analytics now separates database-backed outreach outcomes from consented
Google Analytics browsing activity. The existing admin guard protects the entire
page; no new public read endpoint, schema migration, or message-content query is
introduced.

## Outcomes

- Sources: `player_play_requests`, `player_group_invitations`; sport relations and
  `profiles.status` for exclusions.
- Include requests created during the selected 7/30/90 Thai calendar days,
  including today through the server read time. Show each request's current
  status, even if the response arrived after its creation day. This is a sent
  cohort, not a count of responses occurring within that same period.
- Unique senders/recipients are deduplicated across sports for each request type.
  Do not add request and invitation audiences together.
- Both endpoints of an outreach record are checked against the exclusion list.
- Read in stable ID order with keyset pagination; fail visibly on database error
  or the safety bound rather than silently showing incomplete counts.
- Acceptance is not a conversation, contact exchange, or confirmed game.

## Browser activity

Event names: `player_<action>_<sport>`. Actions: `view`, `request_open`,
`login_gate`, `profile_gate`, `request_error`, `invite_open`, `invite_error`.
Sports match the app's canonical codes, including `tabletennis`.

`view` means the player finder mounted, not an individual player's card view.
Gate events mean the user clicked a login/profile prerequisite, not merely that
it was shown. Opens and errors count occurrences; users are deduplicated per
action by GA. Opening/cancelling/reopening can count several events.

These events run only with the existing GA consent and measurement ID, on the
production root/sport hosts, with server-provided eligibility. No user or target
ID, free text, name, or contact details are attached. Localhost/preview events are
disabled. Do not send synthetic test events to the live GA property.

GA uses its property's timezone, consent coverage, processing latency and privacy
thresholds. Its audiences must not be divided into database totals to produce a
conversion rate. The dashboard's all-sports audience is aggregated within GA,
not summed across overlapping sport audiences. Data cannot be backfilled before
the instrumentation is deployed. No custom GA dimensions are required.

## Exclusions and operation

Admin profiles are excluded automatically. Add confirmed test profile IDs to
`src/data/playerAnalyticsExclusions.ts`; the initial list is empty because no
non-admin test accounts have been identified. Never infer test accounts from
names or email addresses. A signed-out administrator is indistinguishable from
another guest. Historical GA events cannot be retroactively excluded by adding
an account to this list; existing database counts use the current exclusions.

Uses the existing GA reporting credentials. Database outcomes remain available
without GA reporting or visitor consent. Refresh the admin page for current
data; this does not create a scheduled automation or change GA configuration.
