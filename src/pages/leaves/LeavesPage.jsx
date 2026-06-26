import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ArrowLeftRight, Plus, X, Check } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useLeaves } from '../../hooks/useLeaves'
import { useSchedule } from '../../hooks/useSchedule'
import { useRealtime } from '../../hooks/useRealtime'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'
import { OpenShiftsView } from './OpenShiftsView'
import toast from 'react-hot-toast'

const leaveTabs = ['Open', 'Mine', 'Filled']

export default function LeavesPage() {
  const { user } = useAuth()
  const { isManager, brandSettings } = useBrand()
  const { leaves, loading, fetchLeaves, requestLeave, cancelLeave, claimLeave, acceptClaim } = useLeaves()
  const { getUserShiftOnDate } = useSchedule()
  
  const [mainTab, setMainTab] = useState('Leaves') // 'Leaves' | 'Open Shifts'
  const [activeTab, setActiveTab] = useState('Open')
  const [showRequest, setShowRequest] = useState(false)
  const [requestDate, setRequestDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [requestReason, setRequestReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchLeaves() }, [])
  useRealtime({ onLeaveChange: fetchLeaves })

  const filteredLeaves = leaves.filter(l => {
    if (activeTab === 'Open') return l.status === 'open'
    if (activeTab === 'Mine') return l.requester_id === user?.id
    if (activeTab === 'Filled') return l.status === 'filled'
    return true
  })

  const handleRequest = async () => {
    setSubmitting(true)
    try {
      const shift = await getUserShiftOnDate(user.id, requestDate)
      if (!shift) { toast.error('You need an active shift on this date to request leave'); setSubmitting(false); return }
      await requestLeave({ date: requestDate, reason: requestReason })
      toast.success('Leave request submitted!')
      setShowRequest(false)
      setRequestReason('')
      fetchLeaves()
    } catch (err) { toast.error(err.message) }
    setSubmitting(false)
  }

  const handleClaim = async (leaveId) => {
    try {
      await claimLeave(leaveId)
      toast.success('Claim submitted!')
      fetchLeaves()
    } catch (err) { toast.error(err.message) }
  }

  const handleAccept = async (claimId) => {
    try {
      await acceptClaim(claimId)
      toast.success('Claim accepted!')
      fetchLeaves()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <AppLayout 
      title={mainTab === 'Leaves' ? "Leave Requests" : "Open Shifts"}
      rightAction={
        mainTab === 'Leaves' ? (
          <button onClick={() => setShowRequest(true)} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        ) : null
      }
    >
      {/* Top Level Tabs */}
      <div className="px-4 pt-2">
        <div className="flex bg-surface-container rounded-lg p-1">
          <button 
            onClick={() => setMainTab('Leaves')} 
            className={`flex-1 py-1.5 rounded-md text-label-md font-semibold transition-all ${mainTab === 'Leaves' ? 'bg-primary-500 text-white' : 'text-on-surface-variant'}`}
          >
            Leave Requests
          </button>
          {brandSettings?.enable_open_shifts && (
            <button 
              onClick={() => setMainTab('Open Shifts')} 
              className={`flex-1 py-1.5 rounded-md text-label-md font-semibold transition-all ${mainTab === 'Open Shifts' ? 'bg-primary-500 text-white' : 'text-on-surface-variant'}`}
            >
              Open Shifts
            </button>
          )}
        </div>
      </div>

      {mainTab === 'Leaves' ? (
        <>
          {!brandSettings?.enable_leave_requests ? (
             <div className="pt-6">
                <EmptyState icon={ArrowLeftRight} title="Leave requests disabled" description="The manager has disabled leave requests for this brand." />
             </div>
          ) : (
            <>
              {/* Internal Leave Tabs */}
              <div className="flex gap-1 px-4 pt-4 pb-2">
                {leaveTabs.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-body-md font-semibold transition-all ${activeTab === tab ? 'bg-surface-high text-primary-600 border border-primary-200' : 'bg-surface-container text-on-surface-variant'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="px-4 pb-4 space-y-3">
                {loading ? <LoadingSkeleton rows={3} /> : filteredLeaves.length === 0 ? (
                  <EmptyState icon={ArrowLeftRight} title="No requests" description="No leave requests in this category" />
                ) : filteredLeaves.map(leave => (
                  <div key={leave.id} className="card">
                    <div className="flex items-start gap-3">
                      <Avatar name={leave.profiles?.name} avatarUrl={leave.profiles?.avatar_url} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-body-lg font-semibold text-on-surface">{leave.profiles?.name}</h4>
                          <span className={`chip ${leave.status === 'open' ? 'chip-pending' : leave.status === 'filled' ? 'chip-filled' : 'chip-rejected'}`}>{leave.status}</span>
                        </div>
                        <p className="text-body-md text-on-surface-variant">{format(new Date(leave.date), 'EEEE, MMMM d')}</p>
                        {leave.reason && <p className="text-body-md text-on-surface mt-1 italic">"{leave.reason}"</p>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      {leave.status === 'open' && leave.requester_id === user?.id && (
                        <button onClick={() => cancelLeave(leave.id).then(fetchLeaves)} className="btn-secondary py-2 px-4 text-body-md flex-1">
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      )}
                      {leave.status === 'open' && leave.requester_id !== user?.id && (
                        <button onClick={() => handleClaim(leave.id)} className="btn-primary py-2 px-4 text-body-md flex-1">
                          <Check className="w-4 h-4" /> Cover
                        </button>
                      )}
                    </div>

                    {/* Claims */}
                    {(leave.requester_id === user?.id || isManager) && leave.leave_claims?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-outline-variant space-y-2">
                        <p className="text-label-md text-on-surface-variant font-semibold">CLAIMS ({leave.leave_claims.length})</p>
                        {leave.leave_claims.map(claim => (
                          <div key={claim.id} className="flex items-center gap-2">
                            <Avatar name={claim.profiles?.name} avatarUrl={claim.profiles?.avatar_url} size="sm" />
                            <span className="text-body-md text-on-surface flex-1">{claim.profiles?.name}</span>
                            <span className={`chip ${claim.status === 'pending' ? 'chip-pending' : claim.status === 'accepted' ? 'chip-active' : 'chip-rejected'}`}>{claim.status}</span>
                            {claim.status === 'pending' && leave.requester_id === user?.id && (
                              <button onClick={() => handleAccept(claim.id)} className="btn-primary py-1 px-3 text-label-md">Accept</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Request Leave Sheet */}
              <BottomSheet isOpen={showRequest} onClose={() => setShowRequest(false)} title="Request Leave">
                <div className="space-y-4">
                  <div>
                    <label className="block text-label-md font-medium text-on-surface mb-2">Date</label>
                    <input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="input-base" min={format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                  <div>
                    <label className="block text-label-md font-medium text-on-surface mb-2">Reason (optional)</label>
                    <textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} placeholder="Why do you need this day off?" rows={3} className="input-base resize-none" />
                  </div>
                  <button onClick={handleRequest} disabled={submitting} className="btn-primary w-full py-3">
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </BottomSheet>
            </>
          )}
        </>
      ) : (
        <OpenShiftsView />
      )}
    </AppLayout>
  )
}
