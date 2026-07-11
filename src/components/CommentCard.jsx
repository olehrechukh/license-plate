import { Link } from 'react-router-dom'
import { useFeedData } from '../data/useFeedData.js'
import { useFeed } from '../data/FeedContext.jsx'
import CategoryBadge from './CategoryBadge.jsx'

export default function CommentCard({ comment, showPlate = true }) {
  const { commentText, formatDate, provinceName, s } = useFeedData()
  const { castVote, sessionVotes, voteDeltas } = useFeed()
  const myVote = sessionVotes[comment.id] || 0
  const delta = voteDeltas[comment.id] || { up: 0, down: 0 }
  const ups = comment.ups + delta.up
  const downs = comment.downs + delta.down
  const cast = (dir) => castVote(comment, dir)

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

      <div className="comment-card__foot">
        <span className="comment-card__author">@{comment.author}</span>
        <span className="comment-card__date">{formatDate(comment.createdAt)}</span>
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
