import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, isToday } from 'date-fns'
import { Clock, Users, ArrowLeftRight, Bell, Plus, ChevronRight, Check, ClipboardEdit, MessageSquare } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { ShiftBadge } from '../../components/ui/ShiftBadge'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { WhoIsWorkingCard } from '../../components/ui/WhoIsWorkingCard'
import { useSchedule } from '../../hooks/useSchedule'
import { useRealtime } from '../../hooks/useRealtime'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'
import { useShiftConfirmations } from '../../hooks/useShiftConfirmations'
import { useHandoverNotes } from '../../hooks/useHandoverNotes'
import { supabase } from '../../lib/supabase'

export default function DashboardPage() {
  const { brandId } = useParams()
  const { profile } = useAuth()
  const { currentBrand, isManager, brandSettings } = useBrand()
  const { fetchSchedule } = useSchedule()
  const { confirmations, getConfirmations, confirmShift } = useShiftConfirmations()
  const navigate = useNavigate()

  const [todayShifts, setTodayShifts] = useState([])
  const [myShift, setMyShift] = useState(null)
  const [allMembers, setAllMembers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const { getRecentNotes, getNoteForShift, saveNote } = useHandoverNotes(brandId)
  const [recentNotes, setRecentNotes] = useState([])
  const [myNote, setMyNote] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [scheduleData, membersData, confData, notesData] = await Promise.all([
      fetchSchedule(today, today),
      supabase.from('brand_members').select('*, profiles!brand_members_user_id_fkey(id, name, username, avatar_url)').eq('brand_id', brandId).eq('is_active', true),
      getConfirmations(brandId),
      getRecentNotes(5)
    ])
    setTodayShifts(scheduleData ?? [])
    
    const myCurrentShift = scheduleData?.find(s => s.user_id === profile?.id) ?? null
    setMyShift(myCurrentShift)
    setAllMembers(membersData.data ?? [])
    setRecentNotes(notesData)
    
    if (myCurrentShift) {
      const shiftNote = await getNoteForShift(myCurrentShift.date, myCurrentShift.slot_id)
      if (shiftNote) setMyNote(shiftNote.content)
    }
    
    setLoading(false)
  }, [brandId, profile?.id])

  useEffect(() => { loadData() }, [loadData])
  useRealtime({ onScheduleChange: loadData })

  const onDuty = todayShifts.filter(s => s.user_id !== profile?.id)
  const isShiftConfirmed = myShift ? confirmations.some(c => c.schedule_id === myShift.id) : false

  return (
    <AppLayout title={currentBrand?.name || 'Dashboard'}>
      <div className="px-4 py-4 space-y-5">
        {/* Greeting */}
        <div className="flex items-center gap-3">
          <Avatar name={profile?.name} avatarUrl={profile?.avatar_url} size="lg" />
          <div>
            <p className="text-body-md text-on-surface-variant">
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'},
            </p>
            <h2 className="text-headline-md text-on-surface">{profile?.name?.split(' ')[0]} 👋</h2>
          </div>
        </div>

        {/* Who is Working Now */}
        <WhoIsWorkingCard brandId={brandId} />

        {/* Today's shift card */}
        <div className={`rounded-lg p-4 ${myShift ? 'bg-primary-500' : 'bg-surface-container'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-label-md ${myShift ? 'text-primary-100' : 'text-on-surface-variant'}`}>Today · {format(new Date(), 'EEE, MMM d')}</p>
              <h3 className={`text-title-lg font-semibold ${myShift ? 'text-white' : 'text-on-surface'}`}>
                {myShift ? 'Your Shift' : 'No Shift Today'}
              </h3>
            </div>
            <div className={`w-10 h-10 rounded-full ${myShift ? 'bg-white/20' : 'bg-outline-variant/30'} flex items-center justify-center`}>
              <Clock className={`w-5 h-5 ${myShift ? 'text-white' : 'text-outline'}`} />
            </div>
          </div>
          {myShift && myShift.shift_slots ? (
            <ShiftBadge slot={{ ...myShift.shift_slots, color_hex: '#ffffff20' }} size="lg" />
          ) : (
            <p className={`text-body-md ${myShift ? 'text-primary-100' : 'text-on-surface-variant'}`}>
              {myShift ? '' : 'Enjoy your day off!'}
            </p>
          )}
          {myShift && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-white/20 rounded-full">
                  <span className="text-white text-label-md font-semibold">{myShift.shift_slots?.label}</span>
                </div>
                <span className="text-primary-100 text-label-md">{myShift.shift_slots?.start_time?.slice(0, 5)} – {myShift.shift_slots?.end_time?.slice(0, 5)}</span>
              </div>
              {brandSettings?.enable_shift_confirmations && (
                isShiftConfirmed ? (
                  <span className="flex items-center gap-1 text-primary-100 text-label-md font-medium">
                    <Check className="w-4 h-4" /> Confirmed
                  </span>
                ) : (
                  <button 
                    onClick={() => confirmShift(brandId, myShift.id, profile.id)}
                    className="bg-white text-primary-600 px-3 py-1 rounded-full text-label-md font-semibold hover:bg-primary-50 transition-colors"
                  >
                    Confirm Shift
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Handover Notes */}
        {myShift && (
          <div className="card border-primary-200 bg-primary-50/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-title-lg text-primary-900 flex items-center gap-2">
                <ClipboardEdit className="w-5 h-5 text-primary-600" />
                My Handover Note
              </h3>
              {!isEditingNote && (
                <button onClick={() => setIsEditingNote(true)} className="text-primary-600 text-label-md font-semibold hover:underline">
                  {myNote ? 'Edit' : 'Add Note'}
                </button>
              )}
            </div>
            
            {isEditingNote ? (
              <div className="space-y-3">
                <textarea 
                  value={myNote} 
                  onChange={e => setMyNote(e.target.value)} 
                  className="input-base min-h-[100px] text-body-md" 
                  placeholder="Leave a note for the next shift..."
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditingNote(false)} className="btn-secondary py-1.5 px-4">Cancel</button>
                  <button 
                    onClick={async () => {
                      setSavingNote(true)
                      try {
                        await saveNote(myShift.date, myShift.slot_id, profile.id, myNote)
                        setIsEditingNote(false)
                        const notesData = await getRecentNotes(5)
                        setRecentNotes(notesData)
                      } catch (err) {}
                      setSavingNote(false)
                    }} 
                    disabled={savingNote} 
                    className="btn-primary py-1.5 px-4"
                  >
                    {savingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-body-md ${myNote ? 'text-on-surface' : 'text-on-surface-variant italic'}`}>
                {myNote || 'No handover note added for this shift yet.'}
              </p>
            )}
          </div>
        )}

        {recentNotes.length > 0 && (
          <div className="card">
            <h3 className="text-title-lg text-on-surface mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-outline" />
              Recent Handovers
            </h3>
            <div className="space-y-3 divide-y divide-outline-variant">
              {recentNotes.map(note => (
                <div key={note.id} className="pt-3 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar name={note.profiles?.name} avatarUrl={note.profiles?.avatar_url} size="xs" />
                    <span className="text-label-md font-medium text-on-surface">{note.profiles?.name}</span>
                    <span className="text-label-sm text-on-surface-variant ml-auto">
                      {format(new Date(note.created_at), 'MMM d, p')}
                    </span>
                  </div>
                  <p className="text-body-md text-on-surface whitespace-pre-wrap pl-8">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        {brandSettings && (
          <div className="grid grid-cols-2 gap-3">
            {brandSettings.enable_leave_requests && (
              <button onClick={() => navigate(`/${brandId}/leaves`)} className="card flex flex-col items-start gap-2 hover:border-primary-300 transition-all">
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-secondary-400" />
                </div>
                <span className="text-body-md font-semibold text-on-surface">Leave Requests</span>
              </button>
            )}
            {brandSettings.enable_shift_swap && (
              <button onClick={() => navigate(`/${brandId}/swaps`)} className="card flex flex-col items-start gap-2 hover:border-primary-300 transition-all">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-primary-500" />
                </div>
                <span className="text-body-md font-semibold text-on-surface">Shift Swaps</span>
              </button>
            )}
            <button onClick={() => navigate(`/${brandId}/calendar`)} className="card flex flex-col items-start gap-2 hover:border-primary-300 transition-all">
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-body-md font-semibold text-on-surface">Schedule</span>
            </button>
            {brandSettings.enable_announcements && (
              <button onClick={() => navigate(`/${brandId}/announcements`)} className="card flex flex-col items-start gap-2 hover:border-primary-300 transition-all">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-body-md font-semibold text-on-surface">Announcements</span>
              </button>
            )}
            {isManager && (
              <button onClick={() => navigate(`/${brandId}/manage/staffs`)} className="card flex flex-col items-start gap-2 hover:border-primary-300 transition-all">
                <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-body-md font-semibold text-on-surface">Manage</span>
              </button>
            )}
          </div>
        )}

        {/* On duty today */}
        {brandSettings?.enable_staff_view_others !== false && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-title-lg text-on-surface">On Duty Today</h3>
              <span className="chip chip-active">{todayShifts.length}</span>
            </div>
            {loading ? <LoadingSkeleton rows={2} /> : onDuty.length === 0 ? (
              <EmptyState icon={Users} title="No one else on duty" description="You're the only one scheduled today" />
            ) : (
              <div className="space-y-2">
                {onDuty.slice(0, 5).map(shift => (
                  <div key={shift.id} className="card flex items-center gap-3">
                    <Avatar name={shift.profiles?.name} avatarUrl={shift.profiles?.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-lg font-medium text-on-surface truncate">{shift.profiles?.name}</p>
                      <p className="text-body-md text-on-surface-variant">@{shift.profiles?.username}</p>
                    </div>
                    {shift.shift_slots && <ShiftBadge slot={shift.shift_slots} size="sm" />}
                  </div>
                ))}
                {onDuty.length > 5 && (
                  <button onClick={() => navigate(`/${brandId}/calendar`)} className="btn-ghost w-full gap-1">
                    View all {onDuty.length} <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
