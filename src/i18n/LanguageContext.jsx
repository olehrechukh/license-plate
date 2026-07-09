import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { supabase, hasSupabase } from '../lib/supabase.js'

const STORAGE_KEY = 'lp-lang'
const LanguageContext = createContext(null)

function readStoredLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function LanguageProvider({ children }) {
  const [stringsByLang, setStringsByLang] = useState(null) // { uk: {...}, en: {...} }
  const [languages, setLanguages] = useState([])
  const [defaultLang, setDefaultLang] = useState('uk')
  const [lang, setLangState] = useState(() => readStoredLang() || 'uk')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    if (!hasSupabase) {
      setError(new Error('Supabase is not configured (missing env vars).'))
      setLoading(false)
      return
    }
    try {
      const [strings, config] = await Promise.all([
        supabase.from('app_strings').select('lang, data'),
        supabase.from('app_config').select('default_lang').eq('id', 1).maybeSingle()
      ])
      if (strings.error) throw strings.error
      if (config.error) throw config.error

      const byLang = Object.fromEntries((strings.data || []).map((r) => [r.lang, r.data]))
      const langs = Object.keys(byLang)
      if (langs.length === 0) throw new Error('No translations found (app_strings is empty).')

      const def = config.data?.default_lang || langs[0]
      setStringsByLang(byLang)
      setLanguages(langs)
      setDefaultLang(def)
      setLangState((cur) => (langs.includes(cur) ? cur : def))
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setLang = useCallback((next) => {
    setLangState((cur) => {
      if (!languages.includes(next)) return cur
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [languages])

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  const value = useMemo(() => ({
    lang,
    setLang,
    languages,
    defaultLang,
    strings: stringsByLang ? stringsByLang[lang] : null,
    loading,
    error,
    reload: load
  }), [lang, setLang, languages, defaultLang, stringsByLang, loading, error, load])

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
