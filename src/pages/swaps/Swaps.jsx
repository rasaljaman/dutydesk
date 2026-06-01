import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ArrowLeftRight, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, Modal, Button, Select, EmptyState, Badge, Skeleton } from '../../components/ui'
import { ShiftBadge } from '../../components/shifts'
import { formatDate, STATUS_COLORS } from '../../lib/helpers'
import toast from 'react-hot-toast'

export default function Swaps() {
  const { profile, isManager } = useAuth()
  const [tab, setTab] = useState('active')
  const [swaps, setSwaps] = useState([])
  const [users, setUsers] = useState([])
  const [usersMap, setUsersMap] = useState({})
  const [slots, setSlotsMap] = useState({})
  const [schedules, setSchedules] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ target_id: '', date: format(new Date(), 'yyyy-MM-dd') })
  const [mySchedules, setMySchedules] = useState([])
  const [targetSchedules, setTargetSchedules] = useState([])
  const [selectedMySchedule, setSelectedMySchedule] = useState('')
  const [selectedTargetSchedule, setSelectedTargetSchedule] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)

    const [swapRes, userRes, slotRes] = await Promise.all([
      supabase.from('swap_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id, name').eq('is_active', true),
      supabase.from('shift_slots').select('*'),
    ])

    const uMap = {}
    userRes.data?.forEach((u) => { uMap[u.id] = u })
    setUsersMap(uMap)
    setUsers(userRes.data?.filter((u) => u.id !== profile.id) || [])

    const sMap = {}
    slotRes.data?.forEach((s) => { sMap[s.id] = s })
    setSlotsMap(sMap)

    // Get all schedule ids referenced by swaps
    const schedIds = new Set()
    swapRes.data?.forEach((s) => {
      schedIds.add(s.requester_schedule_id)
      schedIds.add(s.target_schedule_id)
    })
    if (schedIds.size > 0) {
      const { data: schedData } = await supabase
        .from('schedule')
        .select('*')
        .in('id', [...schedIds])
      const sched = {}
      schedData?.forEach((s) => { sched[s.id] = s })
      setSchedules(sched)
    }

    setSwaps(swapRes.data || [])
    setLoading(false)
  }, [profile])

  useEffect(() => { loadData() }, [loadData])

  const loadMySchedules = async () => {
    const { data } = await supabase
      .from('schedule')
      .select('*')
      .eq('user_id', profile.id)
      .gte('date', format(new Date(), 'yyyy-MM-dd'))
      .eq('status', 'active')
      .order('date')
    setMySchedules(data || [])
  }

  const loadTargetSchedules = async (targetId) => {
    if (!targetId) { setTargetSchedules([]); return }
    const { data } = await supabase
      .from('schedule')
      .select('*')
      .eq('user_id', targetId)
      .gte('date', format(new Date(), 'yyyy-MM-dd'))
      .eq('status', 'active')
      .order('date')
    setTargetSchedules(data || [])
  }

  const handleSubmitSwap = async (e) => {
    e.preventDefault()
    if (!selectedMySchedule || !selectedTargetSchedule) {
      toast.error('Please select shifts for both you and the target staff.')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('swap_requests').insert({
        requester_id: profile.id,
        target_id: form.target_id,
        requester_schedule_id: selectedMySchedule,
        target_schedule_id: selectedTargetSchedule,
      })
      if (error) throw error
      toast.success('Swap request sent!')
      setShowModal(false)
      setForm({ target_id: '', date: format(new Date(), 'yyyy-MM-dd') })
      setSelectedMySchedule('')
      setSelectedTargetSchedule('')
      loadData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcceptSwap = async (id) => {
    try {
      const { error } = await supabase.from('swap_requests').update({ status: 'accepted' }).eq('id', id)
      if (error) throw error
      toast.success('Swap accepted! Schedules updated.')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRejectSwap = async (id) => {
    try {
      await supabase.from('swap_requests').update({ status: 'removed' }).eq('id', id)
      toast.success('Swap rejected.')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRemoveSwap = async (id) => {
    try {
      await supabase.from('swap_requests').update({ status: 'removed' }).eq('id', id)
      toast.success('Swap removed.')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filteredSwaps = swaps.filter((s) => {
    const isInvolved = s.requester_id === profile.id || s.target_id === profile.id || isManager
    if (!isInvolved) return false
    if (tab === 'active') return ['pending', 'accepted'].includes(s.status)
    return s.status === 'removed'
  })

  const renderSwapCard = (swap) => {
    const requesterSched = schedules[swap.requester_schedule_id]
    const targetSched = schedules[swap.target_schedule_id]
    const requesterSlot = requesterSched ? slots[requesterSched.slot_id] : null
    const targetSlot = targetSched ? slots[targetSched.slot_id] : null
    const isTarget = swap.target_id === profile.id
    const isRequester = swap.requester_id === profile.id

    return (
      <Card key={swap.id} className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <ArrowLeftRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                {usersMap[swap.requester_id]?.name} ↔ {usersMap[swap.target_id]?.name}
              </p>
              {requesterSched && targetSched && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(requesterSched.date)} ↔ {formatDate(targetSched.date)}
                </p>
              )}
            </div>
          </div>
          <Badge className={STATUS_COLORS[swap.status]}>{swap.status}</Badge>
        </div>

        {/* Slot info */}
        <div className="flex items-center gap-2">
          {requesterSlot && <ShiftBadge slot={requesterSlot} size="sm" />}
          <ArrowLeftRight className="h-3.5 w-3.5 text-slate-300" />
          {targetSlot && <ShiftBadge slot={targetSlot} size="sm" />}
        </div>

        {/* Actions */}
        {swap.status === 'pending' && isTarget && (
          <div className="flex gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            <Button size="sm" variant="primary" icon={CheckCircle} className="flex-1 justify-center" onClick={() => handleAcceptSwap(swap.id)}>Accept</Button>
            <Button size="sm" variant="danger" icon={XCircle} className="flex-1 justify-center" onClick={() => handleRejectSwap(swap.id)}>Reject</Button>
          </div>
        )}
        {swap.status === 'accepted' && isManager && (
          <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => handleRemoveSwap(swap.id)}>Remove Swap</Button>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Swaps</h1>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => { setShowModal(true); loadMySchedules() }}>
          Request Swap
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-5">
        {[{ id: 'active', label: 'Active' }, { id: 'history', label: 'History' }].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filteredSwaps.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No swap requests" description="Request a shift swap with a colleague." />
      ) : (
        <div className="space-y-3">{filteredSwaps.map(renderSwapCard)}</div>
      )}

      {/* New Swap Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Shift Swap" size="lg">
        <form onSubmit={handleSubmitSwap} className="space-y-4">
          <Select label="Swap with" value={form.target_id} onChange={(e) => { setForm((f) => ({ ...f, target_id: e.target.value })); loadTargetSchedules(e.target.value) }} required>
            <option value="">Select colleague...</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>

          <Select label="My shift to swap" value={selectedMySchedule} onChange={(e) => setSelectedMySchedule(e.target.value)} required>
            <option value="">Select your shift...</option>
            {mySchedules.map((s) => {
              const slot = slots[s.slot_id]
              return <option key={s.id} value={s.id}>{formatDate(s.date)} – {slot?.label || 'Shift'}</option>
            })}
          </Select>

          {form.target_id && (
            <Select label="Their shift to take" value={selectedTargetSchedule} onChange={(e) => setSelectedTargetSchedule(e.target.value)} required>
              <option value="">Select their shift...</option>
              {targetSchedules.map((s) => {
                const slot = slots[s.slot_id]
                return <option key={s.id} value={s.id}>{formatDate(s.date)} – {slot?.label || 'Shift'}</option>
              })}
            </Select>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 justify-center" loading={submitting}>Send Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
