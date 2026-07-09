import { useI18n } from '../i18n/useI18n.js'
import { useFeedData } from '../data/useFeedData.js'
import RankingTable from '../components/RankingTable.jsx'

export default function Rankings() {
  const { s } = useI18n()
  const { rankings } = useFeedData()

  return (
    <div className="container page">
      <h1 className="page__title">{s('rankings.title')}</h1>
      <p className="page__intro">{s('rankings.subtitle')}</p>
      <p className="ranking-period">
        {s('rankings.period')}: <strong>{rankings.period}</strong>
      </p>
      <RankingTable entries={rankings.entries} />
    </div>
  )
}
