import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, Star, Trash2, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, Modal, Button, Input, EmptyState, Skeleton } from '../../components/ui'
import { formatDate } from '../../lib/helpers'
import toast from 'react-hot-toast'

export default function SpecialDays() {
  const { profile } = useAuth()
  const [specialDays, setSpecialDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('special_days').select('*, users(name)').order('date')
    setSpecialDays(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('special_days').insert({
        ...form,
        created_by: profile.id,
      })
      if (error) throw error

      // Notify all staff
      const { data: allStaff } = await supabase.from('users').select('id').eq('is_active', true)
      const notifs = (allStaff || []).map((u) => ({
        user_id: u.id,
        title: `Special Day: ${form.name}`,
        message: `${format(new Date(form.date), 'MMMM d, yyyy')} has been marked as a special day.${form.notes ? ` ${form.notes}` : ''}`,
        type: 'shift_change',
      }))
      if (notifs.length > 0) await supabase.from('notifications').insert(notifs)

      toast.success('Special day added and staff notified!')
      setShowModal(false)
      setForm({ name: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
      loadData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await supabase.from('special_days').delete().eq('id', id)
      toast.success('Special day removed.')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const upcoming = specialDays.filter((d) => d.date >= today)
  const past = specialDays.filter((d) => d.date < today)

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Special Days</h1>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowModal(true)}>Add Day</Button>
      </div>

      {loading ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          {upcoming.length === 0 && past.length === 0 ? (
            <EmptyState icon={Star} title="No special days" description="Mark holidays and special occasions to notify staff." />
          ) : (
            <>
              {upcoming.length > 0 && (
                <div className="mb-6">
                  <h2 className="section-title mb-3">Upcoming</h2>
                  <div className="space-y-2">
                    {upcoming.map((sd) => (
                      <Card key={sd.id} className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                          <Star className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{sd.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(sd.date, 'EEEE, MMMM d, yyyy')}</p>
                          {sd.notes && <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">{sd.notes}</p>}
                        </div>
                        <button onClick={() => handleDelete(sd.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <h2 className="section-title mb-3 text-slate-400 dark:text-slate-500">Past</h2>
                  <div className="space-y-2">
                    {past.slice(-5).reverse().map((sd) => (
                      <Card key={sd.id} className="flex items-center gap-4 opacity-60">
                        <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{sd.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(sd.date)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Special Day">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Eid ul-Fitr" required />
          <div>
            <label className="form-label">Date</label>
            <input type="date" className="input-field" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          </div>
          <div>
            <label className="form-label">Notes (optional)</label>
            <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any special instructions..." />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 justify-center" loading={saving}>Add Special Day</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
