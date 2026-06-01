import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, addDays } from 'date-fns'
import { Calendar, Users, ArrowLeftRight, Bell, ChevronRight, Star, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { Card, Skeleton, Badge } from '../../components/ui'
import { ShiftBadge, ShiftTimeChip } from '../../components/shifts'
import { formatDate, getDayLabel, formatTime } from '../../lib/helpers'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { profile } = useAuth()
  const { notifications, unreadCount } = useNotifications()
  const [todaySchedule, setTodaySchedule] = useState(null)
  const [upcomingSchedule, setUpcomingSchedule] = useState([])
  const [openLeaves, setOpenLeaves] = useState(0)
  const [pendingSwaps, setPendingSwaps] = useState(0)
  const [specialDays, setSpecialDays] = useState([])
  const [slots, setSlots] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadDashboard()
  }, [profile])

  const loadDashboard = async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const next7 = format(addDays(new Date(), 7), 'yyyy-MM-dd')

    // Load shift slots map
    const { data: slotData } = await supabase.from('shift_slots').select('*')
    const slotMap = {}
    slotData?.forEach((s) => { slotMap[s.id] = s })
    setSlots(slotMap)

    // Today's schedule
    const { data: todayData } = await supabase
      .from('schedule')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .eq('status', 'active')
      .maybeSingle()
    setTodaySchedule(todayData)

    // Upcoming 7 days
    const { data: upcoming } = await supabase
      .from('schedule')
      .select('*')
      .eq('user_id', profile.id)
      .gte('date', today)
      .lte('date', next7)
      .eq('status', 'active')
      .order('date')
      .limit(7)
    setUpcomingSchedule(upcoming || [])

    // Open leave requests count
    const { count: leaveCount } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
    setOpenLeaves(leaveCount || 0)

    // Pending swap requests (for this user)
    const { count: swapCount } = await supabase
      .from('swap_requests')
      .select('*', { count: 'exact', head: true })
      .eq('target_id', profile.id)
      .eq('status', 'pending')
    setPendingSwaps(swapCount || 0)

    // Upcoming special days
    const { data: sdData } = await supabase
      .from('special_days')
      .select('*')
      .gte('date', today)
      .lte('date', next7)
      .order('date')
      .limit(3)
    setSpecialDays(sdData || [])

    setLoading(false)
  }

  const todaySlot = todaySchedule ? slots[todaySchedule.slot_id] : null

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.name?.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Special day banner */}
      {specialDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 mb-5 text-white"
        >
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4" />
            <span className="text-sm font-semibold">Upcoming Special Day</span>
          </div>
          {specialDays.map((sd) => (
            <p key={sd.id} className="text-sm opacity-90">
              {sd.name} — {getDayLabel(sd.date)}
            </p>
          ))}
        </motion.div>
      )}

      {/* Today's shift */}
      <div className="mb-5">
        <h2 className="section-title mb-3">Today's Shift</h2>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : todaySchedule && todaySlot ? (
          <Card className="bg-gradient-to-br from-white to-amber-50 dark:from-slate-800 dark:to-slate-800 border-0 shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <ShiftBadge slot={todaySlot} size="md" />
                <div className="flex items-center gap-1.5 mt-2 text-slate-600 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {formatTime(todaySlot.start_time)} – {formatTime(todaySlot.end_time)}
                  </span>
                </div>
              </div>
              <div
                className="w-3 h-16 rounded-full opacity-60"
                style={{ backgroundColor: todaySlot.color }}
              />
            </div>
          </Card>
        ) : (
          <Card className="text-center py-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm">No shift assigned today</p>
            {openLeaves > 0 && (
              <Link to="/leaves" className="text-primary-600 dark:text-primary-400 text-sm font-medium mt-1 inline-block hover:underline">
                {openLeaves} open slot{openLeaves > 1 ? 's' : ''} available to claim →
              </Link>
            )}
          </Card>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Open Leave Slots', value: openLeaves, icon: Users, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', to: '/leaves' },
          { label: 'Swap Requests', value: pendingSwaps, icon: ArrowLeftRight, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', to: '/swaps' },
        ].map(({ label, value, icon: Icon, color, bg, to }) => (
          <Link key={label} to={to}>
            <Card hover className="h-full">
              <div className={`inline-flex items-center justify-center w-9 h-9 ${bg} rounded-xl mb-2`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Upcoming shifts */}
      {upcomingSchedule.length > 1 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Upcoming Shifts</h2>
            <Link to="/schedule" className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingSchedule.slice(1, 5).map((s) => {
              const slot = slots[s.slot_id]
              if (!slot) return null
              return (
                <Card key={s.id} className="flex items-center gap-3">
                  <div className="text-center min-w-[44px]">
                    <p className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(s.date), 'EEE')}</p>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{format(new Date(s.date), 'd')}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1">
                    <ShiftBadge slot={slot} size="sm" />
                    <ShiftTimeChip slot={slot} />
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent notifications */}
      {notifications.filter((n) => !n.is_read).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Recent Alerts</h2>
            <Link to="/notifications" className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {notifications.filter((n) => !n.is_read).slice(0, 3).map((n) => (
              <Card key={n.id} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.message}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
