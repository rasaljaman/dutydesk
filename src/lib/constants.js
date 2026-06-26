export const APP_NAME = 'DutyDesk'

export const ROLES = {
  MANAGER: 'manager',
  PERMANENT: 'permanent',
  TEMP: 'temp',
}

export const NOTIFICATION_TYPES = {
  LEAVE: 'leave',
  SWAP: 'swap',
  SHIFT_CHANGE: 'shift_change',
  INVITE: 'invite',
  SYSTEM: 'system',
}

export const INVITE_TYPES = {
  PERMANENT: 'permanent',
  TIMED: 'timed',
  ONE_TIME: 'one_time',
}

export const SCHEDULE_TYPES = {
  NORMAL: 'normal',
  SPECIAL: 'special',
  LEAVE_COVER: 'leave_cover',
  SWAP: 'swap',
}

export const SWAP_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  AUTO_CANCELLED: 'auto_cancelled',
  REMOVED: 'removed_by_manager',
}

export const LEAVE_STATUS = {
  OPEN: 'open',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
}

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
