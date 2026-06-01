import { useState, useEffect } from 'react'
import { Shield, UserMinus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, Button, Avatar, Badge, EmptyState, Skeleton } from '../../components/ui'
import { ROLE_COLORS, ROLE_LABELS } from '../../lib/helpers'
import toast from 'react-hot-toast'

export default function AdminManagers() {
  const { profile } = useAuth()
  const [managers, setManagers] = useState([])
  const [permanentStaffs, setPermanentStaffs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').eq('is_active', true).order('name')
    setManagers((data || []).filter((u) => u.role === 'manager'))
    setPermanentStaffs((data || []).filter((u) => u.role === 'permanent'))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const promote = async (userId, name) => {
    try {
      await supabase.from('users').update({ role: 'manager' }).eq('id', userId)
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Role Upgraded',
        message: 'You have been promoted to Manager.',
        type: 'system',
      })
      toast.success(`${name} is now a Manager!`)
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const demote = async (userId, name) => {
    try {
      await supabase.from('users').update({ role: 'permanent' }).eq('id', userId)
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Role Changed',
        message: 'Your Manager role has been removed.',
        type: 'system',
      })
      toast.success(`${name}'s manager role removed.`)
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="page-container max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Manager Accounts</h1>

      <div className="mb-8">
        <h2 className="section-title mb-3">Current Managers</h2>
        {loading ? (
          <Skeleton className="h-32" />
        ) : managers.length === 0 ? (
          <EmptyState icon={Shield} title="No managers yet" description="Promote a permanent staff member to manager below." />
        ) : (
          <div className="space-y-2">
            {managers.map((m) => (
              <Card key={m.id} className="flex items-center gap-3">
                <Avatar name={m.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.email}</p>
                </div>
                <Badge className={ROLE_COLORS.manager}>Manager</Badge>
                {m.id !== profile?.id && (
                  <Button variant="ghost" size="sm" icon={UserMinus} onClick={() => demote(m.id, m.name)}>
                    Demote
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="section-title mb-3">Promote to Manager</h2>
        {permanentStaffs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No permanent staff available to promote.</p>
        ) : (
          <div className="space-y-2">
            {permanentStaffs.map((s) => (
              <Card key={s.id} className="flex items-center gap-3">
                <Avatar name={s.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.email}</p>
                </div>
                <Button variant="secondary" size="sm" icon={Shield} onClick={() => promote(s.id, s.name)}>
                  Make Manager
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
