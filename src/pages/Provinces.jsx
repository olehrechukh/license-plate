import { useEffect } from 'react'
import { useI18n } from '../i18n/useI18n.js'
import { trackEvent } from '../lib/analytics.js'
import ProvinceGrid from '../components/ProvinceGrid.jsx'

export default function Provinces() {
  const { s } = useI18n()

  useEffect(() => {
    trackEvent('province_directory_view')
  }, [])
  return (
    <div className="container page">
      <h1 className="page__title">{s('provinces.title')}</h1>
      <p className="page__intro">{s('provinces.intro')}</p>
      <ProvinceGrid />
    </div>
  )
}
