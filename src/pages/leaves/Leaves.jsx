import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, Modal, Button, Textarea, EmptyState, Badge, Skeleton } from '../../components/ui'
import { ShiftBadge } from '../../components/shifts'
import { formatDate, STATUS_COLORS } from '../../lib/helpers'
import toast from 'react-hot-toast'

export default function Leaves() {
  const { profile, isManager } = useAuth()
  const [tab, setTab] = useState('open') // 'mine' | 'open'
  const [myRequests, setMyRequests] = useState([])
  const [openRequests, setOpenRequests] = useState([])
  const [slots, setSlots] = useState({})
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), reason: '' })
  const [myScheduleToday, setMyScheduleToday] = useState(null)
  const [claimingId, setClaimingId] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [slotRes, userRes, myReqRes, openReqRes] = await Promise.all([
      supabase.from('shift_slots').select('*'),
      supabase.from('users').select('id, name').eq('is_active', true),
      supabase.from('leave_requests').select('*').eq('requester_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('leave_requests').select('*, leave_claims(*)').eq('status', 'open').order('date'),
    ])

    const slotMap = {}
    slotRes.data?.forEach((s) => { slotMap[s.id] = s })
    setSlots(slotMap)

    const userMap = {}
    userRes.data?.forEach((u) => { userMap[u.id] = u })
    setUsers(userMap)

    setMyRequests(myReqRes.data || [])

    // Filter open requests where current user hasn't claimed yet
    const filtered = (openReqRes.data || []).filter(
      (r) => r.requester_id !== profile.id
    )
    setOpenRequests(filtered)

    setLoading(false)
  }, [profile])

  useEffect(() => { loadData() }, [loadData])

  // Check if user has a duty on selected date
  const checkMySchedule = async (date) => {
    const { data } = await supabase
      .from('schedule')
      .select('*, shift_slots(*)')
      .eq('user_id', profile.id)
      .eq('date', date)
      .eq('status', 'active')
      .maybeSingle()
    setMyScheduleToday(data)
  }

  const handleDateChange = (date) => {
    setForm((f) => ({ ...f, date }))
    checkMySchedule(date)
  }

  const handleSubmitLeave = async (e) => {
    e.preventDefault()
    if (!myScheduleToday) {
      toast.error('You must have a duty assigned on this date to request leave.')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('leave_requests').insert({
        requester_id: profile.id,
        schedule_id: myScheduleToday.id,
        date: form.date,
        reason: form.reason,
        status: 'open',
      })
      if (error) throw error
      toast.success('Leave request submitted!')
      setShowModal(false)
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), reason: '' })
      loadData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelLeave = async (id) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('requester_id', profile.id)
      if (error) throw error
      toast.success('Leave request cancelled.')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleClaimLeave = async (leaveRequestId) => {
    setClaimingId(leaveRequestId)
    try {
      // Check if user is free on that date
      const req = openRequests.find((r) => r.id === leaveRequestId)
      const { data: existing } = await supabase
        .from('schedule')
        .select('id')
        .eq('user_id', profile.id)
        .eq('date', req.date)
        .eq('status', 'active')
        .maybeSingle()

      if (existing) {
        toast.error('You have a shift on that date. You can only claim if you are free.')
        return
      }

      const { error } = await supabase.from('leave_claims').insert({
        leave_request_id: leaveRequestId,
        claimant_id: profile.id,
      })
      if (error) throw error

      // Manager auto-accepts (simplified: manager accepts from their panel)
      toast.success('Claim submitted! Waiting for acceptance.')
      loadData()
    } catch (err) {
      if (err.code === '23505') {
        toast.error('You already claimed this request.')
      } else {
        toast.error(err.message)
      }
    } finally {
      setClaimingId(null)
    }
  }

  const handleAcceptClaim = async (claimId, leaveRequestId) => {
    try {
      const { error } = await supabase
        .from('leave_claims')
        .update({ status: 'accepted' })
        .eq('id', claimId)
      if (error) throw error
      toast.success('Claim accepted! Schedule updated.')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRejectClaim = async (claimId) => {
    try {
      await supabase.from('leave_claims').update({ status: 'rejected' }).eq('id', claimId)
      toast.success('Claim rejected.')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Leaves</h1>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => { setShowModal(true); checkMySchedule(form.date) }}
        >
          Request Leave
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-5">
        {[
          { id: 'open', label: `Open Slots (${openRequests.length})` },
          { id: 'mine', label: 'My Requests' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === 'open' ? (
            <motion.div key="open" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
              {openRequests.length === 0 ? (
                <EmptyState icon={CheckCircle} title="No open leave slots" description="When a staff requests leave, it will appear here for you to claim." />
              ) : (
                openRequests.map((req) => {
                  const requester = users[req.requester_id]
                  const myClaim = req.leave_claims?.find((c) => c.claimant_id === profile.id)
                  const allClaims = req.leave_claims || []

                  return (
                    <Card key={req.id} className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {formatDate(req.date, 'EEE, MMM d yyyy')}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Requested by <span className="font-medium text-slate-600 dark:text-slate-300">{requester?.name || 'Unknown'}</span>
                          </p>
                          {req.reason && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{req.reason}"</p>
                          )}
                        </div>
                        <Badge className={STATUS_COLORS[req.status]}>{req.status}</Badge>
                      </div>

                      {/* Claims (visible to manager) */}
                      {isManager && allClaims.length > 0 && (
                        <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-2.5">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Claims ({allClaims.length})</p>
                          {allClaims.map((claim) => (
                            <div key={claim.id} className="flex items-center justify-between">
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                {users[claim.claimant_id]?.name || 'Unknown'}
                              </span>
                              {claim.status === 'pending' ? (
                                <div className="flex gap-1.5">
                                  <button onClick={() => handleAcceptClaim(claim.id, req.id)} className="text-xs text-green-600 font-medium hover:underline">Accept</button>
                                  <button onClick={() => handleRejectClaim(claim.id)} className="text-xs text-red-500 font-medium hover:underline">Reject</button>
                                </div>
                              ) : (
                                <Badge className={STATUS_COLORS[claim.status]}>{claim.status}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Claim button for regular staff */}
                      {!isManager && (
                        myClaim ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary-500" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Your claim is <span className="font-medium">{myClaim.status}</span>
                            </span>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={claimingId === req.id}
                            onClick={() => handleClaimLeave(req.id)}
                            className="w-full justify-center"
                          >
                            Claim This Slot
                          </Button>
                        )
                      )}
                    </Card>
                  )
                })
              )}
            </motion.div>
          ) : (
            <motion.div key="mine" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
              {myRequests.length === 0 ? (
                <EmptyState icon={AlertCircle} title="No leave requests yet" description="Request leave when you need a day off." />
              ) : (
                myRequests.map((req) => (
                  <Card key={req.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {formatDate(req.date, 'EEE, MMM d yyyy')}
                        </p>
                        {req.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">"{req.reason}"</p>}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatDate(req.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={STATUS_COLORS[req.status]}>{req.status}</Badge>
                        {req.status === 'open' && (
                          <button onClick={() => handleCancelLeave(req.id)} className="text-xs text-red-500 hover:underline">Cancel</button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Submit Leave Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Leave">
        <form onSubmit={handleSubmitLeave} className="space-y-4">
          <div>
            <label className="form-label">Date</label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange(e.target.value)}
              required
            />
          </div>

          {myScheduleToday !== undefined && (
            myScheduleToday ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>You have a duty on this date (eligible)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>No duty assigned on this date</span>
              </div>
            )
          )}

          <Textarea
            label="Reason (optional)"
            placeholder="Brief reason for leave request..."
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 justify-center" loading={submitting} disabled={!myScheduleToday}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
