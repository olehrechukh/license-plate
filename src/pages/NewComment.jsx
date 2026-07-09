import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { useFeed } from '../data/FeedContext.jsx'
import { useFeedData, normalizePlate } from '../data/useFeedData.js'
import { provinceForPlateCode } from '../data/plateRegions.js'

const MAX_PLATE_LENGTH = 8
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_AUTHOR_LENGTH = 50

export default function NewComment() {
  const { s, strings } = useI18n()
  const navigate = useNavigate()
  const { addComment } = useFeed()
  const { provinceName } = useFeedData()
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

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const validate = () => {
    const next = {}
    if (!normalizePlate(form.plate)) next.plate = true
    if (form.description.trim().length < 20) next.description = true
    if (!form.consent) next.consent = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    // Persists to Supabase when configured; otherwise updates local state only.
    await addComment({
      plate: form.plate,
      category: form.category,
      description: form.description.trim(),
      author: form.author.trim(),
      photoFile
    })
    setSaving(false)
    navigate(`/plate/${form.plate}`)
  }

  // Live validity — an error only shows while the field is actually invalid, so
  // the red state clears as soon as the condition is met (no wait for resubmit).
  const plateError = errors.plate && !normalizePlate(form.plate)
  const descError = errors.description && form.description.trim().length < 20
  const consentError = errors.consent && !form.consent

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
          {provinceForPlateCode(form.plate) && (
            <span className="field__region">
              {s('rankings.colRegion')}: <strong>{provinceName(provinceForPlateCode(form.plate))}</strong>
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
      </form>
    </div>
  )
}
