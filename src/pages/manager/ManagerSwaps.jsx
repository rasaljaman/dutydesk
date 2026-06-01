import { useState, useEffect } from 'react'
import { ArrowLeftRight, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card, Button, Badge, EmptyState, Skeleton } from '../../components/ui'
import { ShiftBadge } from '../../components/shifts'
import { formatDate, STATUS_COLORS } from '../../lib/helpers'
import toast from 'react-hot-toast'

export default function ManagerSwaps() {
  const [swaps, setSwaps] = useState([])
  const [users, setUsers] = useState({})
  const [slots, setSlots] = useState({})
  const [schedules, setSchedules] = useState({})
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [swapRes, userRes, slotRes] = await Promise.all([
      supabase.from('swap_requests').select('*').in('status', ['pending', 'accepted']).order('created_at', { ascending: false }),
      supabase.from('users').select('id, name'),
      supabase.from('shift_slots').select('*'),
    ])

    const uMap = {}
    userRes.data?.forEach((u) => { uMap[u.id] = u })
    setUsers(uMap)

    const sMap = {}
    slotRes.data?.forEach((s) => { sMap[s.id] = s })
    setSlots(sMap)

    const schedIds = new Set()
    swapRes.data?.forEach((s) => { schedIds.add(s.requester_schedule_id); schedIds.add(s.target_schedule_id) })
    if (schedIds.size > 0) {
      const { data: schedData } = await supabase.from('schedule').select('*').in('id', [...schedIds])
      const sched = {}
      schedData?.forEach((s) => { sched[s.id] = s })
      setSchedules(sched)
    }

    setSwaps(swapRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleRemoveSwap = async (id) => {
    try {
      await supabase.from('swap_requests').update({ status: 'removed' }).eq('id', id)
      toast.success('Swap removed.')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">All Active Swaps</h1>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : swaps.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No active swaps" description="All swap requests will appear here." />
      ) : (
        <div className="space-y-3">
          {swaps.map((swap) => {
            const reqSched = schedules[swap.requester_schedule_id]
            const tgtSched = schedules[swap.target_schedule_id]
            const reqSlot = reqSched ? slots[reqSched.slot_id] : null
            const tgtSlot = tgtSched ? slots[tgtSched.slot_id] : null

            return (
              <Card key={swap.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {users[swap.requester_id]?.name} ↔ {users[swap.target_id]?.name}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[swap.status]}>{swap.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {reqSched && <span>{formatDate(reqSched.date)}</span>}
                  <ArrowLeftRight className="h-3 w-3" />
                  {tgtSched && <span>{formatDate(tgtSched.date)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {reqSlot && <ShiftBadge slot={reqSlot} size="sm" />}
                  {tgtSlot && <ShiftBadge slot={tgtSlot} size="sm" />}
                </div>
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleRemoveSwap(swap.id)}>
                  Remove Swap
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
