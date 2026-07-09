import { useMemo } from 'react'
import { useI18n } from '../i18n/useI18n.js'
import { useFeed } from './FeedContext.jsx'

export function normalizePlate(value) {
  return String(value || '').toUpperCase().replace(/\s+/g, '').trim()
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
