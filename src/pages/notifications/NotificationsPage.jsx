import { useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Bell, Check, CheckCheck, ArrowLeftRight, Repeat2, Calendar, Info } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { EmptyState } from '../../components/ui/EmptyState'
import { useNotifications } from '../../context/NotificationContext'
import { useRealtime } from '../../hooks/useRealtime'
import { cn } from '../../lib/utils'

const typeIcons = { leave: ArrowLeftRight, swap: Repeat2, shift_change: Calendar, invite: Bell, system: Info }
const typeColors = { leave: 'bg-amber-100 text-amber-600', swap: 'bg-primary-100 text-primary-600', shift_change: 'bg-emerald-100 text-emerald-600', invite: 'bg-violet-100 text-violet-600', system: 'bg-gray-100 text-gray-600' }

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markRead, markAllRead, unreadCount } = useNotifications() || {}
  useEffect(() => { fetchNotifications?.() }, [])
  useRealtime({ onNotification: fetchNotifications })

  return (
    <AppLayout title="Notifications" rightAction={
      unreadCount > 0 && (
        <button onClick={markAllRead} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg text-label-md font-semibold flex items-center gap-1">
          <CheckCheck className="w-4 h-4" /> All read
        </button>
      )
    }>
      <div className="px-4 py-4">
        {!notifications || notifications.length === 0 ? (
          <EmptyState icon={Bell} title="All caught up!" description="No notifications yet. You're up to date." />
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const Icon = typeIcons[n.type] || Info
              return (
                <button
                  key={n.id}
                  onClick={() => markRead?.(n.id)}
                  className={cn('w-full card flex items-start gap-3 text-left transition-all', !n.is_read && 'border-primary-200 bg-primary-50/50')}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeColors[n.type] || typeColors.system}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-body-md font-semibold text-on-surface">{n.title}</p>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-body-md text-on-surface-variant mt-0.5">{n.message}</p>
                    <p className="text-label-sm text-outline mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
