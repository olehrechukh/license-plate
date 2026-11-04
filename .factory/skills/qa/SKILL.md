---
name: qa
description: >
  Run QA tests for AutoKarma. Analyzes git diff to determine affected areas,
  runs configured test flows with multiple personas, and generates diff-targeted
  tests. Uses droid-control for browser, terminal, and desktop interactions.
  Use when testing PRs, releases, or smoke testing environments.
---

# QA Orchestrator

**SCOPE: This skill performs manual/functional QA only -- verifying that the
application actually works by interacting with it as a real user would (browser,
API calls). Do NOT run or report on CI checks, linting, ESLint, typecheck, unit
tests, or any static analysis. Those are handled by separate workflows.**

## Step 1: Load Configuration

Read `.factory/skills/qa/config.yaml` for environment URLs, credentials, personas,
and app definitions.

For every affected interactive app, invoke the `droid-control` skill before
interacting with the app. Follow its routing tables:

- Load the target driver selected for the app.
- Use the Capture and Verify stages on every run.
- Load Compose only when both `video_evidence: true` and
  `droid_control.compose: true`.
- When `droid_control.compose: false`, never invoke Compose. Keep raw captures
  and text snapshots as evidence.

Treat `droid_control.compose` as a runtime toggle. Read it on every run; do not
cache the install-time answer. Do not repeat the resolved boolean in this file
or any app sub-skill. Keep all branch instructions conditional on the config value
so changing the config is sufficient.

## Step 2: Determine Target Environment

Use the `default_target` from config unless the user specifies a different
environment. Respect any environment restrictions.

**The `preview` target URL is not in config.** It is supplied at runtime:

- In CI, the workflow passes it as the `PREVIEW_URL` environment variable.
- Locally, resolve it yourself or ask the user for it.

**CRITICAL: Vercel preview deployments are protected by Vercel Authentication
(SSO).** A plain request to a preview URL returns a 302 to `vercel.com/sso-api`,
not the app. Requests must carry the automation bypass headers:

```
x-vercel-protection-bypass: <value of VERCEL_AUTOMATION_BYPASS_SECRET>
x-vercel-set-bypass-cookie: true
```

The secret is read from the `VERCEL_AUTOMATION_BYPASS_SECRET` environment
variable. If that variable is not set, you cannot reach a preview deployment at
all. In that case report every web test as BLOCKED with the reason "no Vercel
bypass secret available" and do NOT fall back to the production URL.

Never print, log, or echo the secret. Pass it through the shell variable only.

**Do NOT fall back to a remote environment.** Production and preview run
different code. Testing a PR branch against production tells you nothing about
the branch. If the preview URL is unavailable, report BLOCKED.

**Preview shares the production database.** The Vercel build inlines
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, so a preview
deployment reads and writes the same Supabase project as production. See
"Environment behavior for preview deployments" in the qa-web sub-skill for what
this permits.

## Step 3: Analyze Git Diff

Determine the changed files and map them to apps using the `path_patterns` in
config.yaml.

**Always diff against a base ref, never against the working tree.** In CI the
checkout is clean, so a bare `git diff` returns nothing and every run would be
misreported as INCONCLUSIVE.

- If `QA_BASE_REF` is set in the environment, use it:
  `git diff ${QA_BASE_REF}...HEAD --name-only`
- Otherwise use the merge base with the default branch:
  `git diff $(git merge-base HEAD origin/main)...HEAD --name-only`
- If neither is available, fall back to `git diff --name-only` against the
  working tree, which is correct for a local run with uncommitted changes.

Files that do not match ANY app's `path_patterns` (for example
`.factory/skills/**`, `docs/**`, `.github/**`, `AGENTS.md`) are NOT associated
with any app. Do NOT run app test flows for them.

For each affected app:

- Run ONLY that app's flows from its module file
- Generate ADDITIONAL targeted tests based on the specific changes in the diff

For apps NOT affected by the diff:

- Do NOT load or run their module. Do NOT run their flows. Do NOT run their
  pre-flight checks. They are completely out of scope.
- Do not test the backend if only web files changed. Do not test the browser if
  only migrations changed. The diff determines scope, period.

If NO app is affected by the diff (for example docs-only, CI-only, or
config-only changes), report as INCONCLUSIVE: "No app code changed -- QA not
applicable for this diff." Do NOT run any app flows.

## Step 4: Pre-flight Checks (app-specific only)

Run pre-flight checks ONLY for the apps that are affected by the diff.

For the `web` app:

- `droid-control@factory-plugins` active -> `droid plugin list --scope project`
- `agent-browser` available -> `agent-browser --version`
- Preview URL reachable with the bypass header (see Step 2)

For the `backend` app:

- Supabase URL and publishable key present in the environment
- `curl` available

When a pre-flight check fails for an affected app, report it as BLOCKED with the
specific error and remediation steps -- but still proceed with other affected
apps.

## Step 5: Execute Diff-Relevant Flows Only

For each app that IS affected by the diff, read its sub-skill:

- `.factory/skills/qa-web/SKILL.md`
- `.factory/skills/qa-backend/SKILL.md`

The sub-skill contains a MENU of available test flows. You must:

1. Read the diff carefully and identify which flows are relevant
2. Run those flows PLUS any adjacent flows that verify the change integrates
   correctly
3. Do NOT run completely unrelated flows
4. If no existing flow covers the change, write a NEW ad-hoc test that directly
   verifies the changed behavior
5. Do NOT run unit tests, lint, typecheck, or any automated test suite. This is
   manual/functional QA -- interact with the app as a real user would.

## Step 6: Evidence Capture

After each significant test step, capture evidence. Use **text snapshots as
primary evidence** -- they render inline in the PR comment with no image hosting
issues.

For web apps (agent-browser):

- Use the `droid-control` web route; let its agent-browser atom own browser
  mechanics and its Capture atom own the recording lifecycle.
- Capture the page's accessibility tree as text evidence through the routed
  droid-control driver.
- **Do not use `agent-browser read` in this project.** It does not return on
  this environment, even for a trivial page. Use `snapshot -i` for the
  accessibility tree, and `get text <selector>` or `eval` for a specific
  value. A `read` call that hangs must never be reported as a failed
  assertion, and it must not block the run.
- Save screenshot files to `./qa-results/$RUN_ID/` for the artifact upload.
- On GitHub with `video_evidence: false`: do NOT embed `![image](url)` markdown
  in the report; artifact and repository URLs cannot be displayed inline in
  GitHub PR comments. Instead, mention the filename and note that it is
  available in the downloadable artifacts.

For API apps (curl):

- Record the HTTP status code and the relevant part of the response body as
  text evidence in a fenced code block.

Each snapshot MUST show something DIFFERENT. Wait for the UI to change before
capturing again.

## Step 7: Verify

Use the `droid-control` **verify** atom. For every flow, confirm the observed
result against the flow's stated success criteria before recording PASS. A flow
that did not clearly meet its criteria is FAIL, not PASS.

## Step 8: Write the Report

Write the report to `qa-results/report.md` using the structure in
`.factory/skills/qa/REPORT-TEMPLATE.md`. Start it with the `## QA Report`
heading.

## Step 9: Report Results

Summarize the outcome to the user:

- Counts of PASS, FAIL, BLOCKED, FLAKY, INCONCLUSIVE
- Every FAIL and BLOCKED with a one-line reason
- Where the artifacts live

## Step 10: Suggest Skill Updates (Failure Learning)

After generating the report, check if any BLOCKED or FAIL results revealed a
**testing environment insight** that would help future QA runs succeed. This is
about learning how the testing environment works, NOT about fixing bad selectors
or skill typos.

**Good suggestions (environment/workflow knowledge):**

- "Vercel preview deployments require the x-vercel-protection-bypass header, so
  the first request must include it or it redirects to the SSO login page"
- "The app's boot screen stays up until Supabase provinces load, so wait for
  networkidle before asserting on the page"

**Bad suggestions (skill bugs, not environment insights -- do NOT suggest these):**

- "The Delete button text changed from X to Y" -- that is expected from the PR
  diff
- "Selector data-testid=foo does not exist" -- that is a skill bug, fix it
  directly

Format as a table with severity, collapsible fix prompts, and a count in the
heading:

## Suggested Skill Updates (N issues found)

| #   | Severity        | File     | Issue               | Fix Prompt                                                                           |
| --- | --------------- | -------- | ------------------- | ------------------------------------------------------------------------------------ |
| 1   | <emoji> <level> | `<file>` | <short description> | <details><summary>Copy</summary><br>`<full droid prompt to fix the issue>`</details> |

**Severity levels:**

- **Breaking** -- Causes test failures every run (wrong URL, wrong auth method,
  missing required step)
- **Degraded** -- Causes intermittent failures or suboptimal behavior (timing
  issues, rate limits, locale assumptions)
- **Info** -- New knowledge that improves future runs but does not cause
  failures (new UI pattern, new endpoint)

Each Fix Prompt must be a self-contained instruction that Droid can execute
directly when pasted.

Do NOT suggest updates for failures already covered in Known Failure Modes, bad
selectors, or expected behavior changes from the PR. If no genuinely new
environment insights were discovered, omit this section entirely.

Read the `failure_learning` field from config.yaml to determine the strategy.
For this project it is `suggest_in_report`: include the table in the report
only. Do NOT write `skill-updates.json`.
