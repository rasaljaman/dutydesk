import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BarChart3, Clock, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns'
import { useAnalytics } from '../../hooks/useAnalytics'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { Avatar } from '../../components/ui/Avatar'

export default function AnalyticsPage() {
  const { brandId } = useParams()
  const navigate = useNavigate()
  
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekStart = format(currentWeek, 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  
  const { metrics, loading, fetchAnalytics } = useAnalytics(brandId)

  useEffect(() => {
    fetchAnalytics(weekStart, weekEnd)
  }, [fetchAnalytics, weekStart, weekEnd])

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-on-surface-variant">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Analytics</h1>
          <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-500" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="p-2 rounded-lg hover:bg-surface-container"><ChevronLeft className="w-5 h-5 text-on-surface-variant" /></button>
          <div className="text-center">
            <h2 className="text-title-md font-semibold text-on-surface">{format(currentWeek, 'MMM d')} – {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}</h2>
          </div>
          <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="p-2 rounded-lg hover:bg-surface-container"><ChevronRight className="w-5 h-5 text-on-surface-variant" /></button>
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : (
          <>
            {/* Top Stat */}
            <div className="card bg-primary-500 text-white p-5 border-none relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-primary-100 text-label-md font-medium flex items-center gap-1.5 mb-1">
                  <Clock className="w-4 h-4" /> Total Hours Scheduled
                </p>
                <h3 className="text-display-sm font-bold">{metrics.totalHours}<span className="text-title-lg font-medium text-primary-100 ml-1">hrs</span></h3>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                <BarChart3 className="w-32 h-32" />
              </div>
            </div>

            {/* Shift Type Distribution */}
            <div className="card">
              <h3 className="text-title-lg text-on-surface mb-3 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-outline" /> Shift Types
              </h3>
              
              {metrics.shiftTypeDistribution.length === 0 ? (
                <p className="text-body-md text-on-surface-variant text-center py-4">No shifts scheduled</p>
              ) : (
                <div className="space-y-3">
                  {metrics.shiftTypeDistribution.map((type, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0" style={{ backgroundColor: type.color }}>
                        {type.count}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-md font-semibold text-on-surface truncate">{type.label}</p>
                        <div className="w-full h-1.5 bg-surface-container rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${(type.count / Math.max(...metrics.shiftTypeDistribution.map(d => d.count))) * 100}%`,
                              backgroundColor: type.color 
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shifts per Staff */}
            <div className="card">
              <h3 className="text-title-lg text-on-surface mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-outline" /> Staff Hours
              </h3>
              
              {metrics.shiftsPerStaff.length === 0 ? (
                <p className="text-body-md text-on-surface-variant text-center py-4">No staff scheduled</p>
              ) : (
                <div className="divide-y divide-outline-variant">
                  {metrics.shiftsPerStaff.map((staff, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={staff.name} avatarUrl={staff.avatar} size="sm" />
                        <div>
                          <p className="text-body-md font-medium text-on-surface">{staff.name}</p>
                          <p className="text-label-sm text-on-surface-variant">{staff.count} shift{staff.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-body-lg font-semibold text-on-surface">{Math.round(staff.hours * 10) / 10}</p>
                        <p className="text-label-sm text-on-surface-variant">hours</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
