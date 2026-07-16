-- Retain removed comments for audit while excluding them from all public data.
alter table public.comments
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null;

-- New comments must always start active. Only the admin RPC below can mark an
-- existing comment as deleted.
drop policy if exists "insert comments" on public.comments;
create policy "insert comments" on public.comments
  for insert to authenticated
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and deleted_at is null
    and deleted_by is null
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

-- Public clients cannot read deleted rows directly from the comments table.
-- Admins retain direct read access for audit and future recovery tooling.
drop policy if exists "read comments" on public.comments;
create policy "read comments" on public.comments
  for select to anon, authenticated
  using (
    deleted_at is null
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

create or replace function public.soft_delete_comment(p_comment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  update public.comments
  set deleted_at = now(),
      deleted_by = auth.uid()
  where id = p_comment_id
    and deleted_at is null;

  return found;
end;
$$;

revoke all on function public.soft_delete_comment(text) from public, anon;
grant execute on function public.soft_delete_comment(text) to authenticated;

-- Every public aggregate must exclude deleted comments, not only the feed.
create or replace view public.comments_feed as
  select c.id, c.plate, p.province, c.author, c.category,
         c.text_uk, c.text_en, c.photo, c.created_at,
         vc.ups, vc.downs, (vc.ups - vc.downs) as net,
         c.source_url
  from public.comments c
  join public.plates p on p.plate = c.plate
  join public.comment_vote_counts vc on vc.id = c.id
  where c.deleted_at is null;

create or replace view public.plate_rankings as
  with current_comments as (
    select c.plate,
           c.id,
           (-1 - vc.ups + vc.downs)::int as score
    from public.comments c
    join public.comment_vote_counts vc on vc.id = c.id
    where c.deleted_at is null
      and c.created_at >= date_trunc('month', now())
      and c.created_at < date_trunc('month', now()) + interval '1 month'
  )
  select p.plate,
         p.province,
         coalesce(sum(cc.score), 0)::int as score,
         count(cc.id)::int as comment_count
  from public.plates p
  left join current_comments cc on cc.plate = p.plate
  group by p.plate, p.province;

create or replace view public.province_comment_counts as
  select p.province, count(*)::int as comment_count
  from public.comments c
  join public.plates p on p.plate = c.plate
  where c.deleted_at is null
  group by p.province;
