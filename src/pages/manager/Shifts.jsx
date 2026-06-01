import { useState, useEffect, useCallback } from 'react'
import { Pencil, Plus, Clock, Palette } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, Modal, Button, Input, Select, Skeleton, EmptyState } from '../../components/ui'
import { ShiftBadge, ShiftTimeChip } from '../../components/shifts'
import { formatTime } from '../../lib/helpers'
import toast from 'react-hot-toast'

const PRESET_COLORS = [
  '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#EC4899',
  '#F97316', '#06B6D4', '#84CC16', '#6366F1',
]

export default function ManagerShifts() {
  const [slots, setSlots] = useState([])
  const [staffs, setStaffs] = useState([])
  const [defaultAssignments, setDefaultAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState(null)
  const [slotForm, setSlotForm] = useState({ label: '', start_time: '', end_time: '', color: '#F59E0B' })
  const [saving, setSaving] = useState(false)
  const [showSlotModal, setShowSlotModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [slotRes, staffRes, daRes] = await Promise.all([
      supabase.from('shift_slots').select('*').order('start_time'),
      supabase.from('users').select('id, name, role').eq('is_active', true).in('role', ['permanent', 'manager', 'admin']).order('name'),
      supabase.from('default_assignments').select('*'),
    ])
    setSlots(slotRes.data || [])
    setStaffs(staffRes.data || [])
    setDefaultAssignments(daRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openAdd = () => {
    setEditingSlot(null)
    setSlotForm({ label: '', start_time: '', end_time: '', color: '#F59E0B' })
    setShowSlotModal(true)
  }

  const openEdit = (slot) => {
    setEditingSlot(slot)
    setSlotForm({ label: slot.label, start_time: slot.start_time.slice(0, 5), end_time: slot.end_time.slice(0, 5), color: slot.color })
    setShowSlotModal(true)
  }

  const handleSaveSlot = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingSlot) {
        const { error } = await supabase.from('shift_slots').update(slotForm).eq('id', editingSlot.id)
        if (error) throw error
        toast.success('Shift slot updated!')
      } else {
        const { error } = await supabase.from('shift_slots').insert(slotForm)
        if (error) throw error
        toast.success('Shift slot added!')
      }
      setShowSlotModal(false)
      loadData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDefaultAssignment = async (userId, slotId) => {
    try {
      if (!slotId) {
        await supabase.from('default_assignments').delete().eq('user_id', userId)
        toast.success('Default assignment removed.')
      } else {
        await supabase.from('default_assignments').upsert({ user_id: userId, slot_id: slotId }, { onConflict: 'user_id' })
        toast.success('Default assignment saved.')
      }
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const getDefaultSlotForUser = (userId) => {
    const da = defaultAssignments.find((a) => a.user_id === userId)
    return da?.slot_id || ''
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Shift Slots</h1>
        <Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Add Slot</Button>
      </div>

      {/* Shift slots list */}
      <div className="mb-8">
        <h2 className="section-title mb-3">All Slots</h2>
        {loading ? (
          <div className="space-y-2">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => (
              <Card key={slot.id} className="flex items-center gap-4">
                <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: slot.color }} />
                <div className="flex-1 min-w-0">
                  <ShiftBadge slot={slot} size="md" />
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </div>
                </div>
                <button onClick={() => openEdit(slot)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Default assignments */}
      <div>
        <h2 className="section-title mb-1">Default Assignments</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Assign each permanent staff to a default shift slot</p>
        {loading ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="space-y-2">
            {staffs.map((staff) => (
              <Card key={staff.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{staff.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{staff.role}</p>
                </div>
                <select
                  className="input-field py-1.5 text-sm w-48"
                  value={getDefaultSlotForUser(staff.id)}
                  onChange={(e) => handleDefaultAssignment(staff.id, e.target.value)}
                >
                  <option value="">No default slot</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Slot Modal */}
      <Modal isOpen={showSlotModal} onClose={() => setShowSlotModal(false)} title={editingSlot ? 'Edit Shift Slot' : 'Add Shift Slot'}>
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <Input label="Label" value={slotForm.label} onChange={(e) => setSlotForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Morning Slot 1" required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Start Time</label>
              <input type="time" className="input-field" value={slotForm.start_time} onChange={(e) => setSlotForm((f) => ({ ...f, start_time: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">End Time</label>
              <input type="time" className="input-field" value={slotForm.end_time} onChange={(e) => setSlotForm((f) => ({ ...f, end_time: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="form-label">Color</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSlotForm((f) => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-transform ${slotForm.color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input type="color" value={slotForm.color} onChange={(e) => setSlotForm((f) => ({ ...f, color: e.target.value }))} className="w-7 h-7 rounded-full cursor-pointer" />
            </div>
          </div>
          {/* Preview */}
          {slotForm.label && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Preview</p>
              <ShiftBadge slot={{ ...slotForm }} size="md" />
            </div>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={() => setShowSlotModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 justify-center" loading={saving}>{editingSlot ? 'Save Changes' : 'Add Slot'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
