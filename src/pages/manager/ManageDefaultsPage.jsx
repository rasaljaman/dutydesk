import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/ui/Avatar'
import { ShiftBadge } from '../../components/ui/ShiftBadge'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import toast from 'react-hot-toast'

export default function ManageDefaultsPage() {
  const { brandId } = useParams()
  const navigate = useNavigate()
  const [defaults, setDefaults] = useState([])
  const [members, setMembers] = useState([])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState('')

  const loadData = async () => {
    setLoading(true)
    const [d, m, s] = await Promise.all([
      supabase.from('default_assignments').select('*, profiles(id, name, username, avatar_url), shift_slots(*)').eq('brand_id', brandId),
      supabase.from('brand_members').select('*, profiles(id, name, username, avatar_url)').eq('brand_id', brandId).eq('is_active', true),
      supabase.from('shift_slots').select('*').eq('brand_id', brandId).order('start_time'),
    ])
    setDefaults(d.data ?? [])
    setMembers(m.data ?? [])
    setSlots(s.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleAdd = async () => {
    if (!selectedUserId || !selectedSlotId) return toast.error('Select a staff member and shift slot')
    // Check for duplicate
    const existing = defaults.find(d => d.user_id === selectedUserId && d.slot_id === selectedSlotId)
    if (existing) return toast.error('This assignment already exists')
    const { error } = await supabase.from('default_assignments').insert({
      brand_id: brandId,
      user_id: selectedUserId,
      slot_id: selectedSlotId,
    })
    if (error) return toast.error(error.message)
    toast.success('Default assignment added!')
    setShowSheet(false)
    loadData()
  }

  const handleRemove = async (id) => {
    const { error } = await supabase.from('default_assignments').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Assignment removed')
    loadData()
  }

  const openAdd = () => {
    setSelectedUserId(members[0]?.user_id || '')
    setSelectedSlotId(slots[0]?.id || '')
    setShowSheet(true)
  }

  // Group defaults by slot
  const groupedBySlot = slots.map(slot => ({
    slot,
    assignments: defaults.filter(d => d.slot_id === slot.id),
  }))

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-on-surface-variant"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Default Assignments</h1>
          <button onClick={openAdd} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"><Plus className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <p className="text-body-md text-on-surface-variant">
          Set up which staff members are assigned to which shifts by default. Use "Auto-Generate" on the Schedule page to apply these to an entire week.
        </p>

        {loading ? <LoadingSkeleton rows={3} /> : defaults.length === 0 ? (
          <EmptyState icon={Users} title="No defaults" description="Add staff to shift slots to create default weekly assignments." action={<button onClick={openAdd} className="btn-primary px-6">Add Assignment</button>} />
        ) : (
          groupedBySlot.map(({ slot, assignments }) => assignments.length > 0 && (
            <div key={slot.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: slot.color_hex }} />
                <div className="flex-1">
                  <p className="text-body-lg font-semibold text-on-surface">{slot.label}</p>
                  <p className="text-body-md text-on-surface-variant">{slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}</p>
                </div>
                <span className="chip chip-active">{assignments.length}</span>
              </div>
              <div className="space-y-2">
                {assignments.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2 bg-surface-container rounded-lg">
                    <Avatar name={a.profiles?.name} avatarUrl={a.profiles?.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-medium text-on-surface truncate">{a.profiles?.name}</p>
                      <p className="text-label-md text-on-surface-variant">@{a.profiles?.username}</p>
                    </div>
                    <button onClick={() => handleRemove(a.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="Add Default Assignment">
        <div className="space-y-4">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Staff Member</label>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="input-base">
              {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profiles?.name} (@{m.profiles?.username})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Shift Slot</label>
            <select value={selectedSlotId} onChange={e => setSelectedSlotId(e.target.value)} className="input-base">
              {slots.map(s => <option key={s.id} value={s.id}>{s.label} ({s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)})</option>)}
            </select>
          </div>
          <button onClick={handleAdd} className="btn-primary w-full">Add Assignment</button>
        </div>
      </BottomSheet>
    </div>
  )
}
