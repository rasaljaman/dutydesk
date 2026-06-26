import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Plus, Check, CalendarPlus } from 'lucide-react'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Avatar } from '../../components/ui/Avatar'
import { ShiftBadge } from '../../components/ui/ShiftBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useOpenShifts } from '../../hooks/useOpenShifts'
import { useSchedule } from '../../hooks/useSchedule'
import { useRealtime } from '../../hooks/useRealtime'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export function OpenShiftsView() {
  const { user } = useAuth()
  const { currentBrand, isManager, brandSettings } = useBrand()
  const { openShifts, loading, getOpenShifts, createOpenShift, claimOpenShift, cancelOpenShift } = useOpenShifts()
  const { getUserShiftOnDate } = useSchedule()
  
  const [activeTab, setActiveTab] = useState('Available') // Available, History (Manager only)
  const [showPost, setShowPost] = useState(false)
  const [postDate, setPostDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [postSlotId, setPostSlotId] = useState('')
  const [postTitle, setPostTitle] = useState('')
  const [postNotes, setPostNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Realtime slots for the dropdown
  const [slots, setSlots] = useState([])
  useRealtime({ 
    onOpenShiftChange: () => getOpenShifts(currentBrand.id) 
  })

  useEffect(() => {
    if (currentBrand) {
      getOpenShifts(currentBrand.id)
      // fetch slots for the dropdown
      supabase.from('shift_slots').select('*').eq('brand_id', currentBrand.id).then(({ data }) => setSlots(data || []))
    }
  }, [currentBrand?.id])

  const filteredShifts = openShifts.filter(s => {
    if (activeTab === 'Available') return s.status === 'open'
    if (activeTab === 'History') return s.status !== 'open'
    return true
  })

  const handlePost = async () => {
    if (!postDate || !postSlotId || !postTitle) return
    setSubmitting(true)
    const success = await createOpenShift({
      brand_id: currentBrand.id,
      created_by: user.id,
      date: postDate,
      slot_id: postSlotId,
      title: postTitle,
      notes: postNotes,
      status: 'open'
    })
    if (success) {
      setShowPost(false)
      setPostTitle('')
      setPostNotes('')
      // push-notification logic for new open shift would be sent to all free staff
      // Since edge function is not hooked for create, we could trigger a general notification here.
      const { data: members } = await supabase.from('brand_members').select('user_id').eq('brand_id', currentBrand.id).eq('is_active', true)
      if (members) {
        const notifs = members.map(m => ({
          brand_id: currentBrand.id,
          user_id: m.user_id,
          title: 'New Open Shift',
          message: `${postTitle} on ${postDate}`,
          type: 'system'
        }))
        await supabase.from('notifications').insert(notifs)
      }
    }
    setSubmitting(false)
  }

  const handleClaim = async (shift) => {
    // 1. check if user has shift that day
    const existing = await getUserShiftOnDate(user.id, shift.date)
    if (existing) {
      alert("You already have a shift scheduled for this day!")
      return
    }
    await claimOpenShift(shift.id, currentBrand.id, user.id)
  }

  if (!brandSettings?.enable_open_shifts) {
    return <EmptyState icon={CalendarPlus} title="Open Shifts Disabled" description="This feature is disabled for your brand." />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex gap-1 bg-surface-container rounded-lg p-1">
          <button onClick={() => setActiveTab('Available')} className={`py-1.5 px-3 rounded-md text-label-md font-semibold ${activeTab === 'Available' ? 'bg-primary-500 text-white' : 'text-on-surface-variant'}`}>
            Available
          </button>
          {isManager && (
            <button onClick={() => setActiveTab('History')} className={`py-1.5 px-3 rounded-md text-label-md font-semibold ${activeTab === 'History' ? 'bg-primary-500 text-white' : 'text-on-surface-variant'}`}>
              History
            </button>
          )}
        </div>
        
        {isManager && (
          <button onClick={() => setShowPost(true)} className="btn-primary py-1.5 px-3 text-label-md flex items-center gap-1">
            <Plus className="w-4 h-4" /> Post Shift
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3 flex-1 overflow-y-auto">
        {loading ? <LoadingSkeleton rows={3} /> : filteredShifts.length === 0 ? (
          <EmptyState icon={CalendarPlus} title="No open shifts" description="Check back later for extra shifts to claim!" />
        ) : filteredShifts.map(shift => (
          <div key={shift.id} className="card relative overflow-hidden">
            {shift.status !== 'open' && (
              <div className="absolute top-0 right-0 py-1 px-3 bg-surface-container rounded-bl-lg text-label-sm font-semibold uppercase">
                {shift.status}
              </div>
            )}
            
            <div className="flex justify-between items-start mb-2 pr-12">
              <h4 className="text-body-lg font-semibold text-on-surface">{format(new Date(shift.date), 'EEEE, MMM d')}</h4>
              {shift.shift_slots && <ShiftBadge slot={shift.shift_slots} />}
            </div>
            
            <p className="text-body-md font-semibold text-on-surface">{shift.title}</p>
            {shift.notes && <p className="text-body-md text-on-surface-variant mt-1">{shift.notes}</p>}
            
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {shift.profiles && (
                  <>
                    <Avatar name={shift.profiles.name} avatarUrl={shift.profiles.avatar_url} size="sm" />
                    <span className="text-label-sm text-on-surface-variant">Posted by {shift.profiles.name}</span>
                  </>
                )}
              </div>
              
              {shift.status === 'open' && (
                <div className="flex gap-2">
                  {isManager && (
                    <button onClick={() => cancelOpenShift(shift.id)} className="btn-secondary py-1.5 px-3 text-label-md">
                      Cancel
                    </button>
                  )}
                  <button onClick={() => handleClaim(shift)} className="btn-primary py-1.5 px-3 text-label-md flex items-center gap-1">
                    <Check className="w-4 h-4" /> Claim Shift
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isManager && (
        <BottomSheet isOpen={showPost} onClose={() => setShowPost(false)} title="Post Open Shift">
          <div className="space-y-4">
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Date</label>
              <input type="date" value={postDate} onChange={e => setPostDate(e.target.value)} className="input-base" min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Shift Slot</label>
              <select value={postSlotId} onChange={e => setPostSlotId(e.target.value)} className="input-base">
                <option value="">Select a slot...</option>
                {slots.map(s => (
                  <option key={s.id} value={s.id}>{s.label} ({s.start_time.slice(0,5)} - {s.end_time.slice(0,5)})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Title</label>
              <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="e.g. Extra coverage needed" className="input-base" />
            </div>
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Notes (optional)</label>
              <textarea value={postNotes} onChange={e => setPostNotes(e.target.value)} placeholder="Any specific requirements?" rows={2} className="input-base resize-none" />
            </div>
            <button onClick={handlePost} disabled={submitting || !postDate || !postSlotId || !postTitle} className="btn-primary w-full py-3">
              {submitting ? 'Posting...' : 'Post Open Shift'}
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
