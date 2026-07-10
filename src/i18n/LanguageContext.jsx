import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { strings as allStrings, config as appConfig } from './strings.js'

const STORAGE_KEY = 'lp-lang'
const LanguageContext = createContext(null)

const LANGUAGES = appConfig.languages
const DEFAULT_LANG = appConfig.defaultLang

function readStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && LANGUAGES.includes(stored) ? stored : null
  } catch {
    return null
  }
}

export function LanguageProvider({ children }) {
  // Strings and config are bundled (see strings.js), so language is resolved
  // synchronously — there's no load step, loading state, or failure mode.
  const [lang, setLangState] = useState(() => readStoredLang() || DEFAULT_LANG)

  const setLang = useCallback((next) => {
    setLangState((cur) => {
      if (!LANGUAGES.includes(next)) return cur
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  const value = useMemo(() => ({
    lang,
    setLang,
    languages: LANGUAGES,
    defaultLang: DEFAULT_LANG,
    strings: allStrings[lang],
    // Kept for API compatibility with consumers (e.g. AppGate); always settled.
    loading: false,
    error: null,
    reload: () => {}
  }), [lang, setLang])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
