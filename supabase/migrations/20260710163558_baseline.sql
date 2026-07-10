-- ============================================================================
-- Initial schema for the License Plate app. Single migration, applied to a
-- fresh database. App config + UI strings live in the client bundle
-- (src/i18n/strings.js), not here. Plates, comments, and votes are
-- user-generated at runtime; only province reference data is seeded.
-- ============================================================================

-- ---- Reference tables ------------------------------------------------------

-- Ukrainian regions (oblasts + AR Crimea + cities).
create table public.provinces (
  slug    text primary key,
  code    text not null,
  name_uk text not null,
  name_en text not null,
  sort    int  not null default 0
);

create table public.plates (
  plate      text primary key,
  province   text not null references public.provinces(slug), -- oblast slug, e.g. 'lvivska'
  created_at timestamptz not null default now()
);

create table public.comments (
  id         text primary key,       -- new rows use uuid
  plate      text not null references public.plates(plate) on delete cascade,
  author     text,
  category   text not null,          -- category key, e.g. 'dangerous-driving'
  text_uk    text,
  text_en    text,
  photo      text,
  upvotes    int  not null default 0,-- base upvotes; user votes add on top
  downvotes  int  not null default 0,
  created_at timestamptz not null default now()
);
create index comments_plate_idx         on public.comments(plate);
create index comments_created_at_idx     on public.comments(created_at desc);
create index comments_plate_created_idx  on public.comments(plate, created_at desc);

create table public.votes (
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

-- ---- Views (derived data) --------------------------------------------------

-- Up/down counts per comment = base counts + live user votes.
create view public.comment_vote_counts as
  select c.id,
         c.upvotes   + coalesce(sum(case when v.value =  1 then 1 else 0 end), 0)::int as ups,
         c.downvotes + coalesce(sum(case when v.value = -1 then 1 else 0 end), 0)::int as downs
  from public.comments c
  left join public.votes v on v.comment_id = c.id
  group by c.id, c.upvotes, c.downvotes;

-- Unified, paginatable comment feed: one row per comment carrying its region and
-- live up/down counts, so the client can sort, filter and page through it.
create view public.comments_feed as
  select c.id, c.plate, p.province, c.author, c.category,
         c.text_uk, c.text_en, c.photo, c.created_at,
         vc.ups, vc.downs, (vc.ups - vc.downs) as net
  from public.comments c
  join public.plates p on p.plate = c.plate
  join public.comment_vote_counts vc on vc.id = c.id;

-- Worst-driver leaderboard, aggregated server-side. Highest net score = worst.
create view public.plate_rankings as
  select p.plate, p.province,
         coalesce(sum(vc.ups - vc.downs), 0)::int as score,
         count(c.id)::int as comment_count
  from public.plates p
  left join public.comments c on c.plate = p.plate
  left join public.comment_vote_counts vc on vc.id = c.id
  group by p.plate, p.province;

-- Per-province comment totals for the provinces grid.
create view public.province_comment_counts as
  select p.province, count(*)::int as comment_count
  from public.comments c
  join public.plates p on p.plate = c.plate
  group by p.province;

-- ---- Row Level Security ----------------------------------------------------

alter table public.provinces enable row level security;
alter table public.plates    enable row level security;
alter table public.comments  enable row level security;
alter table public.votes     enable row level security;

-- Public read (anon + authenticated).
create policy "read provinces" on public.provinces for select using (true);
create policy "read plates"    on public.plates    for select using (true);
create policy "read comments"  on public.comments  for select using (true);
create policy "read votes"     on public.votes     for select using (true);

-- Authenticated write only. The anon key is public, so anyone can call the REST
-- API directly — `to authenticated` makes these policies inapplicable to the
-- anon role (anon inserts are denied), and the checks never trust client values.

-- Plates: a signed-in user may register a syntactically valid regional plate
-- (only ever created as part of adding a comment, which requires auth).
create policy "insert plates" on public.plates for insert to authenticated with check (
  plate ~ '^[A-Z0-9]{3,10}$'
);

-- Comments: only authenticated users may post. Base vote counts must start at
-- zero, timestamps can't be forged, text/author are length-bounded, and photos
-- may only point at our own public storage bucket.
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

-- Votes: NO direct write policies. The anon voter_key is client-supplied, so a
-- blanket policy would let one REST call wipe or flip the whole table. All writes
-- go through the two SECURITY DEFINER functions below, each of which can only
-- ever touch a single (comment_id, voter_key) row per call.

-- Anonymous path. Best-effort: someone who learns another browser's key could
-- change that anonymous vote. It CANNOT touch signed-in votes — the key pattern
-- forbids the colon in the 'auth:' prefix, and every statement is scoped to
-- `user_id is null`.
create function public.cast_vote(p_comment_id text, p_voter_key text, p_value int)
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

-- Signed-in path. Identity comes from auth.uid() (the verified JWT), never from
-- a client argument — so a caller can only ever cast or clear THEIR OWN vote.
create function public.cast_vote_auth(p_comment_id text, p_value int)
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

-- Public bucket so uploaded photos are served via public URLs. Capped at 5 MB
-- and restricted to image MIME types (enforced server-side). Upsert because the
-- storage schema is NOT wiped by `db reset`, so the bucket row can already exist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comment-photos', 'comment-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read, authenticated upload (gated like comment inserts).
create policy "comment photos read"
  on storage.objects for select
  using (bucket_id = 'comment-photos');

create policy "comment photos insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'comment-photos');

-- ---- Seed: province reference data -----------------------------------------

insert into public.provinces (slug, code, name_uk, name_en, sort) values
  ('crimea', 'AK', 'Автономна Республіка Крим', 'Autonomous Republic of Crimea', 0),
  ('vinnytska', 'AB', 'Вінницька', 'Vinnytsia', 1),
  ('volynska', 'AC', 'Волинська', 'Volyn', 2),
  ('dnipropetrovska', 'AE', 'Дніпропетровська', 'Dnipropetrovsk', 3),
  ('donetska', 'AH', 'Донецька', 'Donetsk', 4),
  ('zhytomyrska', 'AM', 'Житомирська', 'Zhytomyr', 5),
  ('zakarpatska', 'AO', 'Закарпатська', 'Zakarpattia', 6),
  ('zaporizka', 'AP', 'Запорізька', 'Zaporizhzhia', 7),
  ('ivano-frankivska', 'AT', 'Івано-Франківська', 'Ivano-Frankivsk', 8),
  ('kyivska', 'AI', 'Київська', 'Kyiv Oblast', 9),
  ('kirovohradska', 'BA', 'Кіровоградська', 'Kirovohrad', 10),
  ('luhanska', 'BB', 'Луганська', 'Luhansk', 11),
  ('lvivska', 'BC', 'Львівська', 'Lviv', 12),
  ('mykolaivska', 'BE', 'Миколаївська', 'Mykolaiv', 13),
  ('odeska', 'BH', 'Одеська', 'Odesa', 14),
  ('poltavska', 'BI', 'Полтавська', 'Poltava', 15),
  ('rivnenska', 'BK', 'Рівненська', 'Rivne', 16),
  ('sumska', 'BM', 'Сумська', 'Sumy', 17),
  ('ternopilska', 'BO', 'Тернопільська', 'Ternopil', 18),
  ('kharkivska', 'AX', 'Харківська', 'Kharkiv', 19),
  ('khersonska', 'BT', 'Херсонська', 'Kherson', 20),
  ('khmelnytska', 'BX', 'Хмельницька', 'Khmelnytskyi', 21),
  ('cherkaska', 'CA', 'Черкаська', 'Cherkasy', 22),
  ('chernivetska', 'CE', 'Чернівецька', 'Chernivtsi', 23),
  ('chernihivska', 'CB', 'Чернігівська', 'Chernihiv', 24),
  ('kyiv-city', 'AA', 'м. Київ', 'Kyiv (city)', 25),
  ('sevastopol-city', 'CH', 'м. Севастополь', 'Sevastopol (city)', 26);
