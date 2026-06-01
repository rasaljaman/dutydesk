import { motion } from 'framer-motion'
import { format, isToday, isYesterday } from 'date-fns'
import { Bell, CheckCheck, ArrowLeftRight, Users, Settings, Repeat } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { Button, EmptyState } from '../../components/ui'

const TYPE_ICONS = {
  leave: Users,
  swap: ArrowLeftRight,
  shift_change: Repeat,
  system: Settings,
}

const TYPE_COLORS = {
  leave: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  swap: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  shift_change: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  system: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
}

function groupNotificationsByDate(notifications) {
  const groups = {}
  notifications.forEach((n) => {
    const d = format(new Date(n.created_at), 'yyyy-MM-dd')
    if (!groups[d]) groups[d] = []
    groups[d].push(n)
  })
  return groups
}

function dateLabel(dateStr) {
  const d = new Date(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const groups = groupNotificationsByDate(notifications)

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" icon={CheckCheck} onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="All caught up!" description="You have no notifications yet." />
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                {dateLabel(date)}
              </p>
              <div className="space-y-2">
                {items.map((n) => {
                  const Icon = TYPE_ICONS[n.type] || Bell
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        n.is_read
                          ? 'bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${TYPE_COLORS[n.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${n.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">
                          {format(new Date(n.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
