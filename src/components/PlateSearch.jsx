import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { isValidPlate, normalizePlate } from '../data/useFeedData.js'

export default function PlateSearch({ compact = false, onSubmitSuccess }) {
  const { s } = useI18n()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const inputId = useId()

  const submit = (e) => {
    e.preventDefault()
    const plate = normalizePlate(value)
    if (!isValidPlate(plate)) {
      setInvalid(true)
      return
    }
    navigate(`/plate/${encodeURIComponent(plate)}`)
    setValue('')
    setInvalid(false)
    onSubmitSuccess?.()
  }

  return (
    <form
      className={`plate-search ${compact ? 'plate-search--compact' : ''}`}
      onSubmit={submit}
      role="search"
    >
      {!compact && (
        <label className="plate-search__label" htmlFor={inputId}>
          {s('home.searchLabel')}
        </label>
      )}
      <div className="plate-search__row">
        <input
          id={inputId}
          className={`plate-search__input ${invalid ? 'has-error' : ''}`}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setInvalid(false) }}
          placeholder={s('home.searchPlaceholder')}
          aria-label={s('home.searchLabel')}
          aria-invalid={invalid}
          autoComplete="off"
          spellCheck="false"
        />
        <button className="btn btn--primary plate-search__btn" type="submit">
          {s('home.searchButton')}
        </button>
      </div>
    </form>
  )
}
