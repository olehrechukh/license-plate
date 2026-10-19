# AutoKarma

АвтоКарма — rate drivers by their Ukrainian license plate. React + Vite single-page app backed by
Supabase, deployed on Vercel.

## Quick start

```bash
cp .env.example .env   # fill in your Supabase URL and publishable key
npm install
npm run dev            # http://localhost:5173
```

The app needs a Supabase project with the migrations from `supabase/migrations/` applied; without
it you will see a "Could not load data" screen.

## Documentation

- [Setup, environment, deploy](docs/agents/operations.md) — Supabase, Google sign-in, Vercel, CI
- [Architecture](docs/agents/architecture.md) · [Database](docs/agents/database.md) ·
  [Domain rules](docs/agents/domain.md) · [Known issues](docs/agents/known-issues.md)
- [Contributing rules and commands](AGENTS.md) — for people and coding agents alike
