import { format, isToday, isTomorrow, isThisWeek, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, subDays } from 'date-fns'

// ── Date Utilities ──────────────────────────────────────────

export const formatDate = (date, fmt = 'MMM d, yyyy') => {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export const formatTimeRange = (start, end) => `${formatTime(start)} – ${formatTime(end)}`

export const getDayLabel = (date) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isThisWeek(d)) return format(d, 'EEEE')
  return format(d, 'EEE, MMM d')
}

export const getMonthDays = (year, month) => {
  const start = startOfMonth(new Date(year, month))
  const end = endOfMonth(new Date(year, month))
  return eachDayOfInterval({ start, end })
}

export const getCalendarGrid = (year, month) => {
  const days = getMonthDays(year, month)
  const firstDay = getDay(days[0]) // 0=Sun
  const grid = Array(firstDay).fill(null).concat(days)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

// ── Role Utilities ──────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PERMANENT: 'permanent',
  TEMP: 'temp',
}

export const ROLE_LABELS = {
  admin: 'Super Admin',
  manager: 'Manager',
  permanent: 'Permanent Staff',
  temp: 'Temporary Staff',
}

export const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  permanent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  temp: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export const isManagerOrAdmin = (role) => ['admin', 'manager'].includes(role)
export const isAdmin = (role) => role === 'admin'

// ── Status Utilities ────────────────────────────────────────

export const STATUS_COLORS = {
  // Leave request
  open: 'bg-green-100 text-green-700',
  filled: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
  // Leave claims
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  // Swap
  removed: 'bg-gray-100 text-gray-500',
  // Schedule
  active: 'bg-green-100 text-green-700',
}

// ── Color Utilities ─────────────────────────────────────────

export const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ── String Utilities ────────────────────────────────────────

export const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const truncate = (str, n = 50) =>
  str && str.length > n ? str.slice(0, n - 1) + '…' : str

// ── Countdown Timer ─────────────────────────────────────────

export const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
