-- ============================================================================
-- Clean out all comments + uploaded photos.
-- Run in the Supabase SQL Editor. Keeps plates, provinces, translations, config.
-- ============================================================================

-- 1. Delete all comments. Their vote rows cascade away automatically
--    (votes.comment_id references comments(id) on delete cascade).
delete from public.comments;

-- 2. Delete all uploaded files in the comment-photos storage bucket.
delete from storage.objects where bucket_id = 'comment-photos';
