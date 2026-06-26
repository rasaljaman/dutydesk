import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Users, ChevronLeft, MoreVertical, UserMinus, Shield, UserX, UserPlus, Calendar, Clock, Star, Link2, Settings, Layers, BarChart3 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { useBrand } from '../../context/BrandContext'
import toast from 'react-hot-toast'

export default function ManageStaffsPage() {
  const { brandId } = useParams()
  const navigate = useNavigate()
  const { currentBrand } = useBrand()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const fetchMembers = async () => {
    setLoading(true)
    const { data } = await supabase.from('brand_members').select('*, profiles(id, name, username, email, avatar_url)').eq('brand_id', brandId).eq('is_active', true).order('joined_at')
    setMembers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  const updateRole = async (memberId, role) => {
    const { error } = await supabase.from('brand_members').update({ role }).eq('id', memberId)
    if (error) return toast.error(error.message)
    toast.success('Role updated')
    setSelected(null)
    fetchMembers()
  }

  const removeMember = async (memberId) => {
    const { error } = await supabase.from('brand_members').update({ is_active: false }).eq('id', memberId)
    if (error) return toast.error(error.message)
    toast.success('Member removed')
    setSelected(null)
    fetchMembers()
  }

  const roleColors = { manager: 'chip-filled', permanent: 'chip-active', temp: 'chip-pending' }

  const manageLinks = [
    { to: `/${brandId}/manage/schedule`, icon: Calendar, label: 'Schedule', color: 'bg-primary-50 text-primary-500' },
    { to: `/${brandId}/manage/shifts`, icon: Clock, label: 'Shifts', color: 'bg-emerald-50 text-emerald-600' },
    { to: `/${brandId}/manage/templates`, icon: Layers, label: 'Templates', color: 'bg-blue-50 text-blue-600' },
    { to: `/${brandId}/manage/analytics`, icon: BarChart3, label: 'Analytics', color: 'bg-indigo-50 text-indigo-600' },
    { to: `/${brandId}/manage/special-days`, icon: Star, label: 'Special Days', color: 'bg-amber-50 text-amber-600' },
    { to: `/${brandId}/manage/invite`, icon: Link2, label: 'Invites', color: 'bg-violet-50 text-violet-600' },
    { to: `/${brandId}/manage/settings`, icon: Settings, label: 'Settings', color: 'bg-gray-100 text-gray-600' },
  ]

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(`/${brandId}`)} className="p-1 -ml-1 text-on-surface-variant"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Manage</h1>
          <span className="chip chip-active mr-1">{members.length}</span>
          <button onClick={() => navigate(`/${brandId}/manage/invite`)} className="btn-primary py-1 px-3 text-body-md font-semibold gap-1.5 h-9 rounded-lg flex items-center shadow-sm">
            <UserPlus className="w-4 h-4" /> Invite
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Manager Quick Links */}
        <div className="grid grid-cols-3 gap-2">
          {manageLinks.map(({ to, icon: Icon, label, color }) => (
            <button key={to} onClick={() => navigate(to)} className="card flex flex-col items-center gap-2 py-3 hover:border-primary-300 transition-all">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-label-md font-semibold text-on-surface">{label}</span>
            </button>
          ))}
        </div>

        {/* Staff list */}
        <h3 className="text-title-lg text-on-surface">Staff Members</h3>
        {loading ? <LoadingSkeleton rows={4} /> : members.length === 0 ? (
          <EmptyState icon={Users} title="No staff yet" description="Invite staff via the invite link." />
        ) : members.map(member => (
          <div key={member.id} className="card flex items-center gap-3">
            <Avatar name={member.profiles?.name} avatarUrl={member.profiles?.avatar_url} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-body-lg font-semibold text-on-surface truncate">{member.profiles?.name}</p>
              <p className="text-body-md text-on-surface-variant">@{member.profiles?.username}</p>
            </div>
            <span className={`chip ${roleColors[member.role]}`}>{member.role}</span>
            <button onClick={() => setSelected(member)} className="p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg"><MoreVertical className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.profiles?.name}>
        <div className="space-y-2">
          <p className="text-body-md text-on-surface-variant mb-4">@{selected?.profiles?.username} · Current role: <strong>{selected?.role}</strong></p>
          {['manager', 'permanent', 'temp'].filter(r => r !== selected?.role).map(role => (
            <button key={role} onClick={() => updateRole(selected.id, role)} className="w-full flex items-center gap-3 p-3 rounded-lg text-on-surface hover:bg-surface-container transition-colors text-body-lg">
              <Shield className="w-5 h-5 text-primary-500" /> Make {role}
            </button>
          ))}
          <div className="border-t border-outline-variant pt-2 mt-2">
            <button onClick={() => removeMember(selected.id)} className="w-full flex items-center gap-3 p-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors text-body-lg">
              <UserMinus className="w-5 h-5" /> Remove from brand
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
