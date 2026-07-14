import { useState } from 'react'
import { useI18n } from '../i18n/useI18n.js'
import { useComments } from '../data/useComments.js'
import InfiniteComments from '../components/InfiniteComments.jsx'
import { trackEvent } from '../lib/analytics.js'

export default function Comments() {
  const { s } = useI18n()
  const [sort, setSort] = useState('newest')
  const { rows, loading, hasMore, loadMore, loadingMore } = useComments({ sort })

  const changeSort = (nextSort) => {
    if (sort === nextSort) return
    trackEvent('comments_sort_change', { sort: nextSort })
    setSort(nextSort)
  }

  return (
    <div className="container page">
      <div className="page__header-row">
        <h1 className="page__title">{s('comments.title')}</h1>
        <div className="sort-toggle" role="group" aria-label="sort">
          <button
            className={`sort-toggle__btn ${sort === 'newest' ? 'is-active' : ''}`}
            onClick={() => changeSort('newest')}
          >
            {s('comments.sortNewest')}
          </button>
          <button
            className={`sort-toggle__btn ${sort === 'top' ? 'is-active' : ''}`}
            onClick={() => changeSort('top')}
          >
            {s('comments.sortTopVoted')}
          </button>
        </div>
      </div>

      {!loading && rows.length === 0 ? (
        <p className="empty-state">{s('comments.empty')}</p>
      ) : (
        <InfiniteComments
          comments={rows}
          hasMore={hasMore}
          loadMore={loadMore}
          loadingMore={loadingMore}
        />
      )}
    </div>
  )
}
