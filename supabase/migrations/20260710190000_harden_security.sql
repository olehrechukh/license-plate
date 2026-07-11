-- Combined hardening migration for vote privacy and authenticated content.
-- Anonymous voting remains enabled; its caller-supplied-key abuse risk is
-- tracked separately.

-- Vote rows contain bearer-like anonymous keys and auth user IDs. The client
-- only needs aggregate counts from the public views.
drop policy if exists "read votes" on public.votes;
revoke select on table public.votes from public, anon, authenticated;

-- Attribute new comments to the verified auth identity. Existing comments are
-- retained with a null owner for backward compatibility.
alter table public.comments
  add column if not exists created_by uuid references auth.users(id) on delete set null
  default auth.uid();

create index if not exists comments_created_by_created_at_idx
  on public.comments(created_by, created_at desc);

-- Limit each authenticated user to five comments per rolling hour. The
-- advisory lock prevents two concurrent requests from bypassing the count.
create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null or new.created_by <> auth.uid() then
    raise exception 'comment owner does not match authenticated user';
  end if;

  perform pg_advisory_xact_lock(hashtext(new.created_by::text));
  if (
    select count(*)
    from public.comments
    where created_by = new.created_by
      and created_at >= now() - interval '1 hour'
  ) >= 5 then
    raise exception 'comment submission rate limit exceeded';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_comment_rate_limit on public.comments;
create trigger enforce_comment_rate_limit
  before insert on public.comments
  for each row execute function public.enforce_comment_rate_limit();

-- Limit each authenticated user to ten comment-photo uploads per rolling hour.
-- storage.objects.owner_id is populated by Supabase Storage from the JWT.
create or replace function public.can_upload_comment_photo()
returns boolean
language sql
security definer
set search_path = storage, public
as $$
  select auth.uid() is not null
    and (
      select count(*)
      from storage.objects
      where bucket_id = 'comment-photos'
        and owner_id = auth.uid()
        and created_at >= now() - interval '1 hour'
    ) < 10;
$$;

revoke execute on function public.can_upload_comment_photo() from public;
grant execute on function public.can_upload_comment_photo() to authenticated;

-- Keep uploads in the authenticated user's <user>/<comment>/<file>
-- namespace and apply the per-user upload limit.
drop policy if exists "comment photos insert" on storage.objects;
create policy "comment photos insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comment-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[A-Za-z0-9-]{8,64}$'
    and public.can_upload_comment_photo()
  );

-- Require new comments to belong to their authenticated creator and ensure a
-- referenced public photo belongs to that creator and comment.
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
    and (photo is null
         or photo ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/comment-photos/'
                     || auth.uid()::text || '/' || id || '/[^/]+$'))
  );
