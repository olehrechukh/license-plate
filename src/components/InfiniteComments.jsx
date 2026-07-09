import { useEffect, useRef } from 'react'
import CommentCard from './CommentCard.jsx'

/**
 * Renders a comment list and, when more pages exist, an off-screen sentinel that
 * triggers loadMore() as it approaches the viewport (infinite scroll). Only the
 * loaded rows are in the DOM at any moment — page size bounds growth per fetch.
 */
export default function InfiniteComments({ comments, hasMore, loadMore, loadingMore, showPlate = true }) {
  const sentinel = useRef(null)

  useEffect(() => {
    if (!hasMore) return
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '600px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadMore])

  return (
    <>
      <div className="comment-list">
        {comments.map((c) => (
          <CommentCard key={c.id} comment={c} showPlate={showPlate} />
        ))}
      </div>
      {hasMore && <div ref={sentinel} className="infinite-sentinel" aria-hidden="true" />}
      {loadingMore && <div className="infinite-loading" aria-hidden="true" />}
    </>
  )
}
