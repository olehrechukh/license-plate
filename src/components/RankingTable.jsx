import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { useFeedData } from '../data/useFeedData.js'

export default function RankingTable({ entries, compact = false }) {
  const { s } = useI18n()
  const { provinceName } = useFeedData()

  return (
    <div className="ranking-table-wrap">
      <table className="ranking-table">
        <thead>
          <tr>
            <th className="col-rank">{s('rankings.colRank')}</th>
            <th>{s('rankings.colPlate')}</th>
            {!compact && <th>{s('rankings.colRegion')}</th>}
            <th className="col-num">{s('rankings.colScore')}</th>
            {!compact && <th className="col-num">{s('rankings.colComments')}</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.rank}>
              <td className="col-rank"><span className={`rank-badge rank-badge--${e.rank <= 3 ? 'top' : 'std'}`}>{e.rank}</span></td>
              <td>
                <Link to={`/plate/${e.plate}`} className="plate-tag plate-tag--sm">{e.plate}</Link>
              </td>
              {!compact && <td className="col-region">{provinceName(e.province)}</td>}
              <td className="col-num ranking-score">{e.score > 0 ? `+${e.score}` : e.score}</td>
              {!compact && <td className="col-num">{e.commentCount}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
