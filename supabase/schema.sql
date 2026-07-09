-- ============================================================================
-- License Plate clone — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query), then run
-- seed.sql. Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
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
  province   text not null,          -- oblast slug, e.g. 'lvivska'
  score      int  not null default 0,-- ranking score (seeded; negative = worse)
  created_at timestamptz not null default now()
);

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
  voter_key  text not null,          -- anonymous per-browser id
  value      int  not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, voter_key)
);

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

-- Public write (no auth required), but constrained: the anon key is public, so
-- anyone can call the REST API directly — never trust the client to send sane
-- column values.

-- Plates: anyone may register a plate, but not with a forged score.
drop policy if exists "insert plates" on public.plates;
create policy "insert plates" on public.plates for insert with check (
  score = 0
  and plate ~ '^[A-ZА-ЯІЇЄ0-9]{3,10}$'
);

-- Comments: base vote counts must start at zero (they feed the rankings),
-- timestamps can't be forged, text/author are length-bounded, and photos may
-- only point at our own public storage bucket.
drop policy if exists "insert comments" on public.comments;
create policy "insert comments" on public.comments for insert with check (
  upvotes = 0 and downvotes = 0
  and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  and char_length(coalesce(text_uk, '')) between 20 and 2000
  and char_length(coalesce(text_en, '')) <= 2000
  and char_length(coalesce(author, '')) <= 100
  and char_length(category) <= 50
  and plate ~ '^[A-ZА-ЯІЇЄ0-9]{3,10}$'
  and (photo is null
       or photo ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/comment-photos/')
);

-- Votes: NO direct write policies. Without auth, RLS cannot tell "my vote" from
-- "someone else's" (voter_key is client-supplied), and a blanket policy would
-- let one REST call wipe or flip the whole table. All writes instead go through
-- cast_vote() below, which can only ever touch a single (comment_id, voter_key)
-- row per call.
drop policy if exists "insert votes" on public.votes;
drop policy if exists "update votes" on public.votes;
drop policy if exists "delete votes" on public.votes;

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
      where comment_id = p_comment_id and voter_key = p_voter_key;
  else
    insert into public.votes (comment_id, voter_key, value)
      values (p_comment_id, p_voter_key, p_value)
      on conflict (comment_id, voter_key) do update set value = excluded.value;
  end if;
end $$;

grant execute on function public.cast_vote(text, text, int) to anon, authenticated;
