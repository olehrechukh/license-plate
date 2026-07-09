import { useI18n } from '../i18n/useI18n.js'
import ProvinceGrid from '../components/ProvinceGrid.jsx'

export default function Provinces() {
  const { s } = useI18n()
  return (
    <div className="container page">
      <h1 className="page__title">{s('provinces.title')}</h1>
      <p className="page__intro">{s('provinces.intro')}</p>
      <ProvinceGrid />
    </div>
  )
}
