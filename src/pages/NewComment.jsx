import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { useFeed } from '../data/FeedContext.jsx'
import { useFeedData, isValidPlate, normalizePlate } from '../data/useFeedData.js'
import { provinceForPlateCode } from '../data/plateRegions.js'
import { useAuth } from '../auth/AuthContext.jsx'
import GoogleMark from '../components/GoogleMark.jsx'

const MAX_PLATE_LENGTH = 10
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_AUTHOR_LENGTH = 50

export default function NewComment() {
  const { lang, s, strings } = useI18n()
  const navigate = useNavigate()
  const { addComment } = useFeed()
  const { provinceName } = useFeedData()
  const { enabled: authEnabled, loading: authLoading, user, signingIn, signInWithGoogle } = useAuth()
  const [searchParams] = useSearchParams()
  const fields = strings.newComment.fields
  const categoryOptions = fields.category.options

  const [form, setForm] = useState({
    // Prefilled when arriving from a plate page's "add comment" CTA.
    plate: normalizePlate(searchParams.get('plate') || ''),
    category: 'dangerous-driving',
    description: '',
    author: '',
    consent: false
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [submitError, setSubmitError] = useState(false)

  useEffect(() => {
    const suggestedAuthor = user?.user_metadata?.full_name
      || user?.user_metadata?.name
      || user?.email
      || ''
    if (suggestedAuthor && !form.author) {
      setForm((current) => (current.author ? current : { ...current, author: suggestedAuthor }))
    }
  }, [user, form.author])

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    setSubmitError(false)
  }

  const validate = () => {
    const next = {}
    const normalizedPlate = normalizePlate(form.plate)
    if (!isValidPlate(normalizedPlate) || !provinceForPlateCode(normalizedPlate)) next.plate = true
    if (form.description.trim().length < 20) next.description = true
    if (!form.consent) next.consent = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSubmitError(false)
    try {
      const result = await addComment({
        plate: form.plate,
        category: form.category,
        description: form.description.trim(),
        author: form.author.trim(),
        photoFile
      })
      navigate(`/plate/${encodeURIComponent(result.plate)}`)
    } catch (error) {
      console.warn('[comment] submit failed:', error.message || error)
      setSubmitError(true)
    } finally {
      setSaving(false)
    }
  }

  // Live validity — an error only shows while the field is actually invalid, so
  // the red state clears as soon as the condition is met (no wait for resubmit).
  const normalizedPlate = normalizePlate(form.plate)
  const region = provinceForPlateCode(normalizedPlate)
  const plateError = errors.plate && (!isValidPlate(normalizedPlate) || !region)
  const descError = errors.description && form.description.trim().length < 20
  const consentError = errors.consent && !form.consent

  // `auth.*` / gate keys only exist once supabase/auth.sql has been run; until
  // then the i18n helper echoes the key back, so fall back to a literal.
  const label = (key, uk, en) => {
    const value = s(key)
    return value === key ? (lang === 'uk' ? uk : en) : value
  }

  // Posting a comment requires a signed-in user (enforced by RLS in schema.sql);
  // gate the form so the UI matches. While the session is still resolving, hold
  // the space rather than flashing the gate and then the form.
  if (authEnabled && authLoading) {
    return <div className="container page page--narrow" aria-hidden="true" />
  }
  if (authEnabled && !user) {
    return (
      <div className="container page page--narrow">
        <h1 className="page__title">{s('newComment.title')}</h1>
        <p className="page__intro">
          {label('newComment.authRequired',
            'Щоб додати коментар, спершу увійдіть у свій акаунт.',
            'Please sign in to add a comment.')}
        </p>
        <button
          className="auth-btn auth-btn--google"
          type="button"
          disabled={signingIn}
          onClick={signInWithGoogle}
        >
          {signingIn ? <span className="auth-btn__spinner" aria-hidden="true" /> : <GoogleMark />}
          <span className="auth-btn__label">
            {signingIn
              ? label('auth.signingIn', 'Переадресація…', 'Redirecting…')
              : label('auth.googleSignIn', 'Увійти через Google', 'Sign in with Google')}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="container page page--narrow">
      <h1 className="page__title">{s('newComment.title')}</h1>
      <p className="page__intro">{s('newComment.intro')}</p>

      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="f-plate">{fields.plate.label}</label>
          <input
            id="f-plate"
            className={`field__input ${plateError ? 'has-error' : ''}`}
            value={form.plate}
            onChange={update('plate')}
            placeholder={fields.plate.placeholder}
            maxLength={MAX_PLATE_LENGTH}
            autoComplete="off"
          />
          <span className={`field__help ${plateError ? 'has-error' : ''}`}>{fields.plate.help}</span>
          {region && (
            <span className="field__region">
              {s('rankings.colRegion')}: <strong>{provinceName(region)}</strong>
            </span>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="f-category">{fields.category.label}</label>
          <select
            id="f-category"
            className="field__input"
            value={form.category}
            onChange={update('category')}
          >
            {Object.entries(categoryOptions).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="f-desc">{fields.description.label}</label>
          <textarea
            id="f-desc"
            className={`field__input field__input--area ${descError ? 'has-error' : ''}`}
            value={form.description}
            onChange={update('description')}
            placeholder={fields.description.placeholder}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={5}
          />
          <span className={`field__help ${descError ? 'has-error' : ''}`}>
            {fields.description.help}
            {descError ? ` (${form.description.trim().length}/20)` : ''}
          </span>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="f-photo">{fields.photo.label}</label>
          <input
            id="f-photo"
            className="field__input"
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          />
          <span className="field__help">{fields.photo.help}</span>
          {photoFile && (
            <img className="photo-preview" src={URL.createObjectURL(photoFile)} alt="" />
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="f-author">{fields.author.label}</label>
          <input
            id="f-author"
            className="field__input"
            value={form.author}
            onChange={update('author')}
            placeholder={fields.author.placeholder}
            maxLength={MAX_AUTHOR_LENGTH}
            autoComplete="off"
          />
        </div>

        <label className={`field-check ${consentError ? 'has-error' : ''}`}>
          <input type="checkbox" checked={form.consent} onChange={update('consent')} />
          <span>{s('newComment.consentText')}</span>
        </label>

        <button className="btn btn--primary btn--lg" type="submit" disabled={saving}>
          {s('newComment.submit')}
        </button>
        {submitError && <p className="form-error" role="alert">{s('newComment.submitFailed')}</p>}
      </form>
    </div>
  )
}
