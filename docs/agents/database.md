# Database (Supabase / Postgres 17)

The schema is defined only by `supabase/migrations/*.sql`, applied in filename order.
Later migrations **drop and re-create** policies/views/functions, so the current
definition of an object is the one in the **latest** migration that touches it.

## Migration history

| File                                                      | What it does                                                                                                                                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260710163558_baseline.sql`                             | tables `provinces`, `plates`, `comments`, `votes`; views `comment_vote_counts`, `comments_feed`, `plate_rankings` (all-time), `province_comment_counts`; RLS; RPCs `cast_vote`, `cast_vote_auth`; `comment-photos` bucket; seeds 27 provinces |
| `20260710180000_current_month_rankings.sql`               | `plate_rankings` becomes current-calendar-month only with the "-1 per report" score                                                                                                                                                           |
| `20260710190000_harden_security.sql`                      | votes table unreadable; `comments.created_by` (default `auth.uid()`); rate-limit trigger (5 comments/h); `can_upload_comment_photo()` (10 uploads/h); photo path scoping; stricter comment insert policy                                      |
| `20260710200000_reconcile_comment_and_photo_policies.sql` | merges two conflicting hardening migrations (mentions a `…193000` file that no longer exists in the repo), lets service-role inserts bypass the rate-limit trigger, fixes `owner_id` text/uuid comparison                                     |
| `20260716120000_comment_source_url.sql`                   | `comments.source_url` (admin-only, http(s), ≤2048), appended to `comments_feed`                                                                                                                                                               |
| `20260716130000_soft_delete_comments.sql`                 | `deleted_at`, `deleted_by`; RPC `soft_delete_comment`; read policy hides deleted rows from non-admins; all public views filter `deleted_at is null`                                                                                           |

## Tables

### `provinces` (reference data, seeded)

`slug text pk`, `code text` (primary 2-letter code), `name_uk`, `name_en`, `sort int`.
27 rows: 24 oblasts + `crimea` + `kyiv-city` + `sevastopol-city`. Slugs must match
`src/data/plateRegions.js`.

### `plates`

`plate text pk` (normalized, `^[A-Z0-9]{3,10}$`), `province text → provinces.slug`,
`created_at`. Created implicitly by the client when the first comment for a plate is posted.

### `comments`

| Column                         | Notes                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `id text pk`                   | client-generated UUID, must match `^[A-Za-z0-9-]{8,64}$`                                                       |
| `plate → plates`               | on delete cascade                                                                                              |
| `author text`                  | free-form display name, ≤100 (client caps at 50)                                                               |
| `category text`                | key such as `dangerous-driving` (≤50; not an enum/FK)                                                          |
| `text_uk`, `text_en`           | `text_uk` 20–2000 chars; client writes the same text to both                                                   |
| `photo text`                   | public URL, must be `https://<ref>.supabase.co/storage/v1/object/public/comment-photos/<auth.uid>/<id>/<file>` |
| `upvotes`, `downvotes int`     | **base** counts (for imported/seeded data); inserts must be 0                                                  |
| `created_at`                   | must be within ±1 min of `now()` on insert                                                                     |
| `created_by uuid → auth.users` | default `auth.uid()`, must equal it on insert                                                                  |
| `source_url text`              | optional, admin-only, `^https?://\S+$`                                                                         |
| `deleted_at`, `deleted_by`     | soft delete; must be null on insert                                                                            |

Indexes: `plate`, `created_at desc`, `(plate, created_at desc)`, `(created_by, created_at desc)`.

### `votes`

PK `(comment_id, voter_key)`, `user_id uuid null`, `value ∈ {-1, 1}`.
`voter_key` is either an anonymous browser id (`^[A-Za-z0-9-]{8,64}$`) or `'auth:' || auth.uid()`
(the colon keeps the namespaces disjoint). **No select or write access** for anon/authenticated —
only the RPCs below and the views read it.

## Views (run with owner rights, so they bypass RLS on `votes`)

- `comment_vote_counts(id, ups, downs)` = base counts + live votes. Note: does not filter deleted comments by itself.
- `comments_feed(id, plate, province, author, category, text_uk, text_en, photo, created_at, ups, downs, net, source_url)` — non-deleted only. Column order is a contract: append new columns at the end (`create or replace view` requirement).
- `plate_rankings(plate, province, score, comment_count)` — **current calendar month (server time, UTC)** non-deleted comments only; per comment score `-1 - ups + downs`; plates with no comments this month have `score 0, comment_count 0`.
- `province_comment_counts(province, comment_count)` — all-time, non-deleted.

## RLS policies (current)

| Table                                       | Policy                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `provinces`, `plates`                       | public select                                                                         |
| `plates` insert                             | `to authenticated`, plate regex                                                       |
| `comments` select                           | `deleted_at is null` or JWT `app_metadata.role = 'admin'`                             |
| `comments` insert                           | `to authenticated` with every check listed in the table above                         |
| `comments` update/delete                    | none (only via RPC)                                                                   |
| `votes`                                     | none (RPC only)                                                                       |
| `storage.objects` (`comment-photos`) select | public                                                                                |
| `storage.objects` insert                    | authenticated; path `<auth.uid>/<8-64 id chars>/<file>`; `can_upload_comment_photo()` |

## Functions / triggers

| Name                                                                 | Who                                                         | Behavior                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `cast_vote(p_comment_id, p_voter_key, p_value)`                      | anon, authenticated                                         | security definer; value -1/0/1 (0 deletes); only touches rows with `user_id is null`                                                      |
| `cast_vote_auth(p_comment_id, p_value)`                              | authenticated                                               | identity from `auth.uid()`; key `auth:<uid>`                                                                                              |
| `soft_delete_comment(p_comment_id) → boolean`                        | authenticated, admin JWT required (errcode 42501 otherwise) | sets `deleted_at = now()`, `deleted_by = auth.uid()`                                                                                      |
| `enforce_comment_rate_limit()` trigger (before insert on `comments`) | —                                                           | skips when `auth.uid()` is null (service role); else requires `created_by = auth.uid()` and < 5 comments in the last hour (advisory lock) |
| `can_upload_comment_photo()`                                         | authenticated                                               | < 10 objects in `comment-photos` owned by the user in the last hour                                                                       |

## Storage

Bucket `comment-photos`: public, 5 MB limit, MIME `image/jpeg|png|webp|gif`.
Client path: `<userId>/<commentId>/photo.<ext>`. Deleted comments keep their photo objects.

## Admin role

Admin is a JWT claim: `auth.users.raw_app_meta_data ->> 'role' = 'admin'`. Users cannot
change `app_metadata` themselves. Set it from the SQL editor (service role):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
where email = '<admin email>';
```

The user must sign out/in (or refresh the token) for the claim to appear.

## Writing a new migration

1. New file `supabase/migrations/<UTC timestamp>_<snake_description>.sql`; never edit an
   already-applied migration. There is no `schema.sql` or `seed.sql`.
2. If you change `insert comments`, copy the **full** current policy from
   `20260716130000_soft_delete_comments.sql` and edit it — partial redefinitions drop checks.
3. New views/aggregates over `comments` must filter `deleted_at is null`.
4. `supabase/config.toml` does not auto-expose new tables; add explicit `grant`s for
   `anon` / `authenticated` where the client needs access, plus RLS.
5. Update `docs/agents/database.md` and the client (`feedApi.js` / `FeedContext.jsx`) together.
6. Apply it to the hosted database manually before deploying dependent client code
   ([operations.md](operations.md#deployment-vercel)).
