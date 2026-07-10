-- ============================================================================
-- Storage bucket for comment photos.
-- Run once in the Supabase SQL Editor (after schema.sql). Re-runnable.
-- Alternatively: Dashboard → Storage → New bucket → name "comment-photos",
-- Public = on.
-- ============================================================================

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
-- adding a comment, which requires auth (see schema.sql) — so uploads are gated
-- the same way. `to authenticated` makes the insert policy inapplicable to the
-- anon role, so anonymous uploads are denied.
drop policy if exists "comment photos read"   on storage.objects;
drop policy if exists "comment photos insert" on storage.objects;

create policy "comment photos read"
  on storage.objects for select
  using (bucket_id = 'comment-photos');

create policy "comment photos insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'comment-photos');
