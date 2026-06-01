import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Shield, UserMinus, Clock, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, Modal, Button, Input, Select, Avatar, Badge, EmptyState, Skeleton } from '../../components/ui'
import { ROLE_LABELS, ROLE_COLORS, formatCountdown } from '../../lib/helpers'
import toast from 'react-hot-toast'

export default function ManagerStaffs() {
  const { profile } = useAuth()
  const [staffs, setStaffs] = useState([])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', username: '', phone: '', role: 'permanent', tempPassword: '' })
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null) // id being deleted with countdown
  const [deleteCountdown, setDeleteCountdown] = useState(null) // ms remaining
  const [deleteIntervalRef, setDeleteIntervalRef] = useState(null)
  const [deletionDelayMs, setDeletionDelayMs] = useState(10 * 60 * 1000) // default 10 min
  const [roleChangeModal, setRoleChangeModal] = useState(null) // { user, newRole }

  const loadData = useCallback(async () => {
    setLoading(true)
    const [staffRes, slotRes, settingsRes] = await Promise.all([
      supabase.from('users').select('*').order('name'),
      supabase.from('shift_slots').select('*'),
      supabase.from('system_settings').select('*').eq('key', 'deletion_delay_minutes').single(),
    ])
    setStaffs(staffRes.data || [])
    setSlots(slotRes.data || [])
    if (settingsRes.data) {
      setDeletionDelayMs(parseInt(settingsRes.data.value, 10) * 60 * 1000)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAddStaff = async (e) => {
    e.preventDefault()
    setAdding(true)
    try {
      // Create auth user via Supabase Admin (using service role not available from client)
      // Instead, use signUp which sends confirmation email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: addForm.email,
        password: addForm.tempPassword,
        options: {
          data: {
            name: addForm.name,
            username: addForm.username,
            role: addForm.role,
            must_change_password: true,
          },
        },
      })
      if (authError) throw authError

      // Manually upsert the users table with extra info
      if (authData.user) {
        await supabase.from('users').upsert({
          id: authData.user.id,
          name: addForm.name,
          email: addForm.email,
          username: addForm.username,
          phone: addForm.phone || null,
          role: addForm.role,
          must_change_password: true,
        })
      }

      toast.success(`${addForm.name} added! They'll receive an email to verify.`)
      setShowAddModal(false)
      setAddForm({ name: '', email: '', username: '', phone: '', role: 'permanent', tempPassword: '' })
      loadData()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const startDeleteCountdown = (staff) => {
    setDeletingId(staff.id)
    setDeleteCountdown(deletionDelayMs)

    const interval = setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev <= 1000) {
          clearInterval(interval)
          executeDelete(staff.id)
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    setDeleteIntervalRef(interval)
  }

  const cancelDelete = () => {
    if (deleteIntervalRef) clearInterval(deleteIntervalRef)
    setDeletingId(null)
    setDeleteCountdown(null)
    setDeleteIntervalRef(null)
    toast('Staff removal cancelled.')
  }

  const executeDelete = async (id) => {
    try {
      await supabase.from('users').update({ is_active: false }).eq('id', id)
      toast.success('Staff member removed.')
      setDeletingId(null)
      setDeleteCountdown(null)
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRoleChange = async () => {
    if (!roleChangeModal) return
    try {
      await supabase.from('users').update({ role: roleChangeModal.newRole }).eq('id', roleChangeModal.user.id)
      // Notify the user
      await supabase.from('notifications').insert({
        user_id: roleChangeModal.user.id,
        title: 'Role Changed',
        message: `Your role has been changed to ${ROLE_LABELS[roleChangeModal.newRole]}.`,
        type: 'system',
      })
      toast.success(`${roleChangeModal.user.name}'s role updated to ${ROLE_LABELS[roleChangeModal.newRole]}`)
      setRoleChangeModal(null)
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Staff Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{staffs.filter((s) => s.is_active).length} active staff members</p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>Add Staff</Button>
      </div>

      {/* Delete countdown banner */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Removing staff member...</p>
                <p className="text-xs text-red-500">Auto-removes in {formatCountdown(deleteCountdown || 0)}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={cancelDelete} icon={X}>Cancel</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-3">
          {staffs.filter((s) => s.is_active).map((staff) => (
            <Card key={staff.id} className={staff.id === deletingId ? 'opacity-50 border-red-300' : ''}>
              <div className="flex items-center gap-3">
                <Avatar name={staff.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{staff.name}</p>
                    {staff.id === profile?.id && (
                      <span className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">You</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{staff.email}</p>
                </div>
                <Badge className={ROLE_COLORS[staff.role]}>{ROLE_LABELS[staff.role]}</Badge>

                {/* Actions */}
                {staff.id !== profile?.id && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setRoleChangeModal({ user: staff, newRole: staff.role })}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-purple-600 transition-colors"
                      title="Change role"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => startDeleteCountdown(staff)}
                      disabled={!!deletingId}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
                      title="Remove staff"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Staff" size="lg">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Full Name" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="Username" value={addForm.username} onChange={(e) => setAddForm((f) => ({ ...f, username: e.target.value }))} placeholder="e.g. john123" required />
          </div>
          <Input label="Email" type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} required />
          <Input label="Phone (optional)" type="tel" value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
          <Select label="Role" value={addForm.role} onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="permanent">Permanent Staff</option>
            <option value="temp">Temporary Staff</option>
            <option value="manager">Manager</option>
          </Select>
          <div>
            <Input label="Temporary Password" type="password" value={addForm.tempPassword} onChange={(e) => setAddForm((f) => ({ ...f, tempPassword: e.target.value }))} placeholder="Min 8 characters" required minLength={8} />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Staff must change this on first login.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 justify-center" loading={adding}>Add Staff</Button>
          </div>
        </form>
      </Modal>

      {/* Role Change Modal */}
      <Modal isOpen={!!roleChangeModal} onClose={() => setRoleChangeModal(null)} title={`Change Role — ${roleChangeModal?.user?.name}`}>
        {roleChangeModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Current role: <Badge className={ROLE_COLORS[roleChangeModal.user.role]}>{ROLE_LABELS[roleChangeModal.user.role]}</Badge>
            </p>
            <Select
              label="New Role"
              value={roleChangeModal.newRole}
              onChange={(e) => setRoleChangeModal((m) => ({ ...m, newRole: e.target.value }))}
            >
              <option value="temp">Temporary Staff</option>
              <option value="permanent">Permanent Staff</option>
              <option value="manager">Manager</option>
            </Select>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 justify-center" onClick={() => setRoleChangeModal(null)}>Cancel</Button>
              <Button variant="primary" className="flex-1 justify-center" onClick={handleRoleChange}>Confirm Change</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
