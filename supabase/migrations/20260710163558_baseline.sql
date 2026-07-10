-- ============================================================================
-- Baseline migration — full schema + storage config for the License Plate app.
-- Assembled from supabase/schema.sql and supabase/storage.sql.
-- Data (config, UI strings, provinces, auth labels) is applied separately via
-- supabase/seed.sql + supabase/auth.sql after this runs.
-- ============================================================================

-- ---- Reference / i18n tables -----------------------------------------------

-- App configuration (single row).
create table if not exists public.app_config (
  id             int  primary key default 1,
  default_lang   text not null default 'uk',
  ranking_period text,
  constraint app_config_singleton check (id = 1)
);

-- UI translations: one jsonb document per language (mirrored key trees).
create table if not exists public.app_strings (
  lang text primary key,
  data jsonb not null
);

-- Ukrainian regions (oblasts + AR Crimea + cities).
create table if not exists public.provinces (
  slug    text primary key,
  code    text not null,
  name_uk text not null,
  name_en text not null,
  sort    int  not null default 0
);

-- ---- Tables ----------------------------------------------------------------

create table if not exists public.plates (
  plate      text primary key,
  province   text not null references public.provinces(slug), -- oblast slug, e.g. 'lvivska'
  created_at timestamptz not null default now()
);

-- Scores are derived from comment votes in plate_rankings; remove the legacy
-- stored value in existing databases as well.
alter table public.plates drop column if exists score;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'plates_province_fkey') then
    alter table public.plates add constraint plates_province_fkey
      foreign key (province) references public.provinces(slug);
  end if;
end $$;

create table if not exists public.comments (
  id         text primary key,       -- 'c-1001' from seed; new rows use uuid
  plate      text not null references public.plates(plate) on delete cascade,
  author     text,
  category   text not null,          -- category key, e.g. 'dangerous-driving'
  text_uk    text,
  text_en    text,
  photo      text,
  upvotes    int  not null default 0,-- base/seed upvotes; user votes add on top
  downvotes  int  not null default 0,-- base/seed downvotes
  created_at timestamptz not null default now()
);

create index if not exists comments_plate_idx on public.comments(plate);

-- Migration for databases created before up/down votes were split out of a
-- single net `votes` column. Safe / idempotent.
alter table public.comments add column if not exists upvotes   int not null default 0;
alter table public.comments add column if not exists downvotes int not null default 0;
-- The old comment_scores view depends on `votes`; drop it before the column.
drop view if exists public.comment_scores;
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'comments' and column_name = 'votes') then
    update public.comments
      set upvotes = greatest(votes, 0), downvotes = greatest(-votes, 0)
      where upvotes = 0 and downvotes = 0;
    alter table public.comments drop column votes;
  end if;
end $$;

create table if not exists public.votes (
  comment_id text not null references public.comments(id) on delete cascade,
  -- Identity of the voter. Two disjoint namespaces:
  --   anonymous  → a per-browser random id, e.g. 'a1b2c3d4-...'  (user_id null)
  --   signed in  → 'auth:' || auth.uid()                          (user_id set)
  -- The 'auth:' prefix contains a colon, which the anon voter-key pattern
  -- forbids — so the two spaces can never collide and the anonymous cast_vote()
  -- can never address a signed-in user's row.
  voter_key  text not null,
  -- Owner for signed-in votes; null for anonymous ones. auth.uid() is derived
  -- from the verified JWT server-side, so this cannot be forged by the client.
  user_id    uuid references auth.users(id) on delete cascade,
  value      int  not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, voter_key)
);

-- Migration for databases created before signed-in votes were split out.
alter table public.votes add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ---- Views (derived data) --------------------------------------------------

-- Up/down counts per comment = base counts + live user votes.
drop view if exists public.comment_scores;
create or replace view public.comment_vote_counts as
  select c.id,
         c.upvotes   + coalesce(sum(case when v.value =  1 then 1 else 0 end), 0)::int as ups,
         c.downvotes + coalesce(sum(case when v.value = -1 then 1 else 0 end), 0)::int as downs
  from public.comments c
  left join public.votes v on v.comment_id = c.id
  group by c.id, c.upvotes, c.downvotes;

-- Unified, paginatable comment feed: one row per comment carrying its region and
-- live up/down counts, so the client can sort ("newest" by created_at, "top" by
-- net = ups - downs), filter (by plate or province) and page through it with
-- range(). Replaces loading every comment into the browser, which silently
-- truncated at Supabase's 1000-row cap.
create or replace view public.comments_feed as
  select c.id, c.plate, p.province, c.author, c.category,
         c.text_uk, c.text_en, c.photo, c.created_at,
         vc.ups, vc.downs, (vc.ups - vc.downs) as net
  from public.comments c
  join public.plates p on p.plate = c.plate
  join public.comment_vote_counts vc on vc.id = c.id;

-- Worst-driver leaderboard, aggregated server-side. Comment counts and net
-- scores can no longer be derived in the browser now that comments are paged,
-- so this view (previously dropped) is reinstated. Highest net score = worst.
create or replace view public.plate_rankings as
  select p.plate, p.province,
         coalesce(sum(vc.ups - vc.downs), 0)::int as score,
         count(c.id)::int as comment_count
  from public.plates p
  left join public.comments c on c.plate = p.plate
  left join public.comment_vote_counts vc on vc.id = c.id
  group by p.plate, p.province;

-- Per-province comment totals for the provinces grid (was a client-side count
-- over the full in-memory feed).
create or replace view public.province_comment_counts as
  select p.province, count(*)::int as comment_count
  from public.comments c
  join public.plates p on p.plate = c.plate
  group by p.province;

-- Indexes for paginated ordering / plate + province filtering.
create index if not exists comments_created_at_idx  on public.comments(created_at desc);
create index if not exists comments_plate_created_idx on public.comments(plate, created_at desc);

-- ---- Row Level Security ----------------------------------------------------
alter table public.app_config enable row level security;
alter table public.app_strings enable row level security;
alter table public.provinces  enable row level security;
alter table public.plates   enable row level security;
alter table public.comments enable row level security;
alter table public.votes    enable row level security;

-- Public read (anon + authenticated).
drop policy if exists "read app_config"  on public.app_config;
drop policy if exists "read app_strings" on public.app_strings;
drop policy if exists "read provinces"   on public.provinces;
drop policy if exists "read plates"   on public.plates;
drop policy if exists "read comments" on public.comments;
drop policy if exists "read votes"    on public.votes;
create policy "read app_config"  on public.app_config  for select using (true);
create policy "read app_strings" on public.app_strings for select using (true);
create policy "read provinces"   on public.provinces   for select using (true);
create policy "read plates"   on public.plates   for select using (true);
create policy "read comments" on public.comments for select using (true);
create policy "read votes"    on public.votes    for select using (true);

-- Authenticated write only, and still constrained: the anon key is public, so
-- anyone can call the REST API directly — the `to authenticated` clause makes
-- the policy inapplicable to the anon role (so anon inserts are denied), and the
-- checks never trust the client to send sane column values.

-- Plates: a signed-in user may register a syntactically valid regional plate.
-- (Plates are only ever created as part of adding a comment, which now requires
-- auth — so plate creation is gated the same way.)
drop policy if exists "insert plates" on public.plates;
create policy "insert plates" on public.plates for insert to authenticated with check (
  plate ~ '^[A-Z0-9]{3,10}$'
);

-- Comments: only authenticated users may post. Base vote counts must start at
-- zero (they feed the rankings), timestamps can't be forged, text/author are
-- length-bounded, and photos may only point at our own public storage bucket.
drop policy if exists "insert comments" on public.comments;
create policy "insert comments" on public.comments for insert to authenticated with check (
  auth.uid() is not null
  and upvotes = 0 and downvotes = 0
  and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  and char_length(coalesce(text_uk, '')) between 20 and 2000
  and char_length(coalesce(text_en, '')) <= 2000
  and char_length(coalesce(author, '')) <= 100
  and char_length(category) <= 50
  and plate ~ '^[A-Z0-9]{3,10}$'
  and (photo is null
       or photo ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/comment-photos/')
);

-- Votes: NO direct write policies. RLS cannot tell "my vote" from "someone
-- else's" (the anon voter_key is client-supplied), and a blanket policy would
-- let one REST call wipe or flip the whole table. All writes instead go through
-- the two SECURITY DEFINER functions below, each of which can only ever touch a
-- single (comment_id, voter_key) row per call.
drop policy if exists "insert votes" on public.votes;
drop policy if exists "update votes" on public.votes;
drop policy if exists "delete votes" on public.votes;

-- Anonymous path. The voter_key comes from the client (a per-browser random id),
-- so this is best-effort: someone who learns another browser's key could change
-- that anonymous vote. It CANNOT touch signed-in votes, though — the key pattern
-- forbids the colon in the 'auth:' prefix, and every statement is additionally
-- scoped to `user_id is null`.
create or replace function public.cast_vote(p_comment_id text, p_voter_key text, p_value int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_value not in (-1, 0, 1) then
    raise exception 'invalid vote value';
  end if;
  if p_voter_key !~ '^[A-Za-z0-9-]{8,64}$' then
    raise exception 'invalid voter key';
  end if;
  if p_value = 0 then
    delete from public.votes
      where comment_id = p_comment_id and voter_key = p_voter_key and user_id is null;
  else
    insert into public.votes (comment_id, voter_key, value)
      values (p_comment_id, p_voter_key, p_value)
      on conflict (comment_id, voter_key) do update
        set value = excluded.value
        where public.votes.user_id is null;
  end if;
end $$;

-- Signed-in path. Identity is taken from auth.uid() (the verified JWT), never
-- from a client argument — so a caller can only ever cast or clear THEIR OWN
-- vote. No one, authenticated or anonymous, can drop or flip another user's vote:
-- the anon function is blocked by the namespace + `user_id is null` scope above,
-- and this function is hard-wired to the caller's own uid.
create or replace function public.cast_vote_auth(p_comment_id text, p_value int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_value not in (-1, 0, 1) then
    raise exception 'invalid vote value';
  end if;
  v_key := 'auth:' || v_uid::text;
  if p_value = 0 then
    delete from public.votes
      where comment_id = p_comment_id and voter_key = v_key and user_id = v_uid;
  else
    insert into public.votes (comment_id, voter_key, user_id, value)
      values (p_comment_id, v_key, v_uid, p_value)
      on conflict (comment_id, voter_key) do update
        set value = excluded.value
        where public.votes.user_id = v_uid;
  end if;
end $$;

grant execute on function public.cast_vote(text, text, int) to anon, authenticated;
grant execute on function public.cast_vote_auth(text, int) to authenticated;

-- ---- Storage: comment-photos bucket ----------------------------------------

-- Public bucket so uploaded photos are served via public URLs. Uploads are
-- capped at 5 MB and restricted to image MIME types (enforced server-side —
-- the anon key is public, so uploads can bypass the app's file picker).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comment-photos', 'comment-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read, authenticated upload. Photos are only ever uploaded as part of
-- adding a comment, which requires auth — so uploads are gated the same way.
drop policy if exists "comment photos read"   on storage.objects;
drop policy if exists "comment photos insert" on storage.objects;

create policy "comment photos read"
  on storage.objects for select
  using (bucket_id = 'comment-photos');

create policy "comment photos insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'comment-photos');
