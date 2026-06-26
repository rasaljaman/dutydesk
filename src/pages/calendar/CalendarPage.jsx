import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { ShiftBadge } from '../../components/ui/ShiftBadge'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { ShiftNoteInline } from '../../components/ui/ShiftNoteInline'
import { useSchedule } from '../../hooks/useSchedule'
import { useRealtime } from '../../hooks/useRealtime'
import { useAuth } from '../../context/AuthContext'
import { useBrand } from '../../context/BrandContext'
import { useShiftNotes } from '../../hooks/useShiftNotes'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

export default function CalendarPage() {
  const { brandId } = useParams()
  const { profile } = useAuth()
  const { brandSettings } = useBrand()
  const { fetchSchedule } = useSchedule()
  const { notes, getNotes } = useShiftNotes()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [schedule, setSchedule] = useState([])
  const [specialDays, setSpecialDays] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [dayDetail, setDayDetail] = useState([])
  const [loading, setLoading] = useState(true)

  const loadMonth = useCallback(async (month) => {
    setLoading(true)
    const start = format(startOfMonth(month), 'yyyy-MM-dd')
    const end = format(endOfMonth(month), 'yyyy-MM-dd')
    const [sched, special] = await Promise.all([
      fetchSchedule(start, end),
      brandSettings?.enable_special_days
        ? supabase.from('special_days').select('*').eq('brand_id', brandId).gte('date', start).lte('date', end)
        : Promise.resolve({ data: [] }),
    ])
    setSchedule(sched ?? [])
    setSpecialDays(special.data ?? [])
    setLoading(false)
  }, [brandId, brandSettings])

  useEffect(() => { loadMonth(currentMonth) }, [currentMonth])
  useRealtime({ onScheduleChange: () => loadMonth(currentMonth) })

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = startOfMonth(currentMonth).getDay()

  const getShiftsForDate = (date) => schedule.filter(s => s.date === format(date, 'yyyy-MM-dd'))
  const getSpecialDay = (date) => specialDays.find(s => s.date === format(date, 'yyyy-MM-dd'))
  const myShiftOnDate = (date) => schedule.find(s => s.date === format(date, 'yyyy-MM-dd') && s.user_id === profile?.id)

  const handleDaySelect = async (date) => {
    setSelectedDate(date)
    const dateStr = format(date, 'yyyy-MM-dd')
    
    // Fetch notes for this date
    getNotes(brandId, dateStr)

    const shifts = schedule.filter(s => s.date === dateStr)
    // Fetch profiles for day detail
    const userIds = [...new Set(shifts.map(s => s.user_id))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url, username').in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      setDayDetail(shifts.map(s => ({ ...s, profiles: profileMap[s.user_id] })))
    } else setDayDetail([])
  }

  return (
    <AppLayout title="Schedule">
      <div className="px-4 py-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-surface-container transition-colors">
            <ChevronLeft className="w-5 h-5 text-on-surface-variant" />
          </button>
          <h2 className="text-title-lg font-semibold text-on-surface">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-surface-container transition-colors">
            <ChevronRight className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-label-md font-semibold text-on-surface-variant py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const dayShifts = getShiftsForDate(day)
            const myShift = myShiftOnDate(day)
            const special = getSpecialDay(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDaySelect(day)}
                className={cn(
                  'relative flex flex-col items-center py-2 rounded-lg transition-all',
                  isSelected && 'bg-primary-500',
                  !isSelected && isToday(day) && 'bg-primary-50',
                  !isSelected && !isToday(day) && 'hover:bg-surface-container',
                )}
              >
                <span className={cn(
                  'text-body-md font-medium mb-1',
                  isSelected ? 'text-white' : isToday(day) ? 'text-primary-500 font-bold' : 'text-on-surface'
                )}>
                  {format(day, 'd')}
                </span>
                <div className="flex gap-0.5">
                  {myShift && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : (myShift.shift_slots?.color_hex || '#4F46E5') }} />}
                  {dayShifts.length > 0 && !myShift && <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                  {special && <div className="w-1.5 h-1.5 rounded-full bg-secondary-400" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 px-2">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary-500" /><span className="text-label-md text-on-surface-variant">My shift</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-300" /><span className="text-label-md text-on-surface-variant">Others</span></div>
          {brandSettings?.enable_special_days && <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-secondary-400" /><span className="text-label-md text-on-surface-variant">Special</span></div>}
        </div>
      </div>

      {/* Day detail sheet */}
      <BottomSheet isOpen={!!selectedDate} onClose={() => setSelectedDate(null)} title={selectedDate ? format(selectedDate, 'EEEE, MMMM d') : ''}>
        {selectedDate && (
          <>
            {getSpecialDay(selectedDate) && (
              <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-3 mb-4">
                <p className="text-body-md font-semibold text-secondary-600">🎉 {getSpecialDay(selectedDate).name}</p>
                {getSpecialDay(selectedDate).notes && <p className="text-body-md text-secondary-500 mt-1">{getSpecialDay(selectedDate).notes}</p>}
              </div>
            )}
            {dayDetail.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="w-8 h-8 text-outline mx-auto mb-2" />
                <p className="text-body-md text-on-surface-variant">No shifts scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayDetail.map(shift => {
                  const note = notes.find(n => n.slot_id === shift.slot_id)
                  return (
                    <div key={shift.id} className="p-3 rounded-lg bg-surface-container">
                      <div className="flex items-center gap-3">
                        <Avatar name={shift.profiles?.name} avatarUrl={shift.profiles?.avatar_url} size="md" />
                        <div className="flex-1">
                          <p className="text-body-lg font-medium text-on-surface">{shift.profiles?.name}</p>
                          <p className="text-body-md text-on-surface-variant">@{shift.profiles?.username}</p>
                        </div>
                        {shift.shift_slots && <ShiftBadge slot={shift.shift_slots} size="sm" />}
                      </div>
                      <ShiftNoteInline 
                        date={format(selectedDate, 'yyyy-MM-dd')} 
                        slotId={shift.slot_id} 
                        initialNote={note} 
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </BottomSheet>
    </AppLayout>
  )
}
