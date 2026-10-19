# Domain rules

## Ukrainian license plates

Modern Ukrainian plates (2004+ standard) look like `BC 9563 HK`: two region letters,
four digits, two series letters. Only the 12 letters shared by Cyrillic and Latin are used:
А В Е І К М Н О Р С Т Х, which the app stores in **Latin** form (A B E I K M H O P C T X).

### Normalization — `normalizePlate()` (`src/data/useFeedData.js`)

1. Uppercase.
2. Map those 12 Cyrillic letters to their Latin look-alikes.
3. Remove all whitespace.

### Validation

- `isValidPlate()` — `^[A-Z0-9]{3,10}$` after normalization; same regex as the DB policies.
  Used by plate search (any valid syntax is searchable).
- Posting a comment additionally requires a known region: `provinceForPlateCode()` maps
  the **first two letters** (non-letters stripped) to a province slug. Unknown/national
  prefixes (`NATIONAL_CODES`: DI, PD, ED, DC, II) are rejected with `invalidRegion`.
- The plate's province is derived on the client and stored on `plates.province`.

### Region codes (`src/data/plateRegions.js`)

Each of the 27 regions has 4 two-letter codes (108 total), e.g. `lvivska: BC, HC, CC, EC`,
`kyiv-city: AA, KA, TT, TA`. The `provinces.code` column holds only the first one;
`ProvinceGrid` shows all four from `plateRegions.js`. Source: avtonomera.net.ua.

## Report categories

Keys (must stay identical across all places listed below):
`dangerous-driving`, `illegal-parking`, `sidewalk-blocking`, `lane-misuse`, `aggression`, `other`.

Defined in:

- `strings.{uk,en}.categories` (labels on cards),
- `strings.{uk,en}.newComment.fields.category.options` (form `<select>`; default `dangerous-driving`),
- `ICONS` in `src/components/CategoryBadge.jsx`,
- `.badge--<key>` styles in `src/styles/app.css` (Category badge section; `other` has no
  modifier and uses the base `.badge` style).

The DB only enforces `char_length(category) <= 50`.

## Posting a report (comment)

- Requires Google sign-in (RLS `to authenticated`; the form shows a sign-in gate).
- Description ≥ 20 chars (client max 1000, DB max 2000). Author ≤ 50 on the client
  (prefilled from Google `full_name`). Consent checkbox required.
- Optional single image (bucket accepts jpeg/png/webp/gif, ≤ 5 MB).
- Admins additionally see a "Source link" field (`source_url`) to attribute content
  imported from another site (e.g. Facebook); cards then show "Imported from <host> ↗".
- Rate limits (DB): 5 comments and 10 photo uploads per user per rolling hour.
- After success the user is navigated to `/plate/<plate>`.

## Voting

- Anyone can vote; no sign-in needed. One vote per comment per identity, values +1 / −1,
  clicking the active button clears it.
- Identity: signed in → `auth:<uid>` (server-verified); anonymous → random UUID in
  localStorage `lp-voter` (best-effort; clearing storage allows re-voting).
- Vote rows are private; clients only see aggregate `ups` / `downs`.
- "+" means _agree with the report_ (the driver was bad), "−" means _disagree_.

## Scoring and rankings

- Only comments created in the **current calendar month** (DB `now()`, UTC) and not deleted count.
- Per report: `score = -1 - ups + downs`. A report starts at −1; each upvote (agreement)
  makes it worse by 1; each downvote offsets it by 1.
- Plate score = sum over its current-month reports. **Lower = worse driver.**
- Leaderboard (`fetchRankings`): plates with ≥1 current-month report, ordered
  `score asc, comment_count desc, plate asc`, top 10 (Home shows the first 5).
- The plate page shows the same current-month score and "Reports this month: N", while its
  comment list shows **all-time** comments.
- `rankings.period` is the client's `YYYY-MM` (`currentRankingPeriod()`), which can differ
  from the server month near midnight / timezone boundaries.
- Comment sort "Top voted" uses `net = ups - downs` (all-time).

## Moderation

- Admins (`app_metadata.role = 'admin'`) see a Delete button on every comment card.
- Deletion is a **soft delete** via RPC `soft_delete_comment`: the row is kept for audit,
  hidden from non-admins and excluded from feed, rankings and province counts.
- There is no restore UI, no edit, no user self-delete, and no reporting/flagging flow.

## Content and legal copy

Terms (`strings.*.terms.body`): comments must relate to road behavior; insults, personal
data, defamation and hate speech are prohibited; admins may remove content.
Contact email is still the placeholder `kontakt@example.com`.
