import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { useFeedData } from '../data/useFeedData.js'
import { fetchComments } from '../data/feedApi.js'
import PlateSearch from '../components/PlateSearch.jsx'
import CommentCard from '../components/CommentCard.jsx'
import RankingTable from '../components/RankingTable.jsx'

export default function Home() {
  const { s } = useI18n()
  const { rankings } = useFeedData()
  const [selected, setSelected] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchComments({ sort: 'newest', from: 0, to: 9 }).then(({ rows }) => {
      if (!cancelled) setSelected(rows)
    })
    return () => { cancelled = true }
  }, [])

  const topRanking = rankings.entries.slice(0, 5)

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <h1 className="hero__title">{s('home.heroTitle')}</h1>
          <p className="hero__subtitle">{s('home.heroSubtitle')}</p>
          <div className="hero__search">
            <PlateSearch />
          </div>
        </div>
      </section>

      <div className="container page-grid">
        <div className="page-grid__main">
          <div className="section-head">
            <h2>{s('home.selectedCommentsTitle')}</h2>
            <Link to="/comments" className="link-more">{s('home.viewAll')} →</Link>
          </div>
          <div className="comment-list">
            {selected.map((c) => (
              <CommentCard key={c.id} comment={c} />
            ))}
          </div>
        </div>

        <aside className="page-grid__rail">
          <div className="rail-card">
            <div className="section-head">
              <h2>{s('home.currentRankingTitle')}</h2>
              <Link to="/rankings" className="link-more">{s('home.viewAll')} →</Link>
            </div>
            <RankingTable entries={topRanking} compact />
          </div>
        </aside>
      </div>
    </>
  )
}
