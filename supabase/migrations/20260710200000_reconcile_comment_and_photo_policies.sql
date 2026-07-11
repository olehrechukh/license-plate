-- Reconcile the comment/photo policies that two earlier migrations both defined.
--
-- 20260710190000 (photo-path lockdown) and 20260710193000 (vote privacy + rate
-- limits) each dropped and recreated the SAME two policies ("insert comments"
-- and "comment photos insert"). 193000 ran last and was written against the
-- baseline, so it silently reverted 190000's hardening. This migration merges
-- both intents into a single authoritative definition and fixes two bugs
-- introduced by 193000.

-- ---- Comments insert policy: rate-limit attribution + path/id hardening ------
-- Combines 193000's created_by attribution with 190000's id-length bound and
-- per-user/per-comment pinned photo URL (so a comment can only reference a photo
-- under its own <auth.uid>/<comment-id>/ namespace).
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

-- ---- Bug fix: rate-limit trigger must not block operator inserts ------------
-- The 193000 version raised whenever created_by <> auth.uid(). For service-role
-- / operator inserts auth.uid() is null (and created_by defaults to null), so it
-- unconditionally threw, breaking seeding and moderation tooling. RLS already
-- blocks the anon role, so it is safe to skip the per-user limit when there is
-- no JWT identity.
create or replace function public.enforce_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No authenticated identity => trusted service-role/superuser context; skip.
  if auth.uid() is null then
    return new;
  end if;

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

-- ---- Bug fix: photo upload rate-limit compared text to uuid -----------------
-- storage.objects.owner_id is text; auth.uid() is uuid. `owner_id = auth.uid()`
-- has no operator and errors at runtime, which would reject every upload. Cast
-- the uuid to text.
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
        and owner_id = auth.uid()::text
        and created_at >= now() - interval '1 hour'
    ) < 10;
$$;

-- `create or replace function` preserves existing ACLs, but re-assert to be safe.
revoke execute on function public.can_upload_comment_photo() from public;
grant execute on function public.can_upload_comment_photo() to authenticated;

-- ---- Comment photos insert policy: path scoping + rate limit ----------------
-- Restores 190000's per-user path scoping (<auth.uid>/<comment-id>/<file>) and
-- keeps 193000's per-user hourly upload limit.
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
