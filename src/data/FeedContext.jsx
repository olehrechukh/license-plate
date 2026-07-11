import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { isValidPlate, normalizePlate } from './useFeedData.js'
import { provinceForPlateCode } from './plateRegions.js'
import { supabase, hasSupabase, voterKey } from '../lib/supabase.js'
import { fetchRankings, fetchProvinceCounts } from './feedApi.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { currentRankingPeriod } from '../i18n/strings.js'

const FeedContext = createContext(null)

// Vote ledger: { [commentId]: -1 | 1 } — one vote per comment, persisted per
// voter identity so signing in cannot make anonymous votes appear selected.
const SESSION_VOTES_KEY = 'lp-session-votes'
function readSessionVotes(storageKey) {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) return JSON.parse(stored) || {}
    if (storageKey === `${SESSION_VOTES_KEY}:anonymous`) {
      return JSON.parse(localStorage.getItem(SESSION_VOTES_KEY)) || {}
    }
    return {}
  } catch {
    return {}
  }
}

function voteStorageKey(user) {
  return user?.id
    ? `${SESSION_VOTES_KEY}:user:${user.id}`
    : `${SESSION_VOTES_KEY}:anonymous`
}

function writeSessionVotes(storageKey, votes) {
  try { localStorage.setItem(storageKey, JSON.stringify(votes)) } catch { /* ignore */ }
}

function voteDelta(from, to) {
  return {
    up: (to === 1 ? 1 : 0) - (from === 1 ? 1 : 0),
    down: (to === -1 ? 1 : 0) - (from === -1 ? 1 : 0)
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
  const { user } = useAuth()
  const storageKey = voteStorageKey(user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // { [commentId]: -1 | 1 } — one entry per voted comment this session.
  const [sessionVotes, setSessionVotes] = useState(() => readSessionVotes(storageKey))
  const [voteDeltas, setVoteDeltas] = useState({})
  // Mirror of the ledger, mutated synchronously so rapid clicks toggle correctly
  // (state closures lag by a render; a ref does not).
  const sessionVotesRef = useRef(sessionVotes)
  const storageKeyRef = useRef(storageKey)
  const voteRequestsRef = useRef(new Map())
  const voteOperationsRef = useRef(new Map())

  // Current signed-in user, read from a ref so castVote's identity stays fresh
  // across login/logout without re-creating the callback.
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  useEffect(() => {
    storageKeyRef.current = storageKey
    const next = readSessionVotes(storageKey)
    sessionVotesRef.current = next
    voteRequestsRef.current = new Map()
    voteOperationsRef.current = new Map()
    setSessionVotes(next)
    setVoteDeltas({})
  }, [storageKey])

  const refresh = useCallback(async () => {
    setLoading(true)
    if (!hasSupabase) {
      setError(new Error('Supabase is not configured (missing env vars).'))
      setLoading(false)
      return
    }
    try {
      // Only lightweight, whole-app data is loaded up front: regions, the
      // leaderboard and per-province counts. The SQL view limits rankings to the
      // current month. The (up to 10k+) comments are paged on demand by
      // each page via feedApi.
      const [provincesR, rankings, provinceCounts] = await Promise.all([
        supabase.from('provinces').select('slug, code, name_uk, name_en, sort'),
        fetchRankings(10),
        fetchProvinceCounts()
      ])
      if (provincesR.error) throw provincesR.error

      setData({
        provinces: buildProvinces(provincesR.data),
        rankings: { period: currentRankingPeriod(), entries: rankings },
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

  // Toggle one vote per comment. The optimistic delta is shared by all cards and
  // is rolled back if the corresponding RPC fails.
  const castVote = useCallback((comment, dir) => {
    const prev = sessionVotesRef.current[comment.id] || 0
    const value = prev === dir ? 0 : dir
    if (value === prev) return null

    const next = { ...sessionVotesRef.current }
    if (value === 0) delete next[comment.id]
    else next[comment.id] = value
    sessionVotesRef.current = next
    writeSessionVotes(storageKeyRef.current, next)
    setSessionVotes(next)

    const transition = voteDelta(prev, value)
    const operations = voteOperationsRef.current.get(comment.id) || { base: prev, ops: [] }
    const operation = { value, status: 'pending' }
    operations.ops.push(operation)
    voteOperationsRef.current.set(comment.id, operations)
    const identityKey = storageKeyRef.current
    const signedInUser = userRef.current
    const anonymousKey = signedInUser ? null : voterKey()
    const previousRequest = voteRequestsRef.current.get(comment.id) || Promise.resolve()
    const request = previousRequest.catch(() => {}).then(async () => {
      if (!supabase) return
      const result = signedInUser
        ? await supabase.rpc('cast_vote_auth', { p_comment_id: comment.id, p_value: value })
        : await supabase.rpc('cast_vote', { p_comment_id: comment.id, p_voter_key: anonymousKey, p_value: value })
      if (result?.error) throw result.error
      operation.status = 'success'
    })
    voteRequestsRef.current.set(comment.id, request)

    const optimisticDelta = voteDelta(operations.base, value)
    setVoteDeltas((current) => ({ ...current, [comment.id]: optimisticDelta }))

    request.catch((e) => {
      console.warn('[feed] vote failed:', e.message || e)
      if (storageKeyRef.current !== identityKey) return
      operation.status = 'failed'
      const active = operations.ops.slice().reverse().find((item) => item.status !== 'failed')
      const restoredVote = active ? active.value : operations.base
      const restored = { ...sessionVotesRef.current }
      if (restoredVote === 0) delete restored[comment.id]
      else restored[comment.id] = restoredVote
      sessionVotesRef.current = restored
      writeSessionVotes(storageKeyRef.current, restored)
      setSessionVotes(restored)
      const base = operations.base
      const currentVote = restoredVote
      const updated = voteDelta(base, currentVote)
      setVoteDeltas((current) => {
        const nextDeltas = { ...current }
        if (updated.up === 0 && updated.down === 0) delete nextDeltas[comment.id]
        else nextDeltas[comment.id] = updated
        return nextDeltas
      })
    }).finally(() => {
      if (voteRequestsRef.current.get(comment.id) === request) {
        voteRequestsRef.current.delete(comment.id)
      }
    })
    return { dUp: transition.up, dDown: transition.down }
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
    sessionVotes,
    voteDeltas
  }), [data, loading, error, refresh, castVote, addComment, sessionVotes, voteDeltas])

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>
}

export function useFeed() {
  const ctx = useContext(FeedContext)
  if (!ctx) throw new Error('useFeed must be used within a FeedProvider')
  return ctx
}
