import { formatTime } from '../../lib/utils'

export function ShiftBadge({ slot, size = 'md' }) {
  if (!slot) return null
  const sizes = {
    sm: 'px-2 py-0.5 text-label-sm',
    md: 'px-3 py-1 text-label-md',
    lg: 'px-4 py-1.5 text-body-md',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium text-white ${sizes[size]}`}
      style={{ backgroundColor: slot.color_hex }}
    >
      <span>{slot.label}</span>
      <span className="opacity-80">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
    </span>
  )
}
