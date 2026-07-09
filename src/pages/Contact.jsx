import { useI18n } from '../i18n/useI18n.js'

export default function Contact() {
  const { s } = useI18n()
  return (
    <div className="container page page--narrow">
      <h1 className="page__title">{s('contact.title')}</h1>
      <p className="prose">{s('contact.body')}</p>
      <a className="contact-email" href={`mailto:${s('contact.email')}`}>
        {s('contact.email')}
      </a>
    </div>
  )
}
