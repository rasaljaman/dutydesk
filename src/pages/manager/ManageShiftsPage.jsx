import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Clock, ChevronLeft, Plus, Trash2, Edit2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ShiftBadge } from '../../components/ui/ShiftBadge'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import toast from 'react-hot-toast'

const COLORS = ['#4F46E5', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']

export default function ManageShiftsPage() {
  const { brandId } = useParams()
  const navigate = useNavigate()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ label: '', start_time: '09:00', end_time: '17:00', color_hex: COLORS[0] })
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const fetchSlots = async () => {
    setLoading(true)
    const { data } = await supabase.from('shift_slots').select('*').eq('brand_id', brandId).order('start_time')
    setSlots(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSlots() }, [])

  const openAdd = () => { setEditing(null); setForm({ label: '', start_time: '09:00', end_time: '17:00', color_hex: COLORS[0] }); setShowSheet(true) }
  const openEdit = (slot) => { setEditing(slot); setForm({ label: slot.label, start_time: slot.start_time.slice(0, 5), end_time: slot.end_time.slice(0, 5), color_hex: slot.color_hex }); setShowSheet(true) }

  const handleSave = async () => {
    if (!form.label || !form.start_time || !form.end_time) return toast.error('Please fill all fields')
    const payload = { ...form, brand_id: brandId }
    let error
    if (editing) ({ error } = await supabase.from('shift_slots').update(payload).eq('id', editing.id))
    else ({ error } = await supabase.from('shift_slots').insert(payload))
    if (error) return toast.error(error.message)
    toast.success(editing ? 'Shift updated' : 'Shift created')
    setShowSheet(false)
    fetchSlots()
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('shift_slots').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Shift deleted')
    fetchSlots()
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-on-surface-variant"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Shift Slots</h1>
          <button onClick={openAdd} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"><Plus className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {loading ? <LoadingSkeleton rows={3} /> : slots.length === 0 ? (
          <EmptyState icon={Clock} title="No shifts yet" description="Create shift slots to assign to staff." action={<button onClick={openAdd} className="btn-primary px-6">Add First Shift</button>} />
        ) : slots.map(slot => (
          <div key={slot.id} className="card flex items-center gap-3">
            <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: slot.color_hex }} />
            <div className="flex-1">
              <p className="text-body-lg font-semibold text-on-surface">{slot.label}</p>
              <p className="text-body-md text-on-surface-variant">{slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}</p>
            </div>
            <button onClick={() => openEdit(slot)} className="p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => handleDelete(slot.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title={editing ? 'Edit Shift' : 'New Shift Slot'}>
        <div className="space-y-4">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Label *</label>
            <input value={form.label} onChange={e => update('label', e.target.value)} placeholder="e.g. Morning" className="input-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Start Time</label>
              <input type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">End Time</label>
              <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)} className="input-base" />
            </div>
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button key={color} type="button" onClick={() => update('color_hex', color)}
                  className={`w-8 h-8 rounded-full transition-all ${form.color_hex === color ? 'ring-2 ring-offset-2 ring-on-surface scale-110' : ''}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <button onClick={handleSave} className="btn-primary w-full">{editing ? 'Save Changes' : 'Create Shift'}</button>
        </div>
      </BottomSheet>
    </div>
  )
}
