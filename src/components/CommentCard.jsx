import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFeedData } from '../data/useFeedData.js'
import { useFeed } from '../data/FeedContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import CategoryBadge from './CategoryBadge.jsx'
import { trackEvent } from '../lib/analytics.js'

function sourceHost(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    return sourceUrl
  }
}

export default function CommentCard({ comment, showPlate = true }) {
  const { commentText, formatDate, provinceName, s } = useFeedData()
  const { user } = useAuth()
  const { castVote, deleteComment, deletedCommentIds, sessionVotes, voteDeltas } = useFeed()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const isAdmin = user?.app_metadata?.role === 'admin'
  const myVote = sessionVotes[comment.id] || 0
  const delta = voteDeltas[comment.id] || { up: 0, down: 0 }
  const ups = comment.ups + delta.up
  const downs = comment.downs + delta.down
  const cast = (dir) => {
    trackEvent('comment_vote', { direction: dir === 1 ? 'up' : 'down' })
    castVote(comment, dir)
  }
  const remove = async () => {
    if (!window.confirm(s('comments.deleteConfirm'))) return
    setDeleting(true)
    setDeleteError(false)
    try {
      await deleteComment(comment.id)
      trackEvent('comment_soft_deleted')
    } catch (error) {
      console.warn('[comment] delete failed:', error.message || error)
      setDeleteError(true)
      setDeleting(false)
    }
  }

  if (deletedCommentIds.has(comment.id)) return null

  return (
    <article className="comment-card">
      <div className="comment-card__head">
        {showPlate && (
          <Link to={`/plate/${comment.plate}`} className="plate-tag plate-tag--with-strip">
            <span className="ua-strip" aria-hidden="true">
              <span className="ua-strip__flag"></span>
              <span className="ua-strip__code">UA</span>
            </span>
            {comment.plate}
          </Link>
        )}
        <CategoryBadge category={comment.category} />
        {comment.province && (
          <span className="comment-card__region">{provinceName(comment.province)}</span>
        )}
      </div>

      <p className="comment-card__text">{commentText(comment)}</p>

      {comment.photo && (
        <img className="comment-card__photo" src={comment.photo} alt="" loading="lazy" />
      )}

      {comment.sourceUrl && (
        <a
          className="comment-card__source"
          href={comment.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {s('comments.importedFrom')} {sourceHost(comment.sourceUrl)} ↗
        </a>
      )}

      {deleteError && (
        <p className="comment-card__delete-error" role="alert">{s('comments.deleteFailed')}</p>
      )}

      <div className="comment-card__foot">
        <span className="comment-card__author">@{comment.author}</span>
        <span className="comment-card__date">{formatDate(comment.createdAt)}</span>
        {isAdmin && (
          <button
            type="button"
            className="comment-card__delete"
            disabled={deleting}
            onClick={remove}
          >
            {s(deleting ? 'comments.deleting' : 'comments.delete')}
          </button>
        )}
        <div className="votebar" role="group" aria-label={s('vote.label')}>
          <span className="votecount votecount--up">{ups}</span>
          <button
            type="button"
            className={`votebtn votebtn--up ${myVote === 1 ? 'is-active' : ''}`}
            aria-pressed={myVote === 1}
            aria-label={s('vote.up')}
            title={s('vote.up')}
            onClick={() => cast(1)}
          >
            +
          </button>
          <button
            type="button"
            className={`votebtn votebtn--down ${myVote === -1 ? 'is-active' : ''}`}
            aria-pressed={myVote === -1}
            aria-label={s('vote.down')}
            title={s('vote.down')}
            onClick={() => cast(-1)}
          >
            −
          </button>
          <span className="votecount votecount--down">{downs}</span>
        </div>
      </div>
    </article>
  )
}
