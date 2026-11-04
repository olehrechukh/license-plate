# Operations: environment, setup, deploy, analytics

## Environment variables

Defined in `.env` (copy from `.env.example`; `.env` and `.env.*` are gitignored except the example):

| Var                             | Value                                                |
| ------------------------------- | ---------------------------------------------------- |
| `VITE_SUPABASE_URL`             | `https://<project-ref>.supabase.co`                  |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser-safe `sb_publishable_…` (or legacy anon) key |

Both are inlined into the bundle at build time by Vite, so they must also be set in the
Vercel project settings.
Without them `supabase` is `null`, `hasSupabase` is `false`, auth is disabled and
`AppGate` shows the error screen.

## Local development

Commands are listed in [`AGENTS.md`](../../AGENTS.md#commands).

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

| Event                                               | Params                                             | Where                          |
| --------------------------------------------------- | -------------------------------------------------- | ------------------------------ |
| `plate_search` / `plate_search_error`               | `search_location` (`home_search`/`compact_search`) | `PlateSearch`                  |
| `plate_view`                                        | `region`, `has_comments`                           | `PlateDetail` (once per plate) |
| `comment_form_opened`                               | `source` (`plate_detail`/`navigation`)             | `NewComment`                   |
| `comment_validation_error`, `comment_publish_error` | —                                                  | `NewComment`                   |
| `comment_published`                                 | `category`, `has_photo`, `region`                  | `NewComment`                   |
| `photo_attached`                                    | `file_type`                                        | `NewComment`                   |
| `comment_vote`                                      | `direction`                                        | `CommentCard`                  |
| `comment_soft_deleted`                              | —                                                  | `CommentCard` (admin)          |
| `comments_sort_change`                              | `sort`                                             | `Comments`                     |
| `comments_load_more`                                | —                                                  | `InfiniteComments`             |
| `province_directory_view`, `rankings_view`          | —                                                  | pages                          |
| `language_change`                                   | `language`                                         | `LangSwitch`                   |
| `sign_in_click`, `sign_in_success`                  | `method: google`                                   | `AuthControl`, `AuthContext`   |

Vercel Speed Insights is injected in `src/main.jsx`.

## CI

`.github/workflows/ci.yml` runs `npm ci` and `npm run format:check`, `lint`, `build` (Node 22) on
every pull request and push to `main`. No pre-commit hooks, no tests.

`.github/workflows/qa.yml` runs functional QA on pull requests. It resolves the branch's Vercel
preview deployment through the GitHub Deployments API, runs the `qa` skill
([`.factory/skills/qa/`](../.factory/skills/qa/SKILL.md)) against it, and posts a single
updating PR comment with the report. Fork pull requests are skipped because they get no
secrets.

Required repository secrets:

| Secret                            | Purpose                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `FACTORY_API_KEY`                 | Authenticates `droid exec` in the workflow.                                           |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Bypasses Vercel Authentication on preview deployments.                                |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | Publishable key for the API-level RLS checks. Public by design, but kept as a secret. |

`VERCEL_AUTOMATION_BYPASS_SECRET` is generated in the Vercel project's Deployment Protection
settings (Settings → Deployment Protection → Protection Bypass for Automation → Create). Without
it the preview deployment redirects to `vercel.com/sso-api` and every web test is reported as
BLOCKED. The workflow sends it as the `x-vercel-protection-bypass` header together with
`x-vercel-set-bypass-cookie: true`, so the browser stays authorized across later navigations.

The Vercel project is on the **Hobby** plan with `ssoProtection` set to
`all_except_custom_domains`, so every preview deployment is behind Vercel Authentication.
Two access paths exist:

- **CI (in use):** the static bypass secret above. It works on all plans and needs no
  dashboard rule for GitHub Actions.
- **Local:** a short-lived Trusted Sources OIDC token from the Vercel CLI, which needs no
  static secret. Requires Vercel CLI 53.3.0+, an authenticated `vc whoami`, and the
  project's default self-access rule (development → preview):

  ```bash
  TOKEN="$(vc project token license-plate --scope olehrechukhs-projects)"
  agent-browser open "$PREVIEW_URL" --headers "{\"x-vercel-trusted-oidc-idp-token\":\"$TOKEN\"}"
  ```

  GitHub Actions Trusted Sources are not reliable on the Hobby plan, which is why CI uses the
  bypass secret instead.

In agent-browser, always use `open --headers` for the bypass. `agent-browser set headers`
applies headers globally, so the secret would be sent to every origin the page loads.

**Preview deployments share the production Supabase project.** The Vercel build inlines
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, so a preview reads and writes the same
database as production. QA is therefore read-only apart from one anonymous vote that it clears
itself. See `.factory/skills/qa/config.yaml`.

## Repository

Remote `https://github.com/olehrechukh/license-plate`, default branch `main`; the owner commits as
`olehrechukh`. Git rules: [`AGENTS.md`](../../AGENTS.md#git).
