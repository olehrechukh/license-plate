import { useParams, Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { useFeedData } from '../data/useFeedData.js'
import { useComments } from '../data/useComments.js'
import InfiniteComments from '../components/InfiniteComments.jsx'

export default function Province() {
  const { slug } = useParams()
  const { s } = useI18n()
  const { getProvince, provinceName } = useFeedData()
  const { rows, loading, hasMore, loadMore, loadingMore } = useComments({ province: slug })

  const province = getProvince(slug)

  if (!province) {
    return (
      <div className="container page">
        <h1 className="page__title">{s('provinces.title')}</h1>
        <p className="empty-state">{s('comments.empty')}</p>
        <Link to="/provinces" className="btn btn--ghost">← {s('nav.provinces')}</Link>
      </div>
    )
  }

  return (
    <div className="container page">
      <nav className="breadcrumb">
        <Link to="/provinces">{s('nav.provinces')}</Link>
        <span aria-hidden="true"> / </span>
        <span>{provinceName(slug)}</span>
      </nav>
      <h1 className="page__title">{provinceName(slug)}</h1>

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
