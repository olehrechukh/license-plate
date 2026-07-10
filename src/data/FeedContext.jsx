import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { isValidPlate, normalizePlate } from './useFeedData.js'
import { provinceForPlateCode } from './plateRegions.js'
import { supabase, hasSupabase, voterKey } from '../lib/supabase.js'
import { fetchRankings, fetchProvinceCounts } from './feedApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { config as appConfig } from '../i18n/strings.js'

const FeedContext = createContext(null)

// Vote ledger: { [commentId]: -1 | 1 } — one vote per comment, persisted per
// BROWSER (localStorage) so it's shared across tabs alongside the voter id. A
// voter may vote on many different comments, each independently (+ or -, none).
const SESSION_VOTES_KEY = 'lp-session-votes'
function readSessionVotes() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_VOTES_KEY)) || {}
  } catch {
    return {}
  }
}

// Supabase Storage bucket for user-uploaded comment photos.
const PHOTO_BUCKET = 'comment-photos'

async function uploadPhoto(file, plate, id) {
  if (!file) return null
  if (!supabase) throw new Error('Supabase is not configured.')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${plate}/${id}.${ext || 'jpg'}`
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw new Error(error.message || 'Photo upload failed.')
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

// Shape the small, always-loaded reference data (regions) from Supabase rows.
// Comments themselves are NOT loaded here — they're paged per view via feedApi.
function buildProvinces(provincesRows) {
  return provincesRows
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((p) => ({ slug: p.slug, code: p.code, name: { uk: p.name_uk, en: p.name_en } }))
}

export function FeedProvider({ children }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // { [commentId]: -1 | 1 } — one entry per voted comment this session.
  const [sessionVotes, setSessionVotes] = useState(readSessionVotes)
  // Mirror of the ledger, mutated synchronously so rapid clicks toggle correctly
  // (state closures lag by a render; a ref does not).
  const sessionVotesRef = useRef(sessionVotes)

  // Current signed-in user, read from a ref so castVote's identity stays fresh
  // across login/logout without re-creating the callback (which would re-render
  // every comment card).
  const { user } = useAuth()
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  const refresh = useCallback(async () => {
    setLoading(true)
    if (!hasSupabase) {
      setError(new Error('Supabase is not configured (missing env vars).'))
      setLoading(false)
      return
    }
    try {
      // Only lightweight, whole-app data is loaded up front: regions, the
      // leaderboard and per-province counts. The ranking period is static config
      // (see i18n/strings.js). The (up to 10k+) comments are paged on demand by
      // each page via feedApi.
      const [provincesR, rankings, provinceCounts] = await Promise.all([
        supabase.from('provinces').select('slug, code, name_uk, name_en, sort'),
        fetchRankings(10),
        fetchProvinceCounts()
      ])
      if (provincesR.error) throw provincesR.error

      setData({
        provinces: buildProvinces(provincesR.data),
        rankings: { period: appConfig.rankingPeriod, entries: rankings },
        provinceCounts
      })
      setError(null)
    } catch (e) {
      console.warn('[feed] load failed:', e.message || e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const provinceForPlate = useCallback((plate) => {
    return provinceForPlateCode(plate)
  }, [])

  // Toggle a vote in direction `dir` (1 = up, -1 = down). One vote per comment
  // per session: clicking the active direction again clears it. Reads the latest
  // ledger from a ref so back-to-back clicks resolve correctly (no stale render).
  // Returns the up/down delta { dUp, dDown } for the transition so the calling
  // card can optimistically adjust its own displayed counts, or null if the click
  // was a no-op. Comments no longer live in a global array, so there's nothing to
  // mutate here beyond the session ledger + persistence.
  const castVote = useCallback((comment, dir) => {
    const prev = sessionVotesRef.current[comment.id] || 0
    const value = prev === dir ? 0 : dir // same direction toggles off
    if (value - prev === 0) return null

    const next = { ...sessionVotesRef.current }
    if (value === 0) delete next[comment.id]
    else next[comment.id] = value
    sessionVotesRef.current = next
    try { localStorage.setItem(SESSION_VOTES_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    setSessionVotes(next)

    const dUp = (value === 1 ? 1 : 0) - (prev === 1 ? 1 : 0)
    const dDown = (value === -1 ? 1 : 0) - (prev === -1 ? 1 : 0)

    // Persist to Supabase (best effort). Writes go through a SECURITY DEFINER
    // RPC — the votes table has no direct write policies (see schema.sql); value
    // 0 clears this voter's vote on the comment. Signed-in users vote via
    // cast_vote_auth, which derives identity from auth.uid() server-side so their
    // vote can't be dropped or flipped by anyone else; anonymous visitors keep
    // the per-browser voter_key path.
    if (supabase) {
      const request = userRef.current
        ? supabase.rpc('cast_vote_auth', { p_comment_id: comment.id, p_value: value })
        : supabase.rpc('cast_vote', { p_comment_id: comment.id, p_voter_key: voterKey(), p_value: value })
      request.then(({ error: e } = {}) => {
        if (e) console.warn('[feed] vote failed:', e.message || e)
      })
    }
    return { dUp, dDown }
  }, [])

  const addComment = useCallback(async ({ plate, category, description, author, photoFile }) => {
    const norm = normalizePlate(plate)
    const province = provinceForPlate(norm)
    if (!supabase) throw new Error('Supabase is not configured (missing env vars).')
    if (!isValidPlate(norm) || !province) throw new Error('Invalid Ukrainian regional plate.')

    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `c-${Date.now()}`
    const photo = await uploadPhoto(photoFile, norm, id)
    // ignoreDuplicates: existing plates are left untouched (there is no
    // update policy on plates, so the ON CONFLICT UPDATE path would fail).
    const { error: plateError } = await supabase.from('plates').upsert(
      { plate: norm, province },
      { onConflict: 'plate', ignoreDuplicates: true }
    )
    if (plateError) throw new Error(plateError.message || 'Could not save the plate.')

    // created_at is left to the DB default now — the insert policy rejects
    // forged timestamps, and client clocks can be skewed.
    const { error: commentError } = await supabase.from('comments').insert({
      id, plate: norm, author: author || null, category,
      text_uk: description, text_en: description, photo, upvotes: 0, downvotes: 0
    })
    if (commentError) throw new Error(commentError.message || 'Could not save the comment.')

    // Reflect the new comment in the leaderboard / province counts. The plate
    // detail page the user lands on next fetches its own fresh comment page.
    await refresh()
    return { plate: norm }
  }, [provinceForPlate, refresh])

  const value = useMemo(() => ({
    provinces: data?.provinces || [],
    rankings: data?.rankings || { period: '', entries: [] },
    provinceCounts: data?.provinceCounts || {},
    loading,
    error,
    refresh,
    castVote,
    addComment,
    sessionVotes
  }), [data, loading, error, refresh, castVote, addComment, sessionVotes])

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>
}

export function useFeed() {
  const ctx = useContext(FeedContext)
  if (!ctx) throw new Error('useFeed must be used within a FeedProvider')
  return ctx
}
