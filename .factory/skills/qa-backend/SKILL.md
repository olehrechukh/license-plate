---
name: qa-backend
description: >
  QA tests for the AutoKarma Supabase backend. Covers the RLS boundary on
  comments, plates and votes, the voting RPCs, the admin soft-delete RPC, and
  the storage bucket policy. Uses curl against the PostgREST API.
---

# QA Sub-Skill: Backend (Supabase / PostgREST)

## Testing Target

The backend is Supabase (Postgres 17) with RLS. The browser talks to it through
`supabase-js` against the PostgREST API at:

```
https://pqdhxkqgooftmqtpscpt.supabase.co/rest/v1
```

Credentials come from the environment:

- `SUPABASE_URL` -- defaults to `https://pqdhxkqgooftmqtpscpt.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` -- the publishable (anon) key

The publishable key is designed to reach the browser, so it is public and safe
to use here. **Never use a service-role key.** QA runs as the anonymous role,
which is exactly the perspective an attacker without an account has. That is the
boundary worth testing.

Set up the shell for a flow:

```bash
SUPABASE_URL="${SUPABASE_URL:-https://pqdhxkqgooftmqtpscpt.supabase.co}"
KEY="$VITE_SUPABASE_PUBLISHABLE_KEY"
API="$SUPABASE_URL/rest/v1"
```

Every request needs both headers:

```bash
-H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

## Environment behavior for preview deployments

The backend has no separate preview environment. The Vercel preview deployment
inlines the same `VITE_SUPABASE_*` values, so preview and production read and
write **the same Supabase project**.

That means these tests run against live data. Consequences:

- Read assertions are unrestricted.
- Write assertions must be **reversible** and must not create user-visible
  content. The vote round-trip in `vote-rpc-roundtrip` is the only write flow
  in this sub-skill, and it clears itself.
- Never insert a comment row. A real report on a real plate is visible to real
  users, counts toward the monthly leaderboard, and cannot be cleanly removed
  by an anonymous client (soft delete needs the admin RPC).
- Never upload a photo. Storage objects are not deleted by soft delete, so
  orphaned files accumulate in the bucket.

## Flow menu

This is a MENU of available flows, not a checklist. The orchestrator picks only
the flows relevant to the current diff.

### `public-reads`

Confirm the read views are publicly readable and shaped as the client expects.

```bash
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$API/provinces?select=slug"
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$API/comments_feed?select=id,plate,ups,downs,net&limit=2"
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$API/plate_rankings?select=plate,province,score,comment_count&comment_count=gt.0"
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$API/province_comment_counts?select=province,comment_count"
```

- Success: each returns 200 with a JSON array.
- `provinces` returns 27 rows. The table is seeded with 27 regions (24
  oblasts plus `crimea`, `kyiv-city` and `sevastopol-city`). The query above
  has no `limit`, so the count is the full set.
- `comments_feed` includes a `net` column, which the client's "Top voted"
  sort depends on.
- `plate_rankings` is a LEFT JOIN from `plates`, so it returns a row for
  **every** plate in the `plates` table, including plates with no reports this
  month (those get `score 0, comment_count 0`). Only the score and the count
  are month-scoped. The client filters with `.gt('comment_count', 0)` in
  `fetchRankings`, so the query above applies that filter explicitly. An empty
  result is valid in a month with no reports.
- **The score is inverted relative to intuition.** A report starts at `-1` and
  each upvote makes it worse by another `-1`, so a worse driver has a MORE
  NEGATIVE score. `fetchRankings` sorts by `score` **ascending** to put the
  worst drivers first. A plate with `score 0` and `comment_count 0` is a
  placeholder row, not a real ranking.

### `comments-select-columns`

Confirm the `comments_feed` view exposes exactly the columns the client selects
in `src/data/feedApi.js`:

```
id, plate, province, author, category, text_uk, text_en, photo, source_url, created_at, ups, downs
```

- Success: the request returns 200 and no missing-column error. The column
  order is a contract; new columns are appended at the end.

### `soft-deleted-hidden`

Confirm soft-deleted comments are invisible to the anonymous role.

- Success: a comment with `deleted_at` set does not appear in `comments_feed`
  or in `plate_rankings` or `province_comment_counts`. The admin role can still
  read it, but that path is not exercised by the anonymous role.

### `votes-unreadable`

The `votes` table has no select policy for anyone, including authenticated
users. Vote counts are only exposed through the views.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$API/votes?select=*&limit=1"
```

- Success: the status is 401. Reading individual vote rows is not possible.
- The `comments_feed` view still exposes aggregate `ups` and `downs`. That is
  intended.

### `anon-insert-comment-blocked`

An anonymous client must not be able to insert a comment.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"id":"qa-probe-0001","plate":"AA0001AA","author":"qa","category":"other","text_uk":"short","text_en":"short"}' \
  "$API/comments"
```

- Success: the status is 401. The insert policy is `to authenticated`.
- Also assert the row was not created:
  `"$API/comments?id=eq.qa-probe-0001"` returns an empty array.

### `anon-insert-plate-blocked`

Plates are created implicitly when the first comment is posted. An anonymous
client must not be able to create one directly.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"plate":"QA0001QA","province":"kyiv-city"}' \
  "$API/plates"
```

- Success: the status is 401. The insert policy is `to authenticated`.

### `anon-update-delete-blocked`

There is no update or delete policy on `comments` at all. Content is only
removed through the `soft_delete_comment` RPC.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"author":"tampered"}' \
  "$API/comments?id=eq.00000000-0000-0000-0000-000000000000"
```

- Success: the status is **204** and no row is modified. PostgREST answers
  204 for "0 rows affected" when no policy matched; it is not a successful
  write. (Verified against the live project: an anonymous PATCH on a
  non-existent id returns 204, not 200 and not 401.)
- Verify by re-reading a real comment and confirming the author is unchanged.

### `rpc-soft-delete-needs-admin`

The soft-delete RPC is the only deletion path. It requires the admin JWT claim.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"p_comment_id":"00000000-0000-0000-0000-000000000000"}' \
  "$API/rpc/soft_delete_comment"
```

- Success: the status is 401. The function is `security definer` and checks the
  admin claim, rejecting a non-admin with `errcode 42501`.

### `rpc-cast-vote-auth-needs-session`

The authenticated voting RPC derives identity from `auth.uid()`, so it cannot
work without a session.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"p_comment_id":"00000000-0000-0000-0000-000000000000","p_value":1}' \
  "$API/rpc/cast_vote_auth"
```

- Success: the status is 400. A valid session is required.

### `vote-rpc-roundtrip`

The anonymous voting RPC works without a session, using a voter key. This flow
verifies that a vote is recorded, that it is visible through the aggregate
view, and that it can be cleared.

Use the fixed voter key `qa-probe-voter-9c3d1f` and a comment id read from
`comments_feed` at the start of the flow.

```bash
CID="<id read from comments_feed>"
# vote up
curl -s -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_comment_id\":\"$CID\",\"p_voter_key\":\"qa-probe-voter-9c3d1f\",\"p_value\":1}" \
  "$API/rpc/cast_vote"
# read the aggregate
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$API/comments_feed?select=id,ups,downs,net&id=eq.$CID"
# clear the vote
curl -s -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_comment_id\":\"$CID\",\"p_voter_key\":\"qa-probe-voter-9c3d1f\",\"p_value\":0}" \
  "$API/rpc/cast_vote"
# read the aggregate again
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$API/comments_feed?select=id,ups,downs,net&id=eq.$CID"
```

- Success: the `ups` count is one higher after the vote than before it, and is
  back to the original value after the clear. `net` moves in step with `ups`.
- **Always clear the vote**, even if the read step fails. If the run is
  interrupted, clear it manually with the same voter key and `p_value` 0.
- A `409` on the vote call means the comment id does not exist. Re-read a real
  id from `comments_feed` and retry once.

### `storage-upload-blocked`

The `comment-photos` bucket is insert-protected. The path must begin with the
owning user's `auth.uid()`, and the MIME type must be one of
`image/jpeg|png|webp|gif`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{}' \
  "$SUPABASE_URL/storage/v1/object/comment-photos/qa-probe/qa-probe-0001/photo.png"
```

- Success: the status is 400. An anonymous upload is rejected.
- The bucket is publicly readable, so an uploaded photo URL is accessible
  without a session. That is intended for a public report photo.

### `plate-format-policy`

Plates are stored normalized and must match `^[A-Z0-9]{3,10}$`.

- Success: an insert attempt with an invalid plate is rejected by the policy.
- This cannot be exercised anonymously because comment insert already requires
  authentication. Report as BLOCKED with the reason "requires an authenticated
  session" unless a session is available.

## Known failure modes

1. **`votes` returns 401 on select.** That is the intended behavior, not a
   bug. The aggregate counts come from the `comment_vote_counts` view.
2. **A vote call returns 409.** The comment id does not exist. Read a real id
   from `comments_feed` and retry.
3. **A vote call returns 42501.** The `soft_delete_comment` path requires the
   admin claim. `cast_vote` does not.
4. **An update or delete returns 204 with an empty body.** PostgREST reports
   "0 rows affected" when no policy matched. It is not a successful write.
   Verify by re-reading the row.
5. **`plate_rankings` is empty.** The leaderboard only counts comments created
   in the current calendar month, in UTC. In a quiet month it is legitimately
   empty.
6. **`comments_feed` has no `net` column.** The view's column order is a
   contract. If `net` is missing, a migration broke the view.
7. **The rating period label disagrees with the server month.** The label uses
   browser local time while the score uses server UTC. Expected near month
   boundaries.
