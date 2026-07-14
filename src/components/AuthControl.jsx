import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n.js'
import { useAuth } from '../auth/AuthContext.jsx'
import GoogleMark from './GoogleMark.jsx'
import { trackEvent } from '../lib/analytics.js'

export default function AuthControl() {
  const { lang, s } = useI18n()
  const { enabled, loading, signingIn, error, user, signInWithGoogle, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close the account menu on outside click or Escape, the two ways a user
  // expects to dismiss a popover without committing to anything in it.
  useEffect(() => {
    if (!menuOpen) return undefined

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  if (!enabled) return null

  // `auth.*` keys only exist once the migration-backed auth strings are available; until then the
  // i18n helper echoes the key back, so fall back to a literal.
  const label = (key, uk, en) => {
    const value = s(`auth.${key}`)
    return value === `auth.${key}` ? (lang === 'uk' ? uk : en) : value
  }
  const signInLabel = label('googleSignIn', 'Увійти через Google', 'Sign in with Google')
  const signOutLabel = label('signOut', 'Вийти', 'Sign out')
  const signingInLabel = label('signingIn', 'Переадресація…', 'Redirecting…')
  const errorLabel = label(
    'signInFailed',
    'Не вдалося увійти через Google. Спробуйте ще раз.',
    'Could not sign in with Google. Please try again.'
  )

  // Reserve the control's footprint while the session resolves, so the header
  // doesn't reflow the moment auth settles.
  if (loading) {
    return <div className="auth-control auth-control--pending" aria-hidden="true" />
  }

  if (!user) {
    return (
      <div className="auth-control">
        <button
          className="auth-btn auth-btn--google auth-btn--icon"
          type="button"
          disabled={signingIn}
          onClick={() => {
            trackEvent('sign_in_click', { method: 'google' })
            signInWithGoogle()
          }}
          aria-label={signingIn ? signingInLabel : signInLabel}
          title={signingIn ? signingInLabel : signInLabel}
        >
          {signingIn ? <span className="auth-btn__spinner" aria-hidden="true" /> : <GoogleMark />}
        </button>
        {error && <p className="auth-control__error" role="alert">{errorLabel}</p>}
      </div>
    )
  }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || ''
  const email = user.email || ''
  const avatar = user.user_metadata?.avatar_url
  const initial = (displayName || email).slice(0, 1).toUpperCase() || '?'

  return (
    <div className="auth-control" ref={menuRef}>
      <button
        className="auth-menu__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {avatar ? (
          <img className="auth-menu__avatar" src={avatar} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="auth-menu__avatar auth-menu__avatar--initial" aria-hidden="true">{initial}</span>
        )}
        <span className="auth-menu__name">{displayName}</span>
        <svg className="auth-menu__chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {menuOpen && (
        <div className="auth-menu__panel" role="menu">
          <div className="auth-menu__identity">
            <span className="auth-menu__identity-name">{displayName}</span>
            {email && email !== displayName && (
              <span className="auth-menu__identity-email">{email}</span>
            )}
          </div>
          <button
            className="auth-menu__item"
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              signOut()
            }}
          >
            {signOutLabel}
          </button>
        </div>
      )}

      {error && <p className="auth-control__error" role="alert">{errorLabel}</p>}
    </div>
  )
}
