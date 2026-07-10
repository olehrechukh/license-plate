-- ============================================================================
-- Reset — drop every app object in the public schema so schema.sql can rebuild
-- from a clean slate. Run this in the Supabase SQL Editor, THEN re-run, in order:
--   schema.sql  →  seed.sql  →  storage.sql  →  auth.sql
--
-- Does NOT touch:
--   • auth.users        — your Google sign-ins survive.
--   • the storage bucket — see the optional photo-wipe at the bottom.
--
-- WARNING: irreversibly destroys all plates, comments, and votes.
-- ============================================================================

-- Function first (not covered by table cascade).
drop function if exists public.cast_vote(text, text, int);

-- Tables. CASCADE also drops their dependent views, RLS policies, indexes, and
-- foreign keys, so the views don't need to be listed explicitly.
drop table if exists public.votes       cascade;
drop table if exists public.comments    cascade;
drop table if exists public.plates      cascade;
drop table if exists public.provinces   cascade;
drop table if exists public.app_strings cascade;
drop table if exists public.app_config  cascade;

-- Legacy view name from older schema versions, in case it lingers.
drop view if exists public.comment_scores cascade;

-- ----------------------------------------------------------------------------
-- OPTIONAL: also delete uploaded comment photos. The bucket lives in the
-- `storage` schema, so the drops above leave it (and its files) intact.
-- Uncomment to wipe the images too:
--
-- delete from storage.objects where bucket_id = 'comment-photos';
-- ----------------------------------------------------------------------------
