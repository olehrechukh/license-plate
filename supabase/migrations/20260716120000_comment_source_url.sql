-- Optional attribution for comments copied from any third-party website.
alter table public.comments
  add column source_url text;

alter table public.comments
  add constraint comments_source_url_check check (
    source_url is null
    or (
      char_length(source_url) between 1 and 2048
      and source_url ~* '^https?://[^[:space:]]+$'
    )
  );

-- Only a verified admin JWT may set source_url. app_metadata is controlled by
-- Supabase administrators and cannot be changed by the signed-in user.
drop policy if exists "insert comments" on public.comments;
create policy "insert comments" on public.comments
  for insert to authenticated
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and id ~ '^[A-Za-z0-9-]{8,64}$'
    and upvotes = 0
    and downvotes = 0
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
    and char_length(coalesce(text_uk, '')) between 20 and 2000
    and char_length(coalesce(text_en, '')) <= 2000
    and char_length(coalesce(author, '')) <= 100
    and char_length(category) <= 50
    and plate ~ '^[A-Z0-9]{3,10}$'
    and (
      source_url is null
      or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
    and (photo is null
         or photo ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/comment-photos/'
                     || auth.uid()::text || '/' || id || '/[^/]+$'))
  );

-- Keep the existing view column order intact and append the new field so
-- create-or-replace remains compatible with current clients.
create or replace view public.comments_feed as
  select c.id, c.plate, p.province, c.author, c.category,
         c.text_uk, c.text_en, c.photo, c.created_at,
         vc.ups, vc.downs, (vc.ups - vc.downs) as net,
         c.source_url
  from public.comments c
  join public.plates p on p.plate = c.plate
  join public.comment_vote_counts vc on vc.id = c.id;
