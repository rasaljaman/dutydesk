import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, isFuture } from 'date-fns'
import { Calendar, Check } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { Avatar } from '../../components/ui/Avatar'
import { ShiftBadge } from '../../components/ui/ShiftBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useSchedule } from '../../hooks/useSchedule'
import { useAuth } from '../../context/AuthContext'
import { useBrand } from '../../context/BrandContext'
import { useShiftConfirmations } from '../../hooks/useShiftConfirmations'

export default function SchedulePage() {
  const { brandId } = useParams()
  const { profile } = useAuth()
  const { currentBrand, brandSettings } = useBrand()
  const { fetchUserSchedule } = useSchedule()
  const { confirmations, getConfirmations, confirmShift } = useShiftConfirmations()

  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const [data] = await Promise.all([
      fetchUserSchedule(profile?.id, start, end),
      getConfirmations(brandId)
    ])
    setSchedule(data ?? [])
    setLoading(false)
  }, [profile?.id, brandId])

  useEffect(() => {
    if (profile?.id && brandId) load()
  }, [profile?.id, brandId, load])

  return (
    <AppLayout title="My Schedule">
      <div className="px-4 py-4 space-y-3">
        <p className="text-body-md text-on-surface-variant">{format(new Date(), 'MMMM yyyy')}</p>
        {loading ? <LoadingSkeleton rows={5} /> : schedule.length === 0 ? (
          <EmptyState icon={Calendar} title="No shifts this month" description="You have no shifts scheduled for this month." />
        ) : schedule.map(shift => {
          const isConfirmed = confirmations.some(c => c.schedule_id === shift.id)
          const shiftDate = new Date(shift.date)
          const canConfirm = brandSettings?.enable_shift_confirmations && isFuture(shiftDate) && !isConfirmed

          return (
            <div key={shift.id} className={`card flex items-center gap-3 ${shift.type !== 'normal' ? 'border-secondary-200 bg-secondary-50/30' : ''}`}>
              <div className="text-center w-12">
                <p className="text-label-md text-on-surface-variant">{format(shiftDate, 'EEE')}</p>
                <p className="text-headline-md font-bold text-on-surface">{format(shiftDate, 'd')}</p>
              </div>
              <div className="w-px h-10 bg-outline-variant" />
              <div className="flex-1">
                {shift.shift_slots ? <ShiftBadge slot={shift.shift_slots} size="md" /> : <span className="text-body-md text-on-surface-variant">No slot assigned</span>}
                {shift.type !== 'normal' && <p className="text-label-md text-secondary-500 mt-1 capitalize">{shift.type.replace('_', ' ')}</p>}
              </div>
              
              {brandSettings?.enable_shift_confirmations && (
                <div className="ml-2">
                  {isConfirmed ? (
                    <span className="flex items-center gap-1 text-primary-600 text-label-md font-medium">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : canConfirm ? (
                    <button 
                      onClick={() => confirmShift(brandId, shift.id, profile.id)}
                      className="bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg text-label-md font-semibold hover:bg-primary-100 transition-colors"
                    >
                      Confirm
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
