import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { useFeedData } from '../data/useFeedData.js'
import { useComments } from '../data/useComments.js'
import { fetchPlate } from '../data/feedApi.js'
import InfiniteComments from '../components/InfiniteComments.jsx'

export default function PlateDetail() {
  const { plate: plateParam } = useParams()
  const { s, t } = useI18n()
  const { provinceName, normalizePlate } = useFeedData()

  const plateCode = normalizePlate(plateParam)
  const [record, setRecord] = useState(null)
  const { rows, count, loading, hasMore, loadMore, loadingMore } = useComments({ plate: plateCode })

  useEffect(() => {
    let cancelled = false
    fetchPlate(plateCode).then((r) => { if (!cancelled) setRecord(r) })
    return () => { cancelled = true }
  }, [plateCode])

  return (
    <div className="container page">
      <div className="plate-detail__header">
        <span className="plate-plate">{plateCode}</span>
        {record && (
          <div className="plate-detail__meta">
            <span className="plate-detail__region">{provinceName(record.province)}</span>
            <span className={`plate-detail__score ${record.score < 0 ? 'score-neg' : ''}`}>
              {s('plateDetail.scoreLabel')}: {record.score}
            </span>
            <span className="plate-detail__count">
              {t('plateDetail.reportedTimes', { count })}
            </span>
          </div>
        )}
      </div>

      <h1 className="page__title">
        {s('plateDetail.commentsForPlate')}
      </h1>

      {!loading && rows.length === 0 ? (
        <p className="empty-state">{s('plateDetail.noComments')}</p>
      ) : (
        <InfiniteComments
          comments={rows}
          hasMore={hasMore}
          loadMore={loadMore}
          loadingMore={loadingMore}
          showPlate={false}
        />
      )}

      <Link to={`/new-comment?plate=${encodeURIComponent(plateCode)}`} className="btn btn--primary btn--lg add-cta">
        {s('plateDetail.addCommentCta')}
      </Link>
    </div>
  )
}
