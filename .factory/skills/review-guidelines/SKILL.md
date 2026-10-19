---
name: review-guidelines
description: Repository-specific code review rules for AutoKarma (React + Vite SPA on Supabase). Use when reviewing a pull request or local diff in this repository, to decide what to flag and at which priority.
---

# Review guidelines — AutoKarma

Project context lives in `AGENTS.md` and `docs/agents/`. This file lists what a reviewer should
flag in a diff. Only flag issues the diff introduces; for pre-existing problems listed in
`docs/agents/known-issues.md`, do not comment unless the diff makes them worse.

Priorities: **P0** security or data loss · **P1** broken behavior · **P2** project rule violated ·
**P3** worth fixing but not blocking.

## Security and data (P0)

- **Authorization only in the client.** `user?.app_metadata?.role === 'admin'` in React is a UI gate,
  not protection. Any new admin-only or owner-only write must be enforced by an RLS policy or a
  `security definer` RPC that checks `auth.uid()` / `auth.jwt() -> 'app_metadata' ->> 'role'`.
- **Secrets in the browser.** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` may be
  exposed. A service-role key, any other secret in a `VITE_*` variable, or a committed `.env` is P0.
- **Weakened RLS.** A migration that re-creates `"insert comments"` (or another policy) must restate
  every existing check from the latest definition (`20260716130000_soft_delete_comments.sql`).
  Dropped checks — `created_by = auth.uid()`, `deleted_at is null`, id/plate regex, length limits,
  zero base votes, `created_at` window, admin-only `source_url`, pinned photo path — are P0.
- **Vote privacy.** The `votes` table must stay unreadable to `anon`/`authenticated`; vote writes
  only through `cast_vote` / `cast_vote_auth`. New grants or policies on `votes` are P0.
- **Soft-deleted comments leaking.** Any new view, RPC or query over `public.comments` that is
  exposed to clients must filter `deleted_at is null`.
- **Unsafe HTML or URLs.** `dangerouslySetInnerHTML`, or rendering user-supplied URLs in
  `href`/`src` without enforcing `http(s)` (see `isValidSourceUrl` and the DB check on
  `source_url`).
- **PII in analytics.** `trackEvent()` params must not contain emails, names, comment text or
  plate numbers tied to a user.

## Database contracts (P1)

- Schema changes must be a **new** timestamped file in `supabase/migrations/`; editing an existing
  migration is P1.
- `comments_feed` column order is a contract: new columns are appended at the end.
- New tables need RLS enabled and explicit grants (new objects are not auto-exposed).
- Client code that depends on a new migration must ship with it, and the PR description should
  say the migration has to be applied manually (Vercel does not run migrations).
- RPC names and argument names used in `src/data/` (`cast_vote`, `cast_vote_auth`,
  `soft_delete_comment`) must match the SQL definitions.

## Domain rules (P1)

- Plate input goes through `normalizePlate()` and `isValidPlate()`; the client regex must stay
  `^[A-Z0-9]{3,10}$`, same as the DB. Posting additionally requires `provinceForPlateCode()`.
- Category keys (`dangerous-driving`, `illegal-parking`, `sidewalk-blocking`, `lane-misuse`,
  `aggression`, `other`) must stay in sync across `strings.{uk,en}.categories`,
  `newComment.fields.category.options`, `CategoryBadge` `ICONS` and `.badge--*` CSS.
- Province slugs must match between the `provinces` table and `src/data/plateRegions.js`.
- Ranking score semantics: per current-month report `-1 - ups + downs`; lower is worse;
  leaderboard ordered `score asc`. Flag changes that invert or diverge between
  `plate_rankings` and the UI.

## Frontend correctness (P1)

- Every database-backed screen handles loading, empty and error states.
- Comment lists use `useComments()` / `fetchComments()`; global data uses `useFeed()` /
  `useFeedData()`. New ad-hoc `supabase.from(...)` calls in components are P2 (P1 if they bypass
  the soft-delete or vote views).
- Paged queries keep a stable tiebreaker (`.order('id')`) so pages don't overlap.
- Effects that fetch must ignore stale results (the `cancelled` flag pattern used in pages).
- Optimistic vote updates must roll back on RPC failure (see `castVote` in `FeedContext.jsx`).
- New third-party origins (scripts, images, fonts, APIs) need a matching CSP update in
  `vercel.json`, or they will be blocked in production while working in `npm run dev`.

## Project rules (P2)

- **i18n:** user-facing text uses `useI18n()` and is added to both `uk` and `en` in
  `src/i18n/strings.js`. Hard-coded UI strings are P2.
- **Simplicity (KISS):** no new dependencies without a stated reason; no abstractions,
  config options or helpers for a single use; no unrelated refactors or reformatting in the
  same PR. Follow `karpathy-guidelines`.
- **Responsive:** UI changes keep the mobile nav (`max-width: 760px`) and search form working.
- **Styling:** plain CSS in `src/styles/app.css` using the BEM-like naming and the tokens in
  `theme.css`; no CSS-in-JS or UI frameworks.
- **Docs:** changes to architecture, schema, domain rules or deploy setup update the matching
  file in `docs/agents/`.
- `dist/` and `.env*` files must not be committed.

## Do not flag

- Formatting and import order — Prettier and ESLint run in CI (`npm run check`).
- Next.js / Server Components advice from `react-best-practices`; this is a client-only Vite SPA
  on React 18.
- Missing unit tests — the repo has no test runner yet.
