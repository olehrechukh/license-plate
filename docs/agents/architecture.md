# Architecture

## Boot sequence

`index.html` loads GA4 (`gtag`, id `G-JYR5WCMBJ0`) and `src/main.jsx`, which calls
`injectSpeedInsights()` and renders:

```
<React.StrictMode>
  <BrowserRouter>
    <LanguageProvider>        src/i18n/LanguageContext.jsx  – lang state (sync, bundled strings)
      <AuthProvider>          src/auth/AuthContext.jsx      – Supabase session, Google OAuth
        <FeedProvider>        src/data/FeedContext.jsx      – provinces, rankings, counts, votes, mutations
          <AppGate>           src/components/AppGate.jsx    – splash while loading, retry screen on error
            <App />           src/App.jsx                   – routes
```

Order matters: `FeedProvider` reads `useAuth()` (vote identity, admin checks), and
`AppGate` reads both `useLanguage()` and `useFeed()`.

`AppGate` blocks the whole app until `FeedProvider` has loaded provinces + rankings +
province counts. There is **no static fallback**: missing env vars or a DB error shows the
bilingual "Could not load data / Не вдалося завантажити дані" screen with a Retry button
(`lang.reload()` is a no-op now; `feed.refresh()` refetches).

## Routes (`src/App.jsx`)

All routes render inside `Layout` (`Header` + `<main>` + `Footer`).

| Path | Page | Data source |
|---|---|---|
| `/` | `Home` | hero + `PlateSearch`; 10 newest comments via `fetchComments`; top 5 of `rankings` from feed |
| `/provinces` | `Provinces` | `ProvinceGrid` (provinces + counts from feed) |
| `/provinces/:slug` | `Province` | `useComments({ province: slug })`; unknown slug → empty state |
| `/comments` | `Comments` | `useComments({ sort })`, sort toggle `newest` / `top` |
| `/rankings` | `Rankings` | `rankings` from feed (top 10, current month) |
| `/plate/:plate` | `PlateDetail` | `fetchPlate()` header (score, count) + `useComments({ plate })` |
| `/new-comment` | `NewComment` | auth-gated form; `?plate=XX1234YY` prefills the plate |
| `/terms`, `/contact` | static | strings only |
| `*` | `NotFound` | |

Vercel rewrites every path to `/index.html`, so deep links work.

## Data layer (`src/data/`)

### `FeedContext.jsx` — global state (`useFeed()`)

Loaded once on mount (and on `refresh()`), in parallel:

- `provinces` table → `buildProvinces()` → `[{ slug, code, name: { uk, en } }]` sorted by `sort`.
- `fetchRankings(10)` → `rankings.entries` (`{ rank, plate, province, score, commentCount }`);
  `rankings.period` = `currentRankingPeriod()` (`YYYY-MM`, computed client-side).
- `fetchProvinceCounts()` → `{ [slug]: count }`.

Exposed value: `provinces, rankings, provinceCounts, loading, error, refresh, castVote,
addComment, deleteComment, deletedCommentIds, sessionVotes, voteDeltas`.

- **`castVote(comment, dir)`** — toggles a ±1 vote (clicking the same direction clears it).
  Optimistic: updates `sessionVotes` (persisted in localStorage per identity) and
  `voteDeltas` (added on top of server `ups/downs` in `CommentCard`). Requests per comment
  are chained in `voteRequestsRef` so rapid clicks apply in order; on RPC failure it rolls
  back to the last non-failed vote. Signed-in → RPC `cast_vote_auth`; anonymous → RPC
  `cast_vote` with `voterKey()`. Switching identity (login/logout) resets the ledger.
- **`addComment({ plate, category, description, sourceUrl, author, photoFile })`** —
  normalizes + validates plate, derives province from `plateRegions.js`, generates
  `crypto.randomUUID()` id, uploads the photo first (`<userId>/<commentId>/photo.<ext>` in
  bucket `comment-photos`), upserts the plate with `ignoreDuplicates: true`, inserts the
  comment (`text_uk` **and** `text_en` both = description), then `refresh()`.
- **`deleteComment(id)`** — admin only; RPC `soft_delete_comment`, adds the id to
  `deletedCommentIds` (cards hide immediately), then `refresh()`.

### `feedApi.js` — stateless queries

- `fetchComments({ plate, province, sort, from, to })` → `{ rows, count }` from view
  `comments_feed`, exact count, ordering `created_at desc` or `net desc, created_at desc`,
  always tie-broken by `id asc` for stable paging. Rows are mapped by `toComment()` into
  `{ id, plate, province, author, category, createdAt, ups, downs, text: {uk, en}, photo, sourceUrl }`.
- `fetchPlate(code)` → one row of `plate_rankings` (current month score + count) or `null`.
- `fetchRankings(limit)` → `plate_rankings` where `comment_count > 0`, order
  `score asc, comment_count desc, plate asc`.
- `fetchProvinceCounts()` → `province_comment_counts`.

All fetchers swallow errors (log `console.warn('[feed] …')`, return empty) — only the
initial provinces load surfaces an error to `AppGate`.

### `useComments.js` — infinite scroll hook

Page size 20. Resets on `{plate, province, sort}` change; `loadMore()` appends the next
range. `InfiniteComments` wires it to an `IntersectionObserver` sentinel (`rootMargin: 600px`).

### `useFeedData.js` — selectors + plate helpers

Exports `normalizePlate()`, `isValidPlate()` (see `domain.md`) and the `useFeedData()` hook
returning `provinces, rankings, loading, getProvince, provinceCount, provinceName,
categoryLabel, commentText, formatDate (uk-UA / en-GB), normalizePlate, s`.

### `plateRegions.js`

Region-code table (27 regions × 4 codes), `codesForSlug`, `PLATE_CODE_TO_SLUG`,
`NATIONAL_CODES`, `provinceForPlateCode(plate)`.

## Auth (`src/auth/AuthContext.jsx`)

`useAuth()` → `{ enabled, loading, session, user, signingIn, error, signInWithGoogle, signOut }`.
Google OAuth via `supabase.auth.signInWithOAuth`, `redirectTo` = current origin + path +
query (so users return to the page they were on). `onAuthStateChange('SIGNED_IN')` fires
the `sign_in_success` GA event. Admin = `user.app_metadata.role === 'admin'`.

`AuthControl` (in the header) shows an icon-only Google button when signed out, and an
avatar/name dropdown with "Sign out" when signed in (closes on outside click / Escape).

## i18n (`src/i18n/`)

- `strings.js` exports `strings.uk` / `strings.en` (big JSON literals, then a few
  appended assignments for newer keys), `config` (`defaultLang: 'uk'`, `languages`), and
  `currentRankingPeriod()`.
- `LanguageContext` keeps `lang` (localStorage key `lp-lang`), syncs `<html lang>`.
- `useI18n()` → `{ lang, setLang, languages, strings, s, t, loc }`.
  `s('a.b.c')` returns the **path itself** if missing — some components rely on this to
  fall back to literals via a local `label(key, uk, en)` helper (`AuthControl`, `NewComment`).
- Category labels: `strings.categories.<key>` and `strings.newComment.fields.category.options`.
- History: strings/config used to live in DB tables `app_strings` / `app_config`; commit
  `47774c0` moved them into the bundle. Those tables are not in the migrations.

## Components (`src/components/`)

| Component | Notes |
|---|---|
| `Layout` | shell with `Header`, `<Outlet/>`, `Footer` |
| `Header` | brand with UA plate strip, nav links, hamburger (`nav-toggle`) on mobile, `PlateSearch compact`, `LangSwitch`, `AuthControl` |
| `PlateSearch` | form → normalizes, validates, navigates to `/plate/:plate`; `compact` variant in header |
| `CommentCard` | plate tag, `CategoryBadge`, region, text (`loc`), photo, "Imported from <host>" link, author/date, admin Delete, vote bar |
| `InfiniteComments` | list + sentinel |
| `CategoryBadge` | emoji icon per category + localized label |
| `RankingTable` | `compact` hides region + comment columns; score shown with `+` if positive |
| `ProvinceGrid` | cards with all 4 region code chips + comment count |
| `LangSwitch` | UK / EN toggle |
| `AuthControl`, `GoogleMark` | auth UI; inline Google SVG |
| `AppGate` | boot / error gate |
| `Footer` | tagline, Contact + Terms links, copyright |

## Styling (`src/styles/`)

- `theme.css`: CSS custom properties (colors incl. Ukrainian plate palette `--ua-blue`,
  `--ua-flag-blue`, `--ua-yellow`, `--ua-green`; radii; shadows; `--container: 1080px`;
  fonts) + resets. Light theme only.
- `app.css`: all component styles, sectioned by `/* ============ Name ============ */`
  headers, BEM-like class names (`block__element`, `block--modifier`, state `is-active`,
  `is-open`, `has-error`). Breakpoints: `900px` (page grid collapses), `760px` (mobile nav,
  hamburger). Respects `prefers-reduced-motion`.
- No CSS modules / Tailwind / styled-components. Add new styles to `app.css` in the matching section.

## Local storage keys

| Key | Purpose |
|---|---|
| `lp-lang` | selected language |
| `lp-voter` | anonymous voter id (UUID) |
| `lp-session-votes:anonymous` / `lp-session-votes:user:<uuid>` | `{ commentId: ±1 }` ledger for highlighting own votes (legacy key `lp-session-votes` is migrated for anonymous) |
| Supabase auth keys | managed by supabase-js |
