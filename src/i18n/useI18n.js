import { useMemo } from 'react'
import { useLanguage } from './LanguageContext.jsx'

// Replace {name} tokens in a template string with params.
export function format(template, params = {}) {
  if (typeof template !== 'string') return template
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : m
  )
}

// Pick the active-language leaf from a {uk, en} localized value.
// Falls back to the raw value if it isn't a localized object.
export function pickLocalized(value, lang) {
  if (value && typeof value === 'object' && (lang in value)) return value[lang]
  return value
}

/**
 * Ergonomic i18n hook.
 *   const { lang, s, t, loc } = useI18n()
 *   s('home.heroTitle')                  -> string at that path in feed[lang]
 *   t('plateDetail.reportedTimes', {count: 3})  -> interpolated
 *   loc(province.name)                   -> province.name[lang]
 */
export function useI18n() {
  const { lang, strings, setLang, languages } = useLanguage()

  return useMemo(() => {
    const s = (path) => {
      const val = path.split('.').reduce(
        (acc, key) => (acc == null ? undefined : acc[key]),
        strings
      )
      return val == null ? path : val
    }
    const t = (path, params) => format(s(path), params)
    const loc = (value) => pickLocalized(value, lang)
    return { lang, setLang, languages, strings, s, t, loc }
  }, [lang, strings, setLang, languages])
}
