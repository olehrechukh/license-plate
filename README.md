# License Plate

A driver-rating-by-license-plate web app built with **React + Vite** and backed by
**Supabase**. Provinces, plates, comments, votes, and site content live in the database.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

The app **requires Supabase** to run (there is no static fallback). See setup below —
without a reachable, seeded database it shows a "Could not load data" retry screen.

## Backend setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy `.env.example` → `.env` and fill in (Settings → API):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (the browser-safe `sb_publishable_…` key)
3. In the Supabase SQL Editor, run **`supabase/schema.sql`**, then **`supabase/seed.sql`**,
   then **`supabase/storage.sql`** (creates the `comment-photos` bucket for uploads).
4. Restart `npm run dev`.

Comment photos upload to the `comment-photos` Storage bucket and are stored as public
URLs on `comments.photo`. Until the bucket exists, submitting still works — the comment
is just saved without a photo.

Edit content in the database (or in `site content` via SQL) and refresh. To regenerate
`seed.sql` you need the original `site-feed.json`; it was removed once the data moved to
the DB, so the database is now the source of truth.

## Architecture

Everything loads from Supabase at startup; `AppGate` shows a splash until translations
and data are ready, then renders the SPA.

- **`src/lib/supabase.js`** — Supabase client from env + anonymous per-browser voter id.
- **`src/i18n/LanguageContext.jsx`** — loads UI strings (`app_strings`) + config
  (`app_config`) from the DB; holds the active language (persisted to `localStorage`,
  syncs `<html lang>`). `useI18n` exposes `s(path)`, `t(path, params)`, `loc(value)`.
- **`src/data/FeedContext.jsx`** — loads `provinces`, `plates`, `comments`, `rankings`;
  exposes `castVote()` and `addComment()` (writes to the DB).
- **`src/data/useFeedData.js`** — selectors (getPlate, allComments, province lookups,
  category labels, localized dates) over the provider data.
- **`src/data/plateRegions.js`** — full Ukrainian plate-code → region table (each
  region has 4 two-letter prefixes; 108 codes). Used to derive the oblast for a newly
  reported plate and to show a live region hint on the add-comment form.
- **`src/components/AppGate.jsx`** — loading / error-retry gate.
- **`src/pages/`, `src/components/`** — the SPA (React Router).

### Database

| Object | Purpose |
|---|---|
| `app_config` | single row: `default_lang`, `ranking_period` |
| `app_strings` | one `jsonb` UI-strings doc per language (`uk`, `en`) |
| `provinces` | 27 Ukrainian regions (slug, code, uk/en names) |
| `plates` | plate + region + ranking score |
| `comments` | comment text (uk/en), author, category, photo, base votes |
| `votes` | one row per (comment, anonymous voter) |
| `comment_scores` (view) | base votes + sum of user votes |
| `plate_rankings` (view) | leaderboard, worst score first |

Votes are keyed by an anonymous per-browser id (no login). RLS allows public read plus
public write on `plates` / `comments` / `votes` for the demo.

## Scope notes

- **No login** for now — the auth page was removed. RLS currently permits anonymous
  writes; tighten the policies in `schema.sql` when you add authentication.
- Provinces are all 27 Ukrainian regions (24 oblasts + Crimea + Kyiv & Sevastopol).
- Sample plates/comments are invented, neutral examples.
