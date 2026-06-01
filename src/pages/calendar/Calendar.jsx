import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getCalendarGrid } from '../../lib/helpers'
import { ShiftBadge } from '../../components/shifts'
import { Card, Modal, Skeleton } from '../../components/ui'
import { formatTime } from '../../lib/helpers'

export default function CalendarPage() {
  const { profile } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState([])
  const [slots, setSlots] = useState({})
  const [users, setUsers] = useState({})
  const [specialDays, setSpecialDays] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [currentDate])

  const loadData = async () => {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [slotRes, schedRes, sdRes, lrRes, userRes] = await Promise.all([
      supabase.from('shift_slots').select('*'),
      supabase.from('schedule').select('*').gte('date', start).lte('date', end).eq('status', 'active'),
      supabase.from('special_days').select('*').gte('date', start).lte('date', end),
      supabase.from('leave_requests').select('*').gte('date', start).lte('date', end).eq('status', 'open'),
      supabase.from('users').select('id, name').eq('is_active', true),
    ])

    const slotMap = {}
    slotRes.data?.forEach((s) => { slotMap[s.id] = s })
    setSlots(slotMap)

    const userMap = {}
    userRes.data?.forEach((u) => { userMap[u.id] = u })
    setUsers(userMap)

    setSchedules(schedRes.data || [])
    setSpecialDays(sdRes.data || [])
    setLeaveRequests(lrRes.data || [])
    setLoading(false)
  }

  const grid = getCalendarGrid(currentDate.getFullYear(), currentDate.getMonth())
  const today = format(new Date(), 'yyyy-MM-dd')

  const getSchedulesForDay = (date) => {
    if (!date) return []
    const d = format(date, 'yyyy-MM-dd')
    return schedules.filter((s) => s.date === d)
  }

  const getSpecialDay = (date) => {
    if (!date) return null
    const d = format(date, 'yyyy-MM-dd')
    return specialDays.find((sd) => sd.date === d)
  }

  const hasLeaveOnDay = (date) => {
    if (!date) return false
    const d = format(date, 'yyyy-MM-dd')
    return leaveRequests.some((lr) => lr.date === d)
  }

  const getMyScheduleForDay = (date) => {
    if (!date || !profile) return null
    const d = format(date, 'yyyy-MM-dd')
    return schedules.find((s) => s.date === d && s.user_id === profile.id)
  }

  const selectedDaySchedules = selectedDay ? getSchedulesForDay(selectedDay) : []
  const selectedSpecialDay = selectedDay ? getSpecialDay(selectedDay) : null

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
          {format(currentDate, 'MMM yyyy')}
          <span className="hidden sm:inline">{format(currentDate, ' — MMMM').slice(4)}</span>
        </h1>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {[
          { short: 'S', long: 'Sun' },
          { short: 'M', long: 'Mon' },
          { short: 'T', long: 'Tue' },
          { short: 'W', long: 'Wed' },
          { short: 'T', long: 'Thu' },
          { short: 'F', long: 'Fri' },
          { short: 'S', long: 'Sat' },
        ].map((d, i) => (
          <div key={i} className="text-center py-2">
            <span className="sm:hidden text-[11px] font-bold text-slate-400 dark:text-slate-500">{d.short}</span>
            <span className="hidden sm:block text-xs font-semibold text-slate-400 dark:text-slate-500">{d.long}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {grid.map((date, i) => {
            if (!date) return <div key={i} className="aspect-[3/4]" />

            const dateStr = format(date, 'yyyy-MM-dd')
            const isToday = dateStr === today
            const mySchedule = getMyScheduleForDay(date)
            const mySlot = mySchedule ? slots[mySchedule.slot_id] : null
            const sd = getSpecialDay(date)
            const hasLeave = hasLeaveOnDay(date)
            const daySchedules = getSchedulesForDay(date)

            return (
              <motion.button
                key={dateStr}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDay(date)}
                className={`relative aspect-[3/4] min-h-[52px] sm:min-h-[72px] p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-left transition-all w-full ${
                  isToday
                    ? 'bg-primary-50 dark:bg-primary-900/30 ring-1 sm:ring-2 ring-primary-500'
                    : sd
                    ? 'bg-amber-50 dark:bg-amber-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {/* Date number */}
                <div className={`text-[11px] sm:text-xs font-bold ${
                  isToday
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {format(date, 'd')}
                </div>

                {/* Special day star */}
                {sd && (
                  <div className="mt-0.5">
                    <Star className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-amber-500" />
                  </div>
                )}

                {/* My shift color bar */}
                {mySlot && (
                  <div
                    className="absolute bottom-1 left-1 right-1 h-1 sm:h-1.5 rounded-full"
                    style={{ backgroundColor: mySlot.color }}
                  />
                )}

                {/* Staff count — sm only */}
                {daySchedules.length > 0 && (
                  <div className="hidden sm:block text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {daySchedules.length}
                  </div>
                )}

                {/* Leave indicator dot */}
                {hasLeave && (
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full" />
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary-500" />
          <span>My shift</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span>Special day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span>Open leave slot</span>
        </div>
      </div>

      {/* Day detail modal */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? format(selectedDay, 'EEEE, MMMM d') : ''}
        size="md"
      >
        {selectedSpecialDay && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 mb-4">
            <Star className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{selectedSpecialDay.name}</p>
              {selectedSpecialDay.notes && <p className="text-xs text-amber-600 dark:text-amber-400">{selectedSpecialDay.notes}</p>}
            </div>
          </div>
        )}

        {selectedDaySchedules.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No shifts scheduled</p>
        ) : (
          <div className="space-y-2">
            {selectedDaySchedules.map((s) => {
              const slot = slots[s.slot_id]
              const user = users[s.user_id]
              if (!slot) return null
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: slot.color + '30', backgroundColor: slot.color + '08' }}>
                  <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: slot.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{slot.label} · {formatTime(slot.start_time)}–{formatTime(slot.end_time)}</p>
                  </div>
                  <ShiftBadge slot={slot} size="sm" />
                </div>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}
