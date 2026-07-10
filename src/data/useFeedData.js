import { useMemo } from 'react'
import { useI18n } from '../i18n/useI18n.js'
import { useFeed } from './FeedContext.jsx'

const CYRILLIC_TO_LATIN = {
  '\u0410': 'A', '\u0412': 'B', '\u0415': 'E', '\u0406': 'I', '\u041a': 'K', '\u041c': 'M',
  '\u041d': 'H', '\u041e': 'O', '\u0420': 'P', '\u0421': 'C', '\u0422': 'T', '\u0425': 'X'
}

export function normalizePlate(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[\u0410\u0412\u0415\u0406\u041a\u041c\u041d\u041e\u0420\u0421\u0422\u0425]/g, (letter) => CYRILLIC_TO_LATIN[letter])
    .replace(/\s+/g, '')
    .trim()
}

// Browser-side equivalent of the public plate syntax accepted by the database.
export function isValidPlate(value) {
  return /^[A-Z0-9]{3,10}$/.test(normalizePlate(value))
}

/**
 * Presentation selectors over the always-loaded reference data (regions,
 * leaderboard, per-province counts). Comment lists are NOT here — pages fetch
 * those paged via feedApi/useComments. Province names, category labels and dates
 * resolve against the active language's loaded strings.
 */
export function useFeedData() {
  const { lang, loc, s, strings } = useI18n()
  const { provinces, rankings, provinceCounts, loading } = useFeed()

  return useMemo(() => {
    const provinceBySlug = new Map(provinces.map((p) => [p.slug, p]))

    const provinceName = (slug) => {
      const p = provinceBySlug.get(slug)
      return p ? loc(p.name) : slug
    }
    const categoryLabel = (key) => (strings?.categories?.[key]) || key
    const commentText = (comment) => loc(comment.text)

    const formatDate = (iso) =>
      new Intl.DateTimeFormat(lang === 'uk' ? 'uk-UA' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric'
      }).format(new Date(iso))

    return {
      provinces,
      rankings,
      loading,

      getProvince: (slug) => provinceBySlug.get(slug) || null,
      provinceCount: (slug) => provinceCounts[slug] || 0,

      provinceName,
      categoryLabel,
      commentText,
      formatDate,
      normalizePlate,
      s
    }
  }, [lang, loc, s, strings, provinces, rankings, provinceCounts, loading])
}
