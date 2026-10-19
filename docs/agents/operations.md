# Operations: environment, setup, deploy, analytics

## Environment variables

Defined in `.env` (copy from `.env.example`; `.env` and `.env.*` are gitignored except the example):

| Var | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser-safe `sb_publishable_…` (or legacy anon) key |

Both are inlined into the bundle at build time by Vite, so they must also be set in the
Vercel project settings. Never add a service-role/secret key to any `VITE_*` variable.
Without them `supabase` is `null`, `hasSupabase` is `false`, auth is disabled and
`AppGate` shows the error screen.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173 (strictly `vite`)
npm run build        # dist/
npm run preview
```

`.claude/launch.json` defines two launch configs: `dev` (5173) and `dev-preview`
(`npm run dev -- --port 5199 --strictPort`).

Optional local Supabase: `supabase start` with `supabase/config.toml` (project_id
`license_plate`, API 54321, DB 54322, Studio 54323, Postgres 17). `supabase db reset`
applies migrations; `config.toml` points the seed at `./seed.sql`, which does not exist,
so there is no sample data beyond provinces. Local Google OAuth is not configured in
`config.toml` (`[auth.external.google]` absent), so signing in locally needs extra setup.

## Hosted Supabase setup (one-time)

1. Create the project; copy URL + publishable key into `.env` / Vercel.
2. Apply migrations: `supabase link` then `supabase db push`, or paste each file into
   the SQL editor in filename order.
3. Auth → Providers → enable Google with a Google Cloud Web OAuth client whose authorized
   redirect URI is the Supabase callback URL (`https://<ref>.supabase.co/auth/v1/callback`).
4. Auth → URL Configuration: Site URL = production URL; add localhost and Vercel preview
   URLs to the redirect allow-list (the app redirects back to the current page path).
5. Grant admin to moderators (SQL in `database.md`).

## Deployment (Vercel)

- Vercel builds `npm run build` and serves `dist/` on every push to `main`
  (preview deployments for other branches if enabled).
- `vercel.json`:
  - SPA rewrite `/(.*) → /index.html`.
  - Security headers on all paths: CSP, `X-Frame-Options: DENY`, `nosniff`,
    `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (no camera/mic/geo), HSTS.
- **CSP** allows: scripts from self + inline + `googletagmanager.com`; connect to self,
  `*.supabase.co`, Google Analytics/Tag Manager; images from self, `data:`, `blob:`,
  `*.supabase.co`; inline styles. If you add a new third-party origin (fonts, images,
  APIs, Google avatar URLs `lh3.googleusercontent.com`, etc.) you must extend the CSP or it
  will be blocked in production but work in `npm run dev`.
- Database migrations are **not** part of the Vercel deploy; apply them manually and
  before deploying client code that depends on them.

## Analytics

GA4 measurement id `G-JYR5WCMBJ0` is hard-coded in `index.html`. `trackEvent(name, params)`
(`src/lib/analytics.js`) is a no-op if `window.gtag` is missing (ad blockers).

Current events:

| Event | Params | Where |
|---|---|---|
| `plate_search` / `plate_search_error` | `search_location` (`home_search`/`compact_search`) | `PlateSearch` |
| `plate_view` | `region`, `has_comments` | `PlateDetail` (once per plate) |
| `comment_form_opened` | `source` (`plate_detail`/`navigation`) | `NewComment` |
| `comment_validation_error`, `comment_publish_error` | — | `NewComment` |
| `comment_published` | `category`, `has_photo`, `region` | `NewComment` |
| `photo_attached` | `file_type` | `NewComment` |
| `comment_vote` | `direction` | `CommentCard` |
| `comment_soft_deleted` | — | `CommentCard` (admin) |
| `comments_sort_change` | `sort` | `Comments` |
| `comments_load_more` | — | `InfiniteComments` |
| `province_directory_view`, `rankings_view` | — | pages |
| `language_change` | `language` | `LangSwitch` |
| `sign_in_click`, `sign_in_success` | `method: google` | `AuthControl`, `AuthContext` |

Vercel Speed Insights is injected in `src/main.jsx`.

## Git

- Remote: `https://github.com/olehrechukh/license-plate`, default branch `main`.
- Author identity used by the owner: `olehrechukh`.
- No CI workflows, no pre-commit hooks, no tests. `npm run build` is the only gate.
