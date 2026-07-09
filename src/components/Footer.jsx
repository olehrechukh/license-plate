import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'

export default function Footer() {
  const { s } = useI18n()
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p className="site-footer__tagline">{s('footer.tagline')}</p>
        <div className="site-footer__meta">
          <Link to="/contact" className="site-footer__link">{s('footer.contactLink')}</Link>
          <Link to="/terms" className="site-footer__link">{s('nav.terms')}</Link>
        </div>
        <p className="site-footer__copy">{s('footer.copyright')}</p>
      </div>
    </footer>
  )
}
