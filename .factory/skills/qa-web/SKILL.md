---
name: qa-web
description: >
  QA tests for the AutoKarma web app (React + Vite SPA). Covers plate search,
  plate detail, province directory, comment feed, rankings, language switching,
  responsive navigation, and the sign-in gate. Uses droid-control for browser
  interaction.
---

# QA Sub-Skill: Web (AutoKarma SPA)

## Testing Target

This app is deployed to Vercel via the Git integration. The branch's code is
served by a **Vercel preview deployment**.

1. Use the preview URL passed by the workflow via the `PREVIEW_URL` environment
   variable -- do NOT re-resolve it.
2. If a Vercel bypass secret is needed, apply it on the first request.
3. If no preview URL was provided, report ALL web tests as BLOCKED: "No Vercel
   preview URL available -- cannot verify branch code." Do NOT fall back to
   dev/staging/prod URLs -- those deployments run different code than the PR
   branch and testing against them produces meaningless results.

### Applying the Vercel bypass

Preview deployments are protected by Vercel Authentication. A request without
the bypass header gets a 302 to `vercel.com/sso-api` and the agent sees a
login page instead of the app.

Pass BOTH headers to agent-browser on the first navigation:

```bash
agent-browser open "$PREVIEW_URL" \
  --headers "{\"x-vercel-protection-bypass\":\"$VERCEL_AUTOMATION_BYPASS_SECRET\",\"x-vercel-set-bypass-cookie\":\"true\"}"
```

- `x-vercel-protection-bypass` carries the secret.
- `x-vercel-set-bypass-cookie: true` makes Vercel set a `_vercel_jwt` cookie so
  later in-browser navigation stays authorized. Without it, a page reload or a
  form submit can bounce back to the login page mid-run.

Verified behavior of `agent-browser open --headers`:

- It applies to the document request, to same-origin `fetch`/XHR calls, and to
  every later navigation in the same session. One call at the start of the
  session is enough.
- It is scoped to the URL's origin, so the secret is not sent to third-party
  origins the page loads (Google Analytics, Supabase).

**Never use `agent-browser set headers` for the bypass secret.** That command
sets headers globally for the whole browser, so the secret is sent to every
origin the page touches. Use `open --headers` instead.

If the secret is missing, `agent-browser open` without headers lands on the
Vercel login page; treat that as BLOCKED with the reason "preview URL requires
a Vercel bypass secret that is not configured".

**Do not print the secret.** It arrives in `VERCEL_AUTOMATION_BYPASS_SECRET`;
pass it to the command through the shell variable and never echo it, log it, or
paste it into the report. Treat any saved browser state containing the
`_vercel_jwt` cookie as a credential.

#### Local alternative: Trusted Sources OIDC (no static secret)

When running locally and the Vercel CLI is logged in, a short-lived OIDC token
reaches the same protected preview without any static secret:

```bash
TOKEN="$(vc project token license-plate --scope olehrechukhs-projects)"
agent-browser open "$PREVIEW_URL" \
  --headers "{\"x-vercel-trusted-oidc-idp-token\":\"$TOKEN\"}"
```

Requirements: Vercel CLI 53.3.0 or newer, an authenticated `vc whoami`, and
the project's default self-access rule (development to preview). The token is
short-lived: mint a new one if the session is closed or the run takes longer
than the token's lifetime. Never write the token to a file.

CI uses the static bypass secret instead, because the project is on the Hobby
plan and GitHub Actions Trusted Sources are not reliable there.

### Environment behavior for preview deployments

A Vercel preview deployment serves the branch's frontend code but connects to
the **same** Supabase project as production, because `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` are inlined at build time and resolve to the
same project. Preview is therefore a dev environment with a production backend.

That means:

- Use dev flows against a preview URL. There are no separate prod/preprod flows
  in this app.
- Do NOT create real reports on real plates, upload real photos, or cast real
  votes against a preview URL. Those become visible to real users on the public
  site and count toward the monthly leaderboard.
- The only writes permitted from this sub-skill are the anonymous vote
  round-trip in flow `vote-anonymous`, which cleans up after itself.
- Read-only browsing against a preview is safe and unrestricted.

## App-specific configuration notes

- **The UI is in Ukrainian by default.** `config.defaultLang` is `'uk'`, so a
  fresh browser shows Ukrainian text. The language switch persists the choice
  in `localStorage` under `lp-lang`. **Switch to EN before matching on any
  visible button label.** The sort buttons in particular have no `aria-label`,
  so their text is the only usable selector.
- **Routes** (`src/App.jsx`): `/`, `/provinces`, `/provinces/:slug`, `/comments`,
  `/rankings`, `/plate/:plate`, `/new-comment`, `/terms`, `/contact`, and a
  catch-all `*` for NotFound.
- **Boot gate**: `AppGate` blocks the whole app until `FeedProvider` loads
  provinces, rankings and province counts. Wait for that to resolve before
  asserting on content.
- **The plate search input** is a text input inside a form with `role="search"`.
  The visible label is only rendered in the full (home) variant; the compact
  header variant relies on `aria-label`. Select it with
  `find role textbox` or by its `aria-label`, not by visible text.
- **The sort toggle** on `/comments` is a `role="group"` (labelled "sort") with
  two buttons, each with class `sort-toggle__btn`. The active one carries the
  class `is-active`. The button labels are "Newest" and "Top voted" in
  English, "Найновіші" and "Найпопулярніші" in Ukrainian. There is no
  `aria-label` on the buttons, so match on the visible text after switching to
  EN, or select by the `.sort-toggle__btn` class and read its text.
- **The language switch** is a `role="group"` labelled by `langSwitch.label`
  with one button per language (`UK`, `EN`). The active one has
  `aria-pressed="true"`.
- **Vote buttons** are inside a `role="group"` labelled by `vote.label`. The
  upvote button renders an ASCII `+` (U+002B). The downvote button renders a
  **U+2212 MINUS SIGN**, not an ASCII hyphen. Select them by the
  `.votebtn--up` and `.votebtn--down` classes or by `aria-label` rather than by
  the character. The accessible names are "Upvote" / "Downvote" in English and
  "Підтримати" / "Не погоджуюсь" in Ukrainian, so match the label to the
  current language.
- **Mobile nav** is behind a `.nav-toggle` button with `aria-label="Menu"` and
  `aria-expanded`. The nav element has the class `site-nav` and gains the
  class `is-open` when expanded, so the open state is `.site-nav.is-open`, not
  `.nav.is-open`. The breakpoint is 760px.
- **The `+` in a ranking score** means a positive score. Lower (more negative)
  scores are worse drivers. Do not assume a higher score is better.
- **The "add a comment" CTA** on the plate page uses the string
  `plateDetail.addCommentCta`: "Add a comment about this plate" in English,
  "Додати коментар про цей номер" in Ukrainian. There is no button labelled
  "Add a report" anywhere in the app; the app's terminology is "comment".
- **The admin Delete button** uses `comments.delete`. Deleting is gated on
  `window.confirm`, so a confirmation dialog must be accepted explicitly.
- **Plate codes**: two region letters, four digits, two series letters, for
  example `BC 9563 HK`. Only the 12 letters shared by Cyrillic and Latin
  appear. Ukrainian Cyrillic input must be normalized to Latin look-alikes.

## Flow menu

This is a MENU of available flows, not a checklist. The orchestrator picks only
the flows relevant to the current diff.

### `boot-gate`

Confirm the app boots past the data gate.

- Open `/` and wait for network idle.
- Success: the hero title and the plate search form are visible. The
  "Could not load data / Не вдалося завантажити дані" screen is NOT shown.
- Failure mode: the error screen means the build was made without the Supabase
  env vars. That is a build configuration problem, not an application bug.

### `plate-search-valid`

- Enter a valid plate such as `BC 9563 HK` (spaces and lowercase are fine) and
  submit.
- Success: the URL becomes `/plate/BC9563HK` and the plate detail page shows the
  normalized plate code. The plate may have zero comments; that is a valid
  result.

### `plate-search-invalid`

- Enter something that is not a valid plate, for example `AB` (too short) or
  `!!!`.
- Success: the page does NOT navigate (the URL stays on the current route).
  The input gains the `has-error` class and `aria-invalid="true"`.

### `plate-search-cyrillic`

- Enter a plate using Cyrillic letters that have Latin look-alikes, for example
  `АВ 1234 СХ`.
- Success: navigation goes to the Latin-normalized plate, for example
  `/plate/AB1234CX`. This is the `normalizePlate` mapping in
  `src/data/useFeedData.js`.

### `plate-detail`

- Open `/plate/AC2737CO` (a plate that has reports).
- Success: the plate code is shown, the region name is shown, a score is shown
  ("Score: N" and "Reports this month: N"), and the comment list contains at
  least one card.
- Two different links point at the comment form, and both exist in the DOM:
  - the header nav link "Add comment", whose href is `/new-comment`
  - the plate page CTA "Add a comment about this plate", whose href is
    `/new-comment?plate=AC2737CO`

  Assert on the plate CTA by its `href` containing `plate=AC2737CO`, not by
  text, because "Add comment" also matches the header link.

### `plate-detail-empty`

- Open `/plate/ZZ0000ZZ` for a plate with no reports.
- Success: the empty state is shown and no comment cards are present. The
  plate header may still render.

### `comment-feed-and-sort`

- Switch the language to EN first (see `language-switch`).
- Open `/comments`.
- Success: the sort toggle is visible and a list of comment cards is shown.
- Click the "Top voted" button.
- Success: the button gains `is-active`, and the card order changes or stays
  stable by net score. The ordering is `net desc, created_at desc, id asc`.
- Click "Newest" and confirm the order returns to `created_at desc, id asc`.

### `comment-infinite-scroll`

- Open `/comments` and scroll to the bottom.
- Success: additional cards load without a click. The sentinel uses a 600px
  `rootMargin`, so scroll near the bottom rather than exactly at it.
- Note: the database currently holds only a few comments, so there may be
  nothing to load. A single page with no sentinel is a valid result.

### `province-directory`

- Open `/provinces`.
- Success: all 27 region cards render (`.province-card`), each with its region
  code chips (`.code-chip`, four per region) and a comment count
  (`.province-card__count`).
- Click any region card.
- Success: the URL becomes `/provinces/<slug>` and the province page lists the
  comments for that region.
- Also verify a slug that does not exist renders an empty state rather than a
  crash.

### `rankings`

- Open `/rankings`.
- Success: the ranking period (`YYYY-MM`) is shown, for example
  "Period: 2026-10", and the table renders with the columns RANK, PLATE,
  REGION, SCORE, COMMENTS.
- The leaderboard shows only the top 10 plates for the current calendar month.
  An empty table body is valid in a month with no reports. The table headers
  still render in that case, so assert on the header row, not on the number of
  body rows.
- The period label comes from the browser's local time while the score comes
  from the server's UTC month. Near a month boundary the label and the data
  can disagree.

### `language-switch`

- Open `/` and click the `EN` button in the language switch.
- Success: the page text changes to English and the `EN` button has
  `aria-pressed="true"`. The `<html lang>` attribute becomes `en`.
- Click `UK` and confirm it switches back.
- The choice persists in `localStorage` under `lp-lang`.

### `responsive-nav`

- Set the viewport to a mobile width (for example 390x844).
- Success: the hamburger `.nav-toggle` is visible and the nav links are hidden.
- Click the toggle.
- Success: `aria-expanded` becomes `true` and the nav gains `is-open`. The
  links are now visible and reachable.
- Click a nav link and confirm the menu closes and navigation happens.
- Repeat at a desktop width (for example 1280x800) and confirm the nav links
  are visible without the toggle.

### `sign-in-gate`

- Open `/new-comment` while signed out.
- Success: a sign-in gate is shown instead of the report form. The gate renders
  the text "Please sign in to add a comment." and a "Sign in with Google"
  button. The report fields are absent: no category `<select>`, no description
  `<textarea>`, and no photo file input.
- Note that a `<form>` element is still present on the page, because the
  header search is a form. Assert on the **absence of the report fields**, not
  on the absence of a form.

### `vote-anonymous`

- Open `/comments` as an anonymous visitor and click the upvote button
  (`.votebtn--up`) on a card.
- Success: the up count increments and the button gains `aria-pressed="true"`.
- Click the same button again.
- Success: the count returns to its previous value and `aria-pressed` becomes
  `false`. This is the toggle behavior of `castVote`.
- **This is the only write flow permitted against a preview URL.** The vote is
  anonymous and reversible, but it does briefly change a public score.
- **The browser vote is NOT recorded under the backend suite's fixed voter key.**
  The browser uses `voterKey()` from `src/lib/supabase.js`, a random UUID
  persisted in `localStorage['lp-voter']`. To clean up a browser vote, either
  toggle it off in the UI (preferred, it sends `p_value 0` for the same key) or
  read the actual key from `localStorage` and clear it with that value.
  Clearing with a different key leaves the vote row behind and permanently
  inflates that comment's `ups` in the public aggregate.

### `admin-delete`

- Open `/comments` as a user with `app_metadata.role = 'admin'`.
- Success: each card shows a Delete button. Clicking it opens a confirmation
  dialog. Accept it explicitly with `agent-browser dialog accept` (the delete
  is gated on `window.confirm`, which is not auto-accepted), then confirm the
  card is removed from the list.
- Requires a signed-in admin session. See "Google sign-in cannot be automated".

## Google sign-in cannot be automated

The only sign-in path in this app is Google OAuth via `supabase.auth.signInWithOAuth`.
In a non-interactive CI environment there is no human to complete the Google
consent screen, and Google actively blocks automated sign-in flows.

Consequences:

- The `signed_in` and `admin` personas cannot be driven by an automated browser
  session. Flows `sign-in-gate` (signed out) and `vote-anonymous` (no session
  needed) are the only ones that can run unattended.
- The `admin` role is a JWT claim set with SQL against `auth.users`, and the
  user must sign out and back in for the claim to appear in the session.
- There is no email/password fallback in the app. The `strings.*.login` keys
  exist but the form is not implemented.

If a human provides a signed-in session (for example by exporting the session
from a local browser), flows requiring auth can run against it. Otherwise report
them as BLOCKED with the reason "Google OAuth requires interactive sign-in".

## Known failure modes

1. **Preview redirects to a Vercel login page.** The deployment is protected by
   Vercel Authentication. The bypass header must be set on the first request.
   Check that `VERCEL_AUTOMATION_BYPASS_SECRET` is set. A redirect that happens
   only on a LATER navigation (after the page already loaded) means the
   `x-vercel-set-bypass-cookie: true` header was missing.
2. **The app shows the bilingual "Could not load data" screen.** The build was
   made without `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY`. Check
   the Vercel environment variable scoping for the Preview environment. This is
   not an application bug.
3. **A comment list appears empty but the database has rows.** Fetch errors after
   boot are swallowed and rendered as an empty list. Verify against the API
   directly before reporting a data bug.
4. **Google avatar images do not load.** The CSP `img-src` in `vercel.json` does
   not include `lh3.googleusercontent.com`. This is a known issue, not a
   regression.
5. **Plate search rejects a valid-looking plate.** Only the 12 letters shared by
   Cyrillic and Latin are valid, and the plate must be 3 to 10 characters of
   `[A-Z0-9]` after normalization.
6. **The ranking period label disagrees with the server month.** The label is
   computed in the browser's local time while the score is computed in UTC.
   Expected near month boundaries.
7. **The photo field accepts images only.** The label says "Photo or video" but
   the input accepts `image/*` and the storage bucket allows only
   `image/jpeg|png|webp|gif`. HEIC from iPhones is rejected.
8. **Scores look inverted.** A lower score means a worse driver. A report
   starts at -1 and each agreement upvote makes it worse by 1.
9. **`agent-browser read` hangs.** The `read` command does not return on this
   environment, even for a trivial page such as `https://example.com`. It is
   not a property of this app. Use `snapshot -i` for the accessibility tree
   and `get text <selector>` or `eval` for a specific value instead. Never
   let a `read` call block a CI run, and never treat a timed-out `read` as a
   failed assertion.
10. **The browser lands on a Google sign-in page.** A session can end up on
    `accounts.google.com` or on the Supabase hosted sign-in form. The app's
    only route to Google is its Google sign-in button, so this means a click
    or a restored session state triggered the OAuth redirect, not that the app
    misbehaved. Close the session (`agent-browser --session <name> close`) and
    start a new one with a fresh name rather than continuing in it. Google
    OAuth cannot be completed unattended anyway, so a session on that page is
    BLOCKED, not a failure of the app.
