import { createClient } from '@supabase/supabase-js'

// Reads Vite env vars. The publishable (anon) key is browser-safe — access is
// governed by Row Level Security policies defined in supabase/migrations/.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// If env vars are absent the app silently falls back to the static feed.
export const supabase = url && key ? createClient(url, key) : null
export const hasSupabase = Boolean(supabase)

// Anonymous voter id, persisted per BROWSER (localStorage) so every tab and
// future session shares one identity — a new tab can't re-vote. No auth
// required. (A user can still clear storage or use incognito; real one-vote
// enforcement needs server-side auth.)
export function voterKey() {
  const STORAGE_KEY = 'lp-voter'
  try {
    let k = localStorage.getItem(STORAGE_KEY)
    if (!k) {
      k = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2)
      localStorage.setItem(STORAGE_KEY, k)
    }
    return k
  } catch {
    return 'anonymous'
  }
}
