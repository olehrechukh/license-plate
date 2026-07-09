# Agent Instructions

## Project

License Plate is a React + Vite single-page application backed by Supabase.
The database is the source of truth for site content, provinces, plates, comments,
votes, rankings, and UI strings.

## Stack and Commands

- Install dependencies with `npm install`.
- Start the development server with `npm run dev`.
- Build for production with `npm run build`.
- Preview the production build with `npm run preview`.
- There is currently no test runner configured; always run `npm run build` after code changes.

## Source Layout

- `src/pages/` contains route-level screens.
- `src/components/` contains reusable UI components.
- `src/data/` contains Supabase-backed data access and feed state.
- `src/i18n/` contains language state and translation helpers.
- `src/styles/` contains the theme and application styles.
- `supabase/` contains schema, seed, storage, and maintenance SQL/scripts.

## Implementation Rules

- Follow the existing React and CSS patterns before introducing abstractions.
- Keep changes scoped to the requested behavior; avoid unrelated refactors.
- Use `useI18n()` and database-backed strings for user-facing text.
- Use `useFeed()` or `useFeedData()` for feed and Supabase state rather than duplicating queries.
- Preserve responsive behavior, especially the mobile navigation and search form.
- Do not put secrets in source control. Keep local credentials in `.env` or `.env.local`.
- Do not edit generated `dist/` output; it is rebuilt by Vite.

## Supabase

- Treat `supabase/schema.sql` and existing database contracts as authoritative.
- Keep client-side access compatible with the public/publishable Supabase key.
- Handle loading, empty, and error states for database-backed UI.
- Do not change seed data or schema unless the task requires it.

## Verification

Before finishing a change:

1. Run `npm run build`.
2. Check the affected route at desktop and mobile widths when UI is involved.
3. Confirm no local environment files or generated output are staged.
4. Report any verification that could not be run.

## Git and Deployment

- Use the project-local Git identity configured in `.git/config`.
- Keep commits focused and use clear messages.
- Vercel deploys from the connected GitHub repository when changes are pushed to `main`.
- Do not force-push or rewrite history unless explicitly requested.
