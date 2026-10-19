# Known issues, stale notes, and gotchas

Verified against the code as of commit `52cdd5d` ("Change naming"). Fix items only when a
task calls for it, and remove them from this list when fixed.

## Stale documentation / comments (code is correct, text is not)

- `README.md` still says UI strings/config come from DB tables `app_strings` / `app_config`
  and lists them in its database table. They are bundled in `src/i18n/strings.js` since
  commit `47774c0`; those tables do not exist in the migrations. README also mentions
  "sample plates/comments" — there is no seed data besides provinces.
- `src/lib/supabase.js`: comment says the app "silently falls back to the static feed"
  when env vars are missing — there is no static feed; `AppGate` shows an error screen.
- `vite.config.js`: comment "The feed lives at the project root and is imported at build
  time" is obsolete.
- `src/App.jsx`: comment "Routes mirror feed.sitemap" — there is no `feed.sitemap`.
- `LanguageContext` still exposes `loading`, `error`, `reload` only for API compatibility.
- `AuthControl` / `NewComment` keep literal fallbacks for `auth.*` strings "until the
  migration-backed auth strings are available" — the keys now exist in `strings.js`, so the
  fallbacks are dead code.
- `20260710200000_reconcile…sql` refers to a migration `20260710193000` that is not in the repo.
- `supabase/config.toml` seeds from `./seed.sql`, which does not exist.

## Behavior gaps / tech debt

- **No translation:** `addComment` writes the same text to `text_uk` and `text_en`.
- **Orphaned photos:** the photo is uploaded before the plate/comment insert; if the insert
  fails (e.g. rate limit), the object stays in storage. Soft-deleted comments also keep photos.
- **Photo label says "Photo or video"** (`newComment.fields.photo.label`), but only images are
  accepted (input `accept="image/*"`, bucket MIME whitelist). HEIC from iPhones is rejected
  by the bucket.
- `NewComment` calls `URL.createObjectURL(photoFile)` on every render without revoking (memory leak, minor).
- Client caps (author 50, description 1000) are stricter than DB caps (100, 2000).
- `category` is not validated server-side against the known keys.
- Ranking month is computed in UTC on the server but `rankings.period` label uses the
  browser's local time.
- `/rankings` shows only the top 10 (`fetchRankings(10)` in `FeedContext`); no pagination.
- `Province` page shows comments for any slug that is in `provinces`; unknown slugs show an
  empty state rather than `NotFound`.
- Plate search accepts any `^[A-Z0-9]{3,10}$` plate even with an unknown region (by design,
  to find old/foreign formats), but such plates cannot receive comments.
- Fetch errors after boot are swallowed (logged, empty list) — users see "No comments yet"
  instead of an error state.
- Anonymous voting is best-effort; a determined user can vote repeatedly by clearing
  localStorage or calling `cast_vote` with new keys. No rate limit on votes.
- `strings.*.login` (username/password form) is unused — only Google sign-in exists.
- `strings.*.newComment.successMessage` and `comments.loadMore` are unused.
- Contact email is the placeholder `kontakt@example.com`.
- CSP `img-src` does not include `lh3.googleusercontent.com`, so Google avatars in
  `AuthControl` are likely blocked in production (falls back to a broken image rather than
  the initial). Verify in production before changing.
- `index.html` hard-codes `lang="uk"`; it is updated at runtime by `LanguageContext`.
- No tests, no linter, no TypeScript, no CI.

## Ideas mentioned in code but not implemented

- Restore UI for soft-deleted comments ("future recovery tooling" in the soft-delete migration).
- Stronger anonymous-vote abuse protection ("tracked separately" in the hardening migration).
