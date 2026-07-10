import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import PlateSearch from './PlateSearch.jsx'
import LangSwitch from './LangSwitch.jsx'
import AuthControl from './AuthControl.jsx'

export default function Header() {
  const { s } = useI18n()
  const [open, setOpen] = useState(false)

  const navItems = [
    { to: '/provinces', label: s('nav.provinces') },
    { to: '/comments', label: s('nav.comments') },
    { to: '/rankings', label: s('nav.rankings') },
    { to: '/new-comment', label: s('nav.addComment'), cta: true }
  ]

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="ua-strip" aria-hidden="true">
            <span className="ua-strip__flag"></span>
            <span className="ua-strip__code">UA</span>
          </span>
          <span className="brand__name">{s('site.name')}</span>
        </Link>

        <button
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span></span><span></span><span></span>
        </button>

        <nav
          className={`site-nav ${open ? 'is-open' : ''}`}
          onClick={(event) => {
            // Keep the mobile menu mounted until the clicked link completes navigation.
            if (event.target.closest('a')) setOpen(false)
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${item.cta ? 'nav-link--cta' : ''} ${isActive ? 'is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="site-nav__tools">
            <AuthControl />
            <PlateSearch compact onSubmitSuccess={() => setOpen(false)} />
            <LangSwitch />
          </div>
        </nav>
      </div>
    </header>
  )
}
