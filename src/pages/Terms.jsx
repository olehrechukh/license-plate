import { useI18n } from '../i18n/useI18n.js'

export default function Terms() {
  const { s } = useI18n()
  return (
    <div className="container page page--narrow">
      <h1 className="page__title">{s('terms.title')}</h1>
      <p className="prose">{s('terms.body')}</p>
    </div>
  )
}
