# Agent Instructions

This file is the entry point for any LLM/coding agent working in this repository
(Claude Code reads it through `CLAUDE.md`; Codex, Cursor and others read it directly).
Read this file fully, then open the topic files under `docs/agents/` that match your task.

## Project

**AutoKarma** (АвтоКарма, repo `olehrechukh/license-plate`) is a Ukrainian
"rate drivers by license plate" site. Users search a plate, read reports about the
driver, post their own report (Google sign-in required), and vote on reports. A monthly
leaderboard ranks the worst plates.

- Frontend: React 18 + Vite 5 SPA, React Router 6, plain CSS (no UI framework, no TypeScript).
- Backend: Supabase only (Postgres + RLS, Auth with Google, Storage). No custom server.
- Hosting: Vercel (static SPA, `vercel.json` rewrites + security headers). Pushes to `main` deploy.
- Analytics: GA4 (`gtag` in `index.html`, events via `src/lib/analytics.js`) + Vercel Speed Insights.
- Languages: Ukrainian (`uk`, default) and English (`en`).

## Knowledge base (read the one you need)

| File                                                         | What's in it                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [`docs/agents/architecture.md`](docs/agents/architecture.md) | Provider tree, routes, every page/component, data flow, state, i18n, styling            |
| [`docs/agents/database.md`](docs/agents/database.md)         | Tables, views, RLS policies, RPCs, triggers, storage bucket, migration history          |
| [`docs/agents/domain.md`](docs/agents/domain.md)             | Plate format + normalization, region codes, categories, scoring, voting, admin features |
| [`docs/agents/operations.md`](docs/agents/operations.md)     | Env vars, local dev, Supabase/Google setup, admin role, deploy, CSP, analytics events   |
| [`docs/agents/known-issues.md`](docs/agents/known-issues.md) | Stale comments, tech debt, gotchas and open ideas — check before "fixing" something     |

`README.md` is the human-facing setup guide.

## Stack and Commands

- Install dependencies with `npm install`.
- Start the development server with `npm run dev` (http://localhost:5173).
- Build for production with `npm run build` (output in `dist/`).
- Preview the production build with `npm run preview`.
- Format with `npm run format` (Prettier: no semicolons, single quotes, no trailing commas, 120 columns).
- Lint with `npm run lint` (ESLint 9 flat config: `@eslint/js` recommended + React, React Hooks, React Refresh).
- Run everything CI runs with `npm run check` (`format:check` + `lint` + `build`).
- There is no test runner yet.
- The app needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`; without them
  it builds fine but renders the "Could not load data" screen at runtime.

## Source Layout

- `src/main.jsx` — bootstraps providers (`BrowserRouter > LanguageProvider > AuthProvider > FeedProvider > AppGate > App`).
- `src/App.jsx` — route table.
- `src/pages/` — route-level screens.
- `src/components/` — reusable UI components.
- `src/data/` — Supabase data access (`feedApi.js`), global feed state (`FeedContext.jsx`),
  paged comments hook (`useComments.js`), selectors (`useFeedData.js`), plate region table (`plateRegions.js`).
- `src/auth/AuthContext.jsx` — Supabase Auth session + Google sign-in.
- `src/i18n/` — bundled UI strings/config (`strings.js`), language state, `useI18n()` helpers.
- `src/lib/` — Supabase client + anonymous voter id (`supabase.js`), GA4 wrapper (`analytics.js`).
- `src/styles/` — `theme.css` (design tokens) and `app.css` (all component styles, BEM-ish).
- `supabase/migrations/` — the authoritative database schema (apply in filename order).
- `supabase/config.toml` — Supabase CLI local config.
- `public/` — static assets (site icon).

## Implementation Rules

- Follow the existing React and CSS patterns before introducing abstractions.
  Function components + hooks, no class components, no new state libraries.
- Keep changes scoped to the requested behavior; avoid unrelated refactors.
- User-facing text goes through `useI18n()` (`s('path')`, `t('path', params)`, `loc({uk, en})`)
  and must be added to **both** `uk` and `en` in `src/i18n/strings.js`. UI strings are bundled
  in the frontend, not stored in the database.
- Use `useFeed()` / `useFeedData()` for global feed state and `useComments()` / `feedApi.js`
  for comment lists rather than writing new ad-hoc Supabase queries in components.
- Plate input must go through `normalizePlate()` and be checked with `isValidPlate()` (and
  `provinceForPlateCode()` when a region is required). Keep client rules in sync with the DB regex `^[A-Z0-9]{3,10}$`.
- Admin-only UI is gated with `user?.app_metadata?.role === 'admin'`, but the real
  enforcement must live in RLS/RPCs — never rely on the client check alone.
- Fire GA4 events with `trackEvent(name, params)`; never send PII (emails, names, comment text).
- Preserve responsive behavior, especially the mobile navigation (`max-width: 760px`) and search form.
- Do not put secrets in source control. Keep local credentials in `.env` or `.env.local`
  (both gitignored). Only the publishable/anon key may ship to the browser.
- Do not edit generated `dist/` output; it is rebuilt by Vite.

## Supabase

- Treat `supabase/migrations/` and existing database contracts (views, RPC signatures,
  RLS policies) as authoritative. There is no `schema.sql` and no `seed.sql`.
- Schema changes go in a **new** timestamped migration (`YYYYMMDDHHMMSS_description.sql`);
  never edit an already-applied migration. When replacing a policy or view, restate the
  full current definition (see `database.md` — later migrations re-create earlier ones).
- Any new public aggregate/view must exclude soft-deleted comments (`deleted_at is null`).
- Keep client-side access compatible with the public/publishable Supabase key and RLS.
- Handle loading, empty, and error states for database-backed UI.
- Do not change seed/reference data (provinces) or schema unless the task requires it.

## Verification

Before finishing a change:

1. Run `npm run format`, then `npm run check` (must pass — CI runs the same on every PR and on `main`).
2. Check the affected route at desktop and mobile widths when UI is involved
   (`.claude/launch.json` defines `dev` on 5173 and `dev-preview` on 5199).
3. Confirm no local environment files or generated output are staged.
4. Report any verification that could not be run (e.g. no Supabase credentials available).

## Git and Deployment

- Use the project-local Git identity configured in `.git/config` when present
  (the owner commits as `olehrechukh`).
- Keep commits focused and use clear, imperative messages (e.g. "Add admin import and soft deletion").
- Vercel deploys from the connected GitHub repository when changes are pushed to `main`.
  Database migrations are **not** applied automatically — they must be pushed with
  `supabase db push` (or pasted in the SQL editor) by the owner.
- Do not force-push or rewrite history unless explicitly requested.

## Agent skills (`.claude/skills/`)

Popular open-source skills, vendored unmodified (sources, commits and licenses in
`.claude/skills/README.md`). Claude Code loads them automatically; other agents should read
the `SKILL.md` files directly.

**Code style and simplicity**

- `karpathy-guidelines` — the KISS rule set. Apply to every code change: state assumptions,
  write the minimum code that solves the task, no speculative abstractions or config, touch
  only what the task needs, define how you will verify it.
- `react-best-practices` (Vercel) — React performance and style rules. Apply when writing or
  reviewing components and data fetching.

**Bugs and verification**

- `systematic-debugging` — use for any bug, failing build or unexpected behavior: find the
  root cause before proposing a fix. If the bug is not fixed in the same change, record it in
  `docs/agents/known-issues.md` (symptom, location `file:line`, root cause if known).
- `verification-before-completion` — use before claiming work is done, fixed or passing:
  run `npm run check` and show its output first.

**How they apply to this project (these overrides win over the skills):**

1. Precedence: this file > `karpathy-guidelines` > `react-best-practices`. When a rule
   would add code or complexity, simplicity wins.
2. This is a client-only Vite SPA on React 18. Skip the Next.js, Server Components,
   server actions, `next/dynamic` and `server-*` rules in `react-best-practices`, and its
   React 19-only APIs.
3. Do not add dependencies a rule suggests (SWR, `better-all`, `lru-cache`, etc.) without
   the owner's approval; use the existing `useFeed()` / `useComments()` / `feedApi.js` layer.
4. Do not apply rules as a refactor of untouched code — only to code the task already changes.
5. There is no test runner: where a skill says "write a test", use a one-off reproduction
   and `npm run check`. `superpowers:test-driven-development` is not vendored.

## Keeping this knowledge base current

If you change architecture, schema, domain rules, env/deploy setup, or resolve an item in
`known-issues.md`, update the matching file in `docs/agents/` in the same change.
