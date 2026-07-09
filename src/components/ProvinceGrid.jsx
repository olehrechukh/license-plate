import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { useFeedData } from '../data/useFeedData.js'
import { codesForSlug } from '../data/plateRegions.js'

export default function ProvinceGrid() {
  const { s } = useI18n()
  const { provinces, provinceName, provinceCount } = useFeedData()

  return (
    <div className="province-grid">
      {provinces.map((p) => {
        const codes = codesForSlug(p.slug)
        return (
          <Link key={p.slug} to={`/provinces/${p.slug}`} className="province-card">
            <span className="province-card__codes">
              {(codes.length ? codes : [p.code]).map((c) => (
                <span key={c} className="code-chip">{c}</span>
              ))}
            </span>
            <span className="province-card__name">{provinceName(p.slug)}</span>
            <span className="province-card__count">
              {provinceCount(p.slug)} {s('provinces.commentsCountLabel')}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
