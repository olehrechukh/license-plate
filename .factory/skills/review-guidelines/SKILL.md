---
name: review-guidelines
description: Code review priorities for the AutoKarma repository (React + Vite SPA on Supabase). Use when reviewing a pull request or local diff in this repository, to decide what to flag and at which priority.
---

# Review guidelines — AutoKarma

This file assigns **priorities** only. The rules themselves live in their owner files (see the
"Single source of truth" table in `AGENTS.md`); read the linked sections before reviewing. Do
not restate rules here — add or change them in the owner file and link to it.

Flag only what the diff introduces. Problems already listed in `docs/agents/known-issues.md`
are out of scope unless the diff makes them worse.

## Priorities

| Priority | Meaning |
| --- | --- |
| **P0** | Security hole or data exposure/loss |
| **P1** | Broken behavior or a broken contract |
| **P2** | Project rule violated |
| **P3** | Worth fixing, not blocking |

## P0 — security and data

- Any violation of `AGENTS.md` → "Implementation rules" → **Security and database**.
- Any violation of the frontend security rules in `AGENTS.md` → "Implementation rules" →
  **Frontend**: non-`http(s)` user URLs, PII in `trackEvent()`.
- A migration that breaks a check from `docs/agents/database.md` → "Writing a new migration",
  "RLS policies (current)" or "Votes" (vote privacy).

## P1 — behavior and contracts

- Contracts in `docs/agents/database.md`: view columns, RPC signatures, migration process.
- Domain rules in `docs/agents/domain.md`: plate validation, category key sync, scoring.
- Data-flow rules in `AGENTS.md` → "Implementation rules" → **Frontend** (loading/empty/error
  states, CSP for new origins) and in `docs/agents/code-style.md` → "Hooks and state" and
  "Async and errors" (stale effects, stable paging, optimistic rollback).

## P2 — project rules

- Code style in `docs/agents/code-style.md` that lint does not enforce (lint-enforced rules are
  out of scope — see "Do not flag").
- Everything else in `AGENTS.md` → "Implementation rules" (scope, i18n, data layer, responsive,
  dependencies) and `karpathy-guidelines` (KISS).
- Owner file not updated when the change affects what it describes (`AGENTS.md` → "Keeping the
  knowledge base current").

## Do not flag

- Formatting and anything marked **(lint)** in `docs/agents/code-style.md` — CI runs `npm run check`.
- Advice that `AGENTS.md` → "Agent skills" says does not apply here (Next.js, Server
  Components, React 19 APIs).
- Missing unit tests — there is no test runner.
