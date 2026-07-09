import { useLanguage } from '../i18n/LanguageContext.jsx'
import { useFeed } from '../data/FeedContext.jsx'

// Blocks the app until translations + data have loaded from Supabase.
// There is no static fallback, so a load failure shows a retry screen.
export default function AppGate({ children }) {
  const lang = useLanguage()
  const feed = useFeed()

  const loading = lang.loading || feed.loading
  const error = lang.error || feed.error

  if (error) {
    const retry = () => { lang.reload(); feed.refresh() }
    return (
      <div className="boot boot--error">
        <span className="ua-strip boot__badge" aria-hidden="true">
          <span className="ua-strip__flag"></span>
          <span className="ua-strip__code">UA</span>
        </span>
        <h1 className="boot__title">Could not load data / Не вдалося завантажити дані</h1>
        <p className="boot__text">
          The app reads its content from Supabase. Make sure the database is reachable and
          that <code>supabase/schema.sql</code> and <code>supabase/seed.sql</code> have been run.
        </p>
        <button className="btn btn--primary" onClick={retry}>Retry / Повторити</button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="boot">
        <span className="ua-strip boot__badge boot__badge--pulse" aria-hidden="true">
          <span className="ua-strip__flag"></span>
          <span className="ua-strip__code">UA</span>
        </span>
        <p className="boot__text">…</p>
      </div>
    )
  }

  return children
}
