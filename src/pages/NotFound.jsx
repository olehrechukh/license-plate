import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'

export default function NotFound() {
  const { s } = useI18n()
  return (
    <div className="container page page--narrow notfound">
      <span className="notfound__code">404</span>
      <p className="notfound__text">{s('comments.empty')}</p>
      <Link to="/" className="btn btn--primary">{s('site.name')}</Link>
    </div>
  )
}
