import { supabase } from '../lib/supabase.js'

// Columns selected from the comments_feed view (region + live vote counts folded
// in), shaped into the UI comment object the cards/pages expect.
const COMMENT_COLS = 'id, plate, province, author, category, text_uk, text_en, photo, created_at, ups, downs'

export function toComment(row) {
  return {
    id: row.id,
    plate: row.plate,
    province: row.province,
    author: row.author,
    category: row.category,
    createdAt: row.created_at,
    ups: row.ups,
    downs: row.downs,
    text: { uk: row.text_uk, en: row.text_en },
    photo: row.photo
  }
}

/**
 * One page of comments, sorted + filtered + paged server-side.
 *   filter: { plate } | { province } | {}   sort: 'newest' | 'top'
 * Returns { rows, count } where count is the exact total for the filter.
 */
export async function fetchComments({ plate, province, sort = 'newest', from = 0, to = 19 } = {}) {
  if (!supabase) return { rows: [], count: 0 }
  let q = supabase.from('comments_feed').select(COMMENT_COLS, { count: 'exact' })
  if (plate) q = q.eq('plate', plate)
  if (province) q = q.eq('province', province)
  // Deterministic ordering with a stable tiebreaker so pages never overlap/skip.
  if (sort === 'top') q = q.order('net', { ascending: false }).order('created_at', { ascending: false })
  else q = q.order('created_at', { ascending: false })
  q = q.order('id', { ascending: true }).range(from, to)

  const { data, count, error } = await q
  if (error) {
    console.warn('[feed] fetchComments failed:', error.message || error)
    return { rows: [], count: 0 }
  }
  return { rows: (data || []).map(toComment), count: count || 0 }
}

// A single plate's live record for the plate detail header. It uses the same
// derived score as the leaderboard, so the two views cannot diverge.
export async function fetchPlate(code) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('plate_rankings')
    .select('plate, province, score, comment_count')
    .eq('plate', code)
    .maybeSingle()
  if (error) {
    console.warn('[feed] fetchPlate failed:', error.message || error)
    return null
  }
  return data
}

// Worst-driver leaderboard (top `limit` plates by current-period net score).
export async function fetchRankings(limit = 10) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('plate_rankings')
    .select('plate, province, score, comment_count')
    .gt('comment_count', 0)
    .order('score', { ascending: true })
    .order('comment_count', { ascending: false })
    .order('plate', { ascending: true })
    .limit(limit)
  if (error) {
    console.warn('[feed] fetchRankings failed:', error.message || error)
    return []
  }
  return (data || []).map((r, i) => ({
    rank: i + 1, plate: r.plate, province: r.province, score: r.score, commentCount: r.comment_count
  }))
}

// Map of province slug -> total comment count, for the provinces grid.
export async function fetchProvinceCounts() {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('province_comment_counts')
    .select('province, comment_count')
  if (error) {
    console.warn('[feed] fetchProvinceCounts failed:', error.message || error)
    return {}
  }
  const map = {}
  for (const r of data || []) map[r.province] = r.comment_count
  return map
}
