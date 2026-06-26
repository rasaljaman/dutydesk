import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Trash2, Wand2, Users, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/ui/Avatar'
import { ShiftBadge } from '../../components/ui/ShiftBadge'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { ConflictWarningModal } from '../../components/ui/ConflictWarningModal'
import { useBrand } from '../../context/BrandContext'
import { useScheduleTemplates } from '../../hooks/useScheduleTemplates'
import { checkShiftConflicts } from '../../lib/conflictCheck'
import toast from 'react-hot-toast'

export default function ManageSchedulePage() {
  const { brandId } = useParams()
  const navigate = useNavigate()
  const { currentBrand } = useBrand()
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [schedule, setSchedule] = useState([])
  const [members, setMembers] = useState([])
  const [slots, setSlots] = useState([])
  const [defaults, setDefaults] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [assignDate, setAssignDate] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [assignSlotId, setAssignSlotId] = useState('')
  
  const { templates, fetchTemplates, applyTemplate } = useScheduleTemplates(brandId)
  const [showApplyTemplate, setShowApplyTemplate] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateConflicts, setTemplateConflicts] = useState([])

  const weekStart = format(currentWeek, 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i))

  const loadData = useCallback(async () => {
    setLoading(true)
    const [schedData, membersData, slotsData, defaultsData] = await Promise.all([
      supabase.from('schedule').select('*, profiles(id, name, username, avatar_url), shift_slots(*)').eq('brand_id', brandId).eq('status', 'active').gte('date', weekStart).lte('date', weekEnd).order('date'),
      supabase.from('brand_members').select('*, profiles!brand_members_user_id_fkey(id, name, username, avatar_url)').eq('brand_id', brandId).eq('is_active', true),
      supabase.from('shift_slots').select('*').eq('brand_id', brandId).order('start_time'),
      supabase.from('default_assignments').select('*, profiles(id, name, username, avatar_url), shift_slots(*)').eq('brand_id', brandId),
    ])
    setSchedule(schedData.data ?? [])
    setMembers(membersData.data ?? [])
    setSlots(slotsData.data ?? [])
    setDefaults(defaultsData.data ?? [])
    setLoading(false)
  }, [brandId, weekStart, weekEnd])

  useEffect(() => { loadData(); fetchTemplates() }, [loadData, fetchTemplates])

  const generateWeek = async () => {
    if (defaults.length === 0) return toast.error('No default assignments set. Add default assignments first.')
    setGenerating(true)
    try {
      const existingDates = new Set(schedule.map(s => s.date))
      const entries = []
      for (const day of weekDays) {
        const dateStr = format(day, 'yyyy-MM-dd')
        if (existingDates.has(dateStr)) continue // skip days that already have entries
        for (const da of defaults) {
          entries.push({
            brand_id: brandId,
            user_id: da.user_id,
            slot_id: da.slot_id,
            date: dateStr,
            type: 'normal',
            status: 'active',
          })
        }
      }
      if (entries.length === 0) {
        toast('All days already have schedule entries', { icon: '📅' })
        setGenerating(false)
        return
      }
      const { error } = await supabase.from('schedule').insert(entries)
      if (error) throw error
      toast.success(`Generated ${entries.length} schedule entries!`)
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
    setGenerating(false)
  }

  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [conflictWarnings, setConflictWarnings] = useState([])
  const [pendingAssignment, setPendingAssignment] = useState(null)

  const handleAssign = async () => {
    if (!assignDate || !assignUserId || !assignSlotId) return toast.error('Please fill all fields')
    
    // Check for conflicts before inserting
    const { hasConflict, warnings } = await checkShiftConflicts(brandId, assignUserId, assignDate, assignSlotId)
    
    if (hasConflict) {
      setConflictWarnings(warnings)
      setPendingAssignment({ assignDate, assignUserId, assignSlotId })
      setConflictModalOpen(true)
      return
    }

    executeAssign(assignDate, assignUserId, assignSlotId)
  }

  const executeAssign = async (date, userId, slotId) => {
    try {
      const { error } = await supabase.from('schedule').insert({
        brand_id: brandId,
        user_id: userId,
        slot_id: slotId,
        date: date,
        type: 'normal',
        status: 'active',
      })
      if (error) throw error
      toast.success('Shift assigned!')
      setShowAssign(false)
      setConflictModalOpen(false)
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleConfirmConflict = () => {
    if (pendingAssignment) {
      executeAssign(pendingAssignment.assignDate, pendingAssignment.assignUserId, pendingAssignment.assignSlotId)
    }
  }

  const cancelShift = async (scheduleId) => {
    const { error } = await supabase.from('schedule').update({ status: 'cancelled' }).eq('id', scheduleId)
    if (error) return toast.error(error.message)
    toast.success('Shift removed')
    loadData()
  }

  const openAssign = (date) => {
    setAssignDate(format(date, 'yyyy-MM-dd'))
    setAssignUserId(members[0]?.user_id || '')
    setAssignSlotId(slots[0]?.id || '')
    setShowAssign(true)
  }

  const handleApplyTemplate = async (override = false) => {
    if (!selectedTemplateId) return toast.error('Select a template')
    setGenerating(true)
    try {
      const result = await applyTemplate(selectedTemplateId, weekStart, override)
      if (result.requiresOverride) {
        setTemplateConflicts(result.conflicts.map(c => c.message))
        setConflictModalOpen(true)
      } else if (result.success) {
        toast.success(`Applied template: ${result.created} shifts created.`)
        setShowApplyTemplate(false)
        setConflictModalOpen(false)
        loadData()
      }
    } catch (err) {
      toast.error(err.message)
    }
    setGenerating(false)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-on-surface-variant"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Schedule</h1>
          <button onClick={() => navigate(`/${brandId}/manage/defaults`)} className="text-primary-500 text-body-md font-semibold px-2">
            Defaults
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentWeek(w => subWeeks(w, 1))} className="p-2 rounded-lg hover:bg-surface-container"><ChevronLeft className="w-5 h-5 text-on-surface-variant" /></button>
          <div className="text-center">
            <h2 className="text-title-lg font-semibold text-on-surface">{format(currentWeek, 'MMM d')} – {format(addDays(currentWeek, 6), 'MMM d, yyyy')}</h2>
          </div>
          <button onClick={() => setCurrentWeek(w => addWeeks(w, 1))} className="p-2 rounded-lg hover:bg-surface-container"><ChevronRight className="w-5 h-5 text-on-surface-variant" /></button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={generateWeek} disabled={generating} className="flex-1 btn-primary gap-2 text-label-md">
            <Wand2 className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Wait…' : 'Use Defaults'}
          </button>
          <button onClick={() => setShowApplyTemplate(true)} className="flex-1 btn-secondary bg-white gap-2 text-label-md border-outline-variant">
            <Calendar className="w-4 h-4" /> Apply Template
          </button>
        </div>

        {/* Weekly Grid */}
        {loading ? <LoadingSkeleton rows={7} /> : (
          <div className="space-y-3">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayShifts = schedule.filter(s => s.date === dateStr)
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={dateStr} className={`card ${isToday ? 'border-primary-300 bg-primary-50/30' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-title-lg font-semibold text-on-surface">{format(day, 'EEEE')}</p>
                      <p className="text-body-md text-on-surface-variant">{format(day, 'MMM d')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="chip chip-active">{dayShifts.length}</span>
                      <button onClick={() => openAssign(day)} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {dayShifts.length === 0 ? (
                    <p className="text-body-md text-on-surface-variant italic">No shifts scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts.map(shift => (
                        <div key={shift.id} className="flex items-center gap-3 p-2 bg-surface-container rounded-lg">
                          <Avatar name={shift.profiles?.name} avatarUrl={shift.profiles?.avatar_url} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-body-md font-medium text-on-surface truncate">{shift.profiles?.name}</p>
                          </div>
                          {shift.shift_slots && <ShiftBadge slot={shift.shift_slots} size="sm" />}
                          <button onClick={() => cancelShift(shift.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign Shift Sheet */}
      <BottomSheet isOpen={showAssign} onClose={() => setShowAssign(false)} title="Assign Shift">
        <div className="space-y-4">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Date</label>
            <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Staff Member</label>
            <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} className="input-base">
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profiles?.name} (@{m.profiles?.username})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Shift Slot</label>
            <select value={assignSlotId} onChange={e => setAssignSlotId(e.target.value)} className="input-base">
              {slots.map(s => <option key={s.id} value={s.id}>{s.label} ({s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)})</option>)}
            </select>
          </div>
          <button onClick={handleAssign} className="btn-primary w-full">Assign Shift</button>
        </div>
      </BottomSheet>

      {/* Apply Template Sheet */}
      <BottomSheet isOpen={showApplyTemplate} onClose={() => setShowApplyTemplate(false)} title="Apply Template">
        <div className="space-y-4">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Select Template</label>
            {templates.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant bg-surface-container p-3 rounded-lg">No templates exist yet. Create one in Manage Templates.</p>
            ) : (
              <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="input-base">
                <option value="">-- Choose Template --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>
          <button onClick={() => handleApplyTemplate(false)} disabled={!selectedTemplateId || generating} className="btn-primary w-full">
            Apply to this Week
          </button>
        </div>
      </BottomSheet>

      <ConflictWarningModal
        isOpen={conflictModalOpen}
        warnings={conflictWarnings.length > 0 ? conflictWarnings : templateConflicts}
        onConfirm={conflictWarnings.length > 0 ? handleConfirmConflict : () => handleApplyTemplate(true)}
        onCancel={() => {
          setConflictModalOpen(false)
          setPendingAssignment(null)
          setConflictWarnings([])
          setTemplateConflicts([])
        }}
      />
    </div>
  )
}
