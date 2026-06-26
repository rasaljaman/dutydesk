import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Repeat2, Check, X, Trash2 } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { Avatar } from '../../components/ui/Avatar'
import { ShiftBadge } from '../../components/ui/ShiftBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useSwaps } from '../../hooks/useSwaps'
import { useRealtime } from '../../hooks/useRealtime'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const tabs = ['Pending', 'All']
const statusColors = { pending: 'chip-pending', accepted: 'chip-active', rejected: 'chip-rejected', cancelled: 'chip-rejected', auto_cancelled: 'chip-rejected', removed_by_manager: 'chip-rejected' }

export default function SwapsPage() {
  const { user } = useAuth()
  const { isManager, brandSettings } = useBrand()
  const { swaps, loading, fetchSwaps, cancelSwap, rejectSwap, acceptSwap, removeSwap } = useSwaps()
  const [activeTab, setActiveTab] = useState('Pending')

  useEffect(() => { fetchSwaps() }, [])
  useRealtime({ onSwapChange: fetchSwaps })

  const filtered = swaps.filter(s => activeTab === 'Pending' ? s.status === 'pending' : true)

  const handleAccept = async (id) => {
    try { await acceptSwap(id); toast.success('Swap accepted!'); fetchSwaps() } catch (e) { toast.error(e.message) }
  }
  const handleReject = async (id) => {
    try { await rejectSwap(id); toast.success('Swap rejected'); fetchSwaps() } catch (e) { toast.error(e.message) }
  }
  const handleCancel = async (id) => {
    try { await cancelSwap(id); toast.success('Request cancelled'); fetchSwaps() } catch (e) { toast.error(e.message) }
  }
  const handleRemove = async (id) => {
    try { await removeSwap(id); toast.success('Swap removed'); fetchSwaps() } catch (e) { toast.error(e.message) }
  }

  if (!brandSettings?.enable_shift_swap) return (
    <AppLayout title="Shift Swaps">
      <EmptyState icon={Repeat2} title="Swaps disabled" description="The manager has disabled shift swaps for this brand." />
    </AppLayout>
  )

  return (
    <AppLayout title="Shift Swaps">
      <div className="flex gap-1 px-4 pt-4 pb-2">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-body-md font-semibold transition-all ${activeTab === tab ? 'bg-primary-500 text-white' : 'bg-surface-container text-on-surface-variant'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {loading ? <LoadingSkeleton rows={3} /> : filtered.length === 0 ? (
          <EmptyState icon={Repeat2} title="No swap requests" description="No swap requests found." />
        ) : filtered.map(swap => {
          const isMine = swap.requester_id === user?.id
          const isTarget = swap.target_id === user?.id
          return (
            <div key={swap.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-body-md text-on-surface-variant">{format(new Date(swap.date), 'EEE, MMM d')}</p>
                <span className={`chip ${statusColors[swap.status] || 'chip-pending'}`}>{swap.status.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex flex-col items-center gap-2 p-3 bg-surface-container rounded-lg">
                  <Avatar name={swap.requester?.name} avatarUrl={swap.requester?.avatar_url} size="md" />
                  <p className="text-body-md font-medium text-on-surface text-center">{swap.requester?.name}</p>
                  {swap.requester_slot && <ShiftBadge slot={swap.requester_slot} size="sm" />}
                </div>
                <Repeat2 className="w-5 h-5 text-outline flex-shrink-0" />
                <div className="flex-1 flex flex-col items-center gap-2 p-3 bg-surface-container rounded-lg">
                  <Avatar name={swap.target?.name} avatarUrl={swap.target?.avatar_url} size="md" />
                  <p className="text-body-md font-medium text-on-surface text-center">{swap.target?.name}</p>
                  {swap.target_slot && <ShiftBadge slot={swap.target_slot} size="sm" />}
                </div>
              </div>
              {/* Actions */}
              {swap.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  {isTarget && (
                    <>
                      <button onClick={() => handleReject(swap.id)} className="btn-secondary py-2 px-4 text-body-md flex-1"><X className="w-4 h-4" /> Decline</button>
                      <button onClick={() => handleAccept(swap.id)} className="btn-primary py-2 px-4 text-body-md flex-1"><Check className="w-4 h-4" /> Accept</button>
                    </>
                  )}
                  {isMine && (
                    <button onClick={() => handleCancel(swap.id)} className="btn-secondary py-2 px-4 text-body-md flex-1"><X className="w-4 h-4" /> Cancel</button>
                  )}
                </div>
              )}
              {swap.status === 'accepted' && isManager && (
                <div className="mt-3">
                  <button onClick={() => handleRemove(swap.id)} className="btn-secondary py-2 px-4 text-body-md w-full text-red-500 border-red-300"><Trash2 className="w-4 h-4" /> Remove Swap</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
