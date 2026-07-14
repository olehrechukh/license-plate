import { useI18n } from '../i18n/useI18n.js'
import { trackEvent } from '../lib/analytics.js'

// UK / EN toggle. Labels for each option come from the feed's langSwitch block.
export default function LangSwitch() {
  const { lang, setLang, languages, s } = useI18n()

  return (
    <div className="lang-switch" role="group" aria-label={s('langSwitch.label')}>
      {languages.map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-switch__btn ${lang === code ? 'is-active' : ''}`}
          aria-pressed={lang === code}
          onClick={() => {
            if (lang !== code) {
              trackEvent('language_change', { language: code })
            }
            setLang(code)
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
