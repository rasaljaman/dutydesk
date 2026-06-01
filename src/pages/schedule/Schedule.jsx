import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ShiftBadge } from '../../components/shifts'
import { Skeleton } from '../../components/ui'
import { getCalendarGrid } from '../../lib/helpers'

export default function Schedule() {
  const { profile, isManager } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState([])
  const [slots, setSlots] = useState({})
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [currentDate])

  const loadData = async () => {
    setLoading(true)
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    const [slotRes, schedRes, userRes] = await Promise.all([
      supabase.from('shift_slots').select('*'),
      supabase.from('schedule').select('*').gte('date', start).lte('date', end).eq('status', 'active'),
      supabase.from('users').select('id, name, role').eq('is_active', true).order('name'),
    ])

    const slotMap = {}
    slotRes.data?.forEach((s) => { slotMap[s.id] = s })
    setSlots(slotMap)

    const filteredUsers = isManager
      ? userRes.data || []
      : (userRes.data || []).filter((u) => u.id === profile?.id)

    setUsers(filteredUsers)
    setSchedules(schedRes.data || [])
    setLoading(false)
  }

  const grid = getCalendarGrid(currentDate.getFullYear(), currentDate.getMonth())
  const today = format(new Date(), 'yyyy-MM-dd')

  const getSlotForUserDay = (userId, date) => {
    if (!date) return null
    const d = format(date, 'yyyy-MM-dd')
    const s = schedules.find((sc) => sc.user_id === userId && sc.date === d)
    return s ? slots[s.slot_id] : null
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Schedule</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <span className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            {format(currentDate, 'MMM yyyy')}
          </span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[640px]">
            {/* Header row: dates */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
              <div className="w-32 flex-shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">Staff</div>
              {grid.filter(Boolean).slice(0, 31).map((date) => (
                <div
                  key={format(date, 'd')}
                  className={`flex-1 min-w-[32px] text-center text-[10px] font-bold ${
                    format(date, 'yyyy-MM-dd') === today
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div>{format(date, 'EEE')[0]}</div>
                  <div>{format(date, 'd')}</div>
                </div>
              ))}
            </div>

            {/* Staff rows */}
            {users.map((user, idx) => (
              <div
                key={user.id}
                className={`flex items-center py-1.5 ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/30'} rounded-lg`}
              >
                <div className="w-32 flex-shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300 pr-2 truncate">
                  {user.id === profile?.id ? `${user.name} (me)` : user.name}
                </div>
                {grid.filter(Boolean).slice(0, 31).map((date) => {
                  const slot = getSlotForUserDay(user.id, date)
                  return (
                    <div key={format(date, 'd')} className="flex-1 min-w-[32px] flex items-center justify-center py-0.5">
                      {slot ? (
                        <div
                          className="w-5 h-5 rounded-md flex-shrink-0"
                          title={slot.label}
                          style={{ backgroundColor: slot.color + '30', border: `1.5px solid ${slot.color}` }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-md bg-transparent" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slot legend */}
      <div className="mt-5 glass-card p-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Shift Slots</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(slots).map((slot) => (
            <ShiftBadge key={slot.id} slot={slot} size="sm" />
          ))}
        </div>
      </div>
    </div>
  )
}
