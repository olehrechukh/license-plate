# Agent Instructions

Entry point for any coding agent in this repository (Claude Code reads it through `CLAUDE.md`;
Factory Droid, Codex, Cursor and others read it directly). This file owns **how to work here**
(rules, commands, verification). Facts about the system live in `docs/agents/` — read the file
that matches your task.

## Single source of truth

Every fact and rule has exactly **one** owner file (see the table below). Other files link to the
owner instead of restating it. When you add or change information, edit the owner and link to
it; if you find the same fact in two places, keep it in the owner and replace the copy with a
link.

| Owner                                                        | Owns                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (this file)                                      | Working rules, commands, verification, git workflow, how skills apply                                 |
| [`docs/agents/architecture.md`](docs/agents/architecture.md) | Stack, source layout, providers, routes, components, data flow, i18n, styling, storage keys           |
| [`docs/agents/database.md`](docs/agents/database.md)         | Tables, views, RLS, RPCs, storage bucket, migration history, admin role, migration checklist          |
| [`docs/agents/domain.md`](docs/agents/domain.md)             | Plate format and regions, categories, posting, voting, scoring, moderation                            |
| [`docs/agents/operations.md`](docs/agents/operations.md)     | Env vars, local and hosted setup, deploy, CSP, CI, analytics events                                   |
| [`docs/agents/known-issues.md`](docs/agents/known-issues.md) | Known bugs, tech debt, stale code comments — check before "fixing" something                          |
| [`.claude/skills/README.md`](.claude/skills/README.md)       | Which skills exist, their sources and licenses, how they are shared with Factory (`.factory/skills/`) |
| `.factory/skills/review-guidelines/SKILL.md`                 | Review priorities (P0–P3): maps the rules owned elsewhere to severities; contains no rules of its own |
| `README.md`                                                  | Human quick start only; links here                                                                    |

## Project

**AutoKarma** (АвтоКарма) is a Ukrainian "rate drivers by license plate" site: search a plate,
read and post reports about the driver (Google sign-in), vote on reports, and see a monthly
leaderboard of the worst plates. Stack and layout: [architecture.md](docs/agents/architecture.md).

## Commands

- `npm install` — install dependencies.
- `npm run dev` — dev server on http://localhost:5173.
- `npm run build` — production build to `dist/`. `npm run preview` serves it.
- `npm run format` — Prettier (no semicolons, single quotes, no trailing commas, 120 columns).
- `npm run lint` — ESLint 9 (`@eslint/js` recommended + React, React Hooks, React Refresh).
- `npm run check` — `format:check` + `lint` + `build`; the same gate CI runs.
- There is no test runner.

Running the app needs Supabase env vars — see [operations.md](docs/agents/operations.md#environment-variables).

## Implementation rules

General:

- Follow existing React and CSS patterns before introducing abstractions: function components and
  hooks, no new state libraries, plain CSS per [architecture.md](docs/agents/architecture.md#styling-srcstyles).
- Keep changes scoped to the request; no unrelated refactors or reformatting.
- No new dependencies without the owner's approval.
- Do not edit `dist/`; do not commit `.env*` files or secrets.

Frontend:

- User-facing text goes through `useI18n()` and is added to **both** `uk` and `en` in
  `src/i18n/strings.js` ([i18n](docs/agents/architecture.md#i18n-srci18n)).
- Use `useFeed()` / `useFeedData()` for global data and `useComments()` / `feedApi.js` for comment
  lists; no ad-hoc `supabase.from(...)` calls in components
  ([data layer](docs/agents/architecture.md#data-layer-srcdata)).
- Database-backed UI handles loading, empty and error states.
- Effects that fetch must ignore stale results (the `cancelled` flag pattern in `src/pages/`).
- Paged queries keep a stable tiebreaker (`.order('id')`).
- Optimistic updates roll back on failure (as `castVote` does).
- Plate input and categories follow [domain.md](docs/agents/domain.md); keep every place it lists
  in sync.
- Never render user content with `dangerouslySetInnerHTML`; user-supplied URLs must be `http(s)`
  only.
- `trackEvent()` params never contain PII (emails, names, comment text).
- A new third-party origin needs a CSP update ([operations.md](docs/agents/operations.md#deployment-vercel)).
- Keep the mobile navigation and search form working at the `760px` breakpoint.

Security and database:

- Admin checks in React (`app_metadata.role`) are UI only; real enforcement must be in RLS or an RPC
  ([database.md](docs/agents/database.md#admin-role)).
- Only the publishable Supabase key may reach the browser
  ([env vars](docs/agents/operations.md#environment-variables)).
- `supabase/migrations/` is the schema's source of truth. Follow the
  [migration checklist](docs/agents/database.md#writing-a-new-migration) for any schema change.
- Do not change reference data (provinces) or schema unless the task requires it.

## Verification

Before finishing a change:

1. Run `npm run format`, then `npm run check` — it must pass.
2. For UI changes, check the affected route at desktop and mobile widths
   ([launch configs](docs/agents/operations.md#local-development)).
3. Confirm no `.env*` files or `dist/` output are staged.
4. Report any verification you could not run (for example, no Supabase credentials).

## Git

- Use the project-local Git identity from `.git/config` when present.
- Focused commits with imperative messages (e.g. "Add admin import and soft deletion").
- Do not force-push or rewrite history unless explicitly asked.
- Pushing to `main` deploys to production; migrations are applied separately
  ([deployment](docs/agents/operations.md#deployment-vercel)).

## Agent skills

Installed skills and their sources: [`.claude/skills/README.md`](.claude/skills/README.md).
When to use them:

- `karpathy-guidelines` — every code change (KISS: minimum code, surgical edits, stated assumptions).
- `react-best-practices` — writing or reviewing React components and data fetching.
- `systematic-debugging` — any bug or failing build; record unfixed bugs in
  [known-issues.md](docs/agents/known-issues.md) with symptom, `file:line` and root cause.
- `verification-before-completion` — before claiming work is done; the command is `npm run check`.
- `review-guidelines` — reviewing a diff or PR (Claude `/code-review`, Factory Droid review).

How they apply here (these overrides win over the skills):

1. Precedence: this file > `karpathy-guidelines` > `react-best-practices`. When a rule would add
   code or complexity, simplicity wins.
2. This is a client-only Vite SPA on React 18: skip the Next.js, Server Components, server-action,
   `next/dynamic` and `server-*` rules in `react-best-practices`, and its React 19-only APIs.
3. Dependencies a skill suggests (SWR, `better-all`, `lru-cache`, …) fall under the
   no-new-dependencies rule above.
4. Apply skill rules only to code the task already changes, never as a refactor of untouched code.
5. Where a skill says "write a test", use a one-off reproduction plus `npm run check`.
   `superpowers:test-driven-development` is not installed.

## Keeping the knowledge base current

When a change affects something an owner file describes, update that owner in the same change.
When you fix an item in `known-issues.md`, remove it there.
