import { formatTime } from '../../lib/helpers'

// ShiftBadge — colored pill showing shift slot
export function ShiftBadge({ slot, size = 'sm' }) {
  if (!slot) return null

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  }

  return (
    <span
      className={`shift-badge ${sizes[size]} font-semibold`}
      style={{
        backgroundColor: slot.color + '20',
        color: slot.color,
        borderColor: slot.color + '40',
        border: '1px solid',
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: slot.color }}
      />
      {slot.label}
    </span>
  )
}

// ShiftTimeChip — shows slot time range
export function ShiftTimeChip({ slot }) {
  if (!slot) return null
  return (
    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
    </span>
  )
}

// ShiftCard — full card showing a schedule entry
export function ShiftCard({ schedule, slot, user, showUser = false, children }) {
  if (!schedule || !slot) return null

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border transition-all"
      style={{
        backgroundColor: slot.color + '10',
        borderColor: slot.color + '30',
      }}
    >
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
        style={{ backgroundColor: slot.color }}
      />
      <div className="flex-1 min-w-0">
        {showUser && user && (
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {user.name}
          </p>
        )}
        <ShiftBadge slot={slot} size="sm" />
        <div className="mt-1">
          <ShiftTimeChip slot={slot} />
        </div>
        {children}
      </div>
    </div>
  )
}
