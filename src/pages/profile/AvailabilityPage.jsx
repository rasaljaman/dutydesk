import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CalendarX, Trash2 } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useAvailability } from '../../hooks/useAvailability'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AvailabilityPage() {
  const { user } = useAuth()
  const { currentBrand, brandSettings } = useBrand()
  const { availabilities, loading, getAvailability, addAvailability, removeAvailability } = useAvailability()

  const [dateType, setDateType] = useState('recurring') // 'recurring', 'specific_date', 'date_range'
  const [selectedDay, setSelectedDay] = useState(0)
  const [specificDate, setSpecificDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (currentBrand && user) {
      getAvailability(currentBrand.id, user.id)
    }
  }, [currentBrand?.id, user?.id])

  if (!brandSettings?.enable_availability) {
    return (
      <AppLayout title="Availability">
        <EmptyState icon={CalendarX} title="Availability disabled" description="Your manager has disabled availability tracking." />
      </AppLayout>
    )
  }

  const handleAdd = async () => {
    setSubmitting(true)
    const data = {
      brand_id: currentBrand.id,
      user_id: user.id,
      type: dateType,
      reason: reason || null
    }

    if (dateType === 'recurring') {
      data.day_of_week = selectedDay
    } else if (dateType === 'specific_date') {
      data.specific_date = specificDate
    } else if (dateType === 'date_range') {
      if (startDate > endDate) {
        toast.error('End date must be after start date')
        setSubmitting(false)
        return
      }
      data.start_date = startDate
      data.end_date = endDate
    }

    await addAvailability(data)
    setReason('')
    setSubmitting(false)
  }

  return (
    <AppLayout title="My Availability">
      <div className="px-4 py-4 space-y-6">
        <p className="text-body-md text-on-surface-variant">Let your manager know when you can't work.</p>

        <div className="card space-y-4">
          <div className="flex gap-2 p-1 bg-surface-container rounded-lg overflow-x-auto">
            {['recurring', 'specific_date', 'date_range'].map(type => (
              <button key={type} onClick={() => setDateType(type)}
                className={`flex-1 py-1.5 px-3 rounded-md text-label-md font-semibold whitespace-nowrap transition-colors ${dateType === type ? 'bg-primary-500 text-white' : 'text-on-surface-variant'}`}>
                {type === 'recurring' ? 'Weekly' : type === 'specific_date' ? 'Specific Day' : 'Date Range'}
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            {dateType === 'recurring' && (
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-2">Day of the Week</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <button key={day} onClick={() => setSelectedDay(idx)}
                      className={`py-2 px-4 rounded-full text-label-md font-semibold border transition-colors ${selectedDay === idx ? 'bg-primary-50 border-primary-500 text-primary-600' : 'border-outline text-on-surface-variant'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dateType === 'specific_date' && (
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-2">Date</label>
                <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)} className="input-base" min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
            )}

            {dateType === 'date_range' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-2">Start</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-base" min={format(new Date(), 'yyyy-MM-dd')} />
                </div>
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-2">End</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-base" min={startDate} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Reason (Optional)</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="E.g., University classes" className="input-base" />
            </div>

            <button onClick={handleAdd} disabled={submitting} className="btn-primary w-full py-2">
              {submitting ? 'Saving...' : 'Add Unavailability'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-title-md font-semibold text-on-surface">Your Records</h3>
          {loading ? <LoadingSkeleton rows={2} /> : availabilities.length === 0 ? (
            <EmptyState icon={CalendarX} title="No records" description="You haven't marked any days as unavailable." />
          ) : availabilities.map(record => (
            <div key={record.id} className="card flex items-center justify-between">
              <div>
                <p className="text-body-lg font-semibold text-on-surface">
                  {record.type === 'recurring' ? `Every ${DAYS_OF_WEEK[record.day_of_week]}` : 
                   record.type === 'specific_date' ? format(new Date(record.specific_date), 'MMM d, yyyy') :
                   `${format(new Date(record.start_date), 'MMM d')} - ${format(new Date(record.end_date), 'MMM d, yyyy')}`}
                </p>
                {record.reason && <p className="text-body-md text-on-surface-variant italic">{record.reason}</p>}
                <span className="text-label-sm text-primary-600 mt-1 block uppercase">
                  {record.type === 'recurring' ? 'Recurring' : record.type === 'specific_date' ? 'Specific Day' : 'Date Range'}
                </span>
              </div>
              <button onClick={() => removeAvailability(record.id)} className="p-2 text-error-500 hover:bg-error-50 rounded-lg transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
