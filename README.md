# AutoKarma

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
3. Apply the migrations in **`supabase/migrations/`** in filename order using the
   Supabase CLI (`supabase db push`) or the SQL Editor.
   The migrations create the tables, RLS policies, rankings view, and `comment-photos`
   Storage bucket.
4. In the Supabase Dashboard, enable Google under Auth → Providers and add your local
   and production URLs to Auth → URL Configuration.
5. In Google Cloud, create a Web OAuth client and add the Supabase callback URL shown
   in the Google provider settings on the Supabase dashboard.
6. Restart `npm run dev`.

Comment photos upload to the `comment-photos` Storage bucket and are stored as public
URLs on `comments.photo`. If a photo upload fails, the form reports the error and keeps
the comment unsubmitted so the user can retry.

Edit content directly in the database and refresh; the database is the source of truth.

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
| `plates` | plate + region; score is derived from comment votes |
| `comments` | comment text (uk/en), author, category, photo, base votes |
| `votes` | one row per (comment, anonymous voter) |
| `comment_vote_counts` (view) | base up/down votes + live user votes |
| `plate_rankings` (view) | leaderboard, worst score first |

Votes support both anonymous per-browser ids and signed-in users. RLS allows public read;
plate and comment inserts require authentication, and vote writes go through constrained
database functions. Comment photo uploads must use the signed-in user's
`<auth.uid>/<comment-id>/<filename>` path.

## Scope notes

- Supabase Auth is required for posting comments, registering plates, and uploading photos.
- Provinces are all 27 Ukrainian regions (24 oblasts + Crimea + Kyiv & Sevastopol).
- Sample plates/comments are invented, neutral examples.
