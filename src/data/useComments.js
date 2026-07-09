import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchComments } from './feedApi.js'

const PAGE = 20

/**
 * Infinite-scroll comment list backed by server-side pagination. Refetches from
 * page 0 whenever the filter/sort identity changes; loadMore() appends the next
 * page (wire it to an IntersectionObserver sentinel). `count` is the true total
 * for the current filter, independent of how many pages are loaded.
 */
export function useComments({ plate, province, sort = 'newest' } = {}) {
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageRef = useRef(0)
  const doneRef = useRef(false)
  const countRef = useRef(0)

  // Reset and load the first page when the query identity changes.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    pageRef.current = 0
    doneRef.current = false
    fetchComments({ plate, province, sort, from: 0, to: PAGE - 1 }).then(({ rows, count }) => {
      if (cancelled) return
      countRef.current = count
      doneRef.current = rows.length >= count
      setRows(rows)
      setCount(count)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [plate, province, sort])

  const loadMore = useCallback(async () => {
    if (doneRef.current || loadingMore) return
    setLoadingMore(true)
    const next = pageRef.current + 1
    const from = next * PAGE
    const { rows: more } = await fetchComments({ plate, province, sort, from, to: from + PAGE - 1 })
    pageRef.current = next
    setRows((prev) => {
      const merged = prev.concat(more)
      doneRef.current = merged.length >= countRef.current
      return merged
    })
    setLoadingMore(false)
  }, [plate, province, sort, loadingMore])

  const hasMore = rows.length < count
  return { rows, count, loading, loadingMore, hasMore, loadMore }
}
