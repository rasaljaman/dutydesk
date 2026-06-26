import { useEffect } from 'react'
import { Users, Clock } from 'lucide-react'
import { Avatar } from './Avatar'
import { LoadingSkeleton } from './LoadingSkeleton'
import { useWhoIsWorking } from '../../hooks/useWhoIsWorking'

export function WhoIsWorkingCard({ brandId }) {
  const { workingNow, loading, getWorkingNow } = useWhoIsWorking()

  useEffect(() => {
    if (brandId) getWorkingNow(brandId)
    // Optional: set interval to refresh every minute
    const interval = setInterval(() => {
      if (brandId) getWorkingNow(brandId)
    }, 60000)
    return () => clearInterval(interval)
  }, [brandId, getWorkingNow])

  if (loading && workingNow.length === 0) {
    return (
      <div className="card">
        <h3 className="text-title-lg text-on-surface mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Working Now
        </h3>
        <LoadingSkeleton rows={2} />
      </div>
    )
  }

  if (workingNow.length === 0) {
    return null // Don't show if nobody is working right now
  }

  return (
    <div className="card bg-gradient-to-br from-surface to-surface-container border border-green-500/20 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Clock className="w-24 h-24" />
      </div>
      <h3 className="text-title-lg text-on-surface mb-3 flex items-center gap-2 relative z-10">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        Working Now
      </h3>
      <div className="flex flex-wrap gap-2 relative z-10">
        {workingNow.map(shift => (
          <div key={shift.id} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-full border border-outline-variant/50 shadow-sm">
            <Avatar name={shift.profiles?.name} avatarUrl={shift.profiles?.avatar_url} size="xs" />
            <span className="text-label-md font-medium text-on-surface pr-1">{shift.profiles?.name?.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
