import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Star } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function ManageSpecialDaysPage() {
  const { brandId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [form, setForm] = useState({ name: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })

  const fetchDays = async () => {
    setLoading(true)
    const { data } = await supabase.from('special_days').select('*').eq('brand_id', brandId).order('date')
    setDays(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchDays() }, [])

  const handleAdd = async () => {
    if (!form.name) return toast.error('Name is required')
    const { error } = await supabase.from('special_days').insert({ ...form, brand_id: brandId, created_by: user.id })
    if (error) return toast.error(error.message === '23505' ? 'A special day already exists for this date' : error.message)
    toast.success('Special day added!')
    setShowSheet(false)
    setForm({ name: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
    fetchDays()
  }

  const handleDelete = async (id) => {
    await supabase.from('special_days').delete().eq('id', id)
    toast.success('Removed')
    fetchDays()
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-on-surface-variant"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Special Days</h1>
          <button onClick={() => setShowSheet(true)} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"><Plus className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {loading ? <LoadingSkeleton rows={3} /> : days.length === 0 ? (
          <EmptyState icon={Star} title="No special days" description="Mark holidays, events, or special occasions." action={<button onClick={() => setShowSheet(true)} className="btn-primary px-6">Add Special Day</button>} />
        ) : days.map(day => (
          <div key={day.id} className="card flex items-start gap-3">
            <div className="w-12 h-12 bg-secondary-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Star className="w-6 h-6 text-secondary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-lg font-semibold text-on-surface">{day.name}</p>
              <p className="text-body-md text-on-surface-variant">{format(new Date(day.date), 'EEEE, MMMM d, yyyy')}</p>
              {day.notes && <p className="text-body-md text-on-surface-variant mt-1 italic">{day.notes}</p>}
            </div>
            <button onClick={() => handleDelete(day.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="Add Special Day">
        <div className="space-y-4">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. New Year's Day" className="input-base" />
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input-base" />
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Notes <span className="text-on-surface-variant font-normal">(optional)</span></label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Any notes…" className="input-base resize-none" />
          </div>
          <button onClick={handleAdd} className="btn-primary w-full">Add Special Day</button>
        </div>
      </BottomSheet>
    </div>
  )
}
