import { useFeedData } from '../data/useFeedData.js'

const ICONS = {
  'dangerous-driving': '⚠️',
  'illegal-parking': '🅿️',
  'sidewalk-blocking': '🚷',
  'lane-misuse': '↔️',
  'aggression': '😡',
  'other': '•'
}

export default function CategoryBadge({ category }) {
  const { categoryLabel } = useFeedData()
  return (
    <span className={`badge badge--${category}`}>
      <span className="badge__icon" aria-hidden="true">{ICONS[category] || '•'}</span>
      {categoryLabel(category)}
    </span>
  )
}
