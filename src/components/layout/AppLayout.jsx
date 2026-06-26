import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { Home, Calendar, ArrowLeftRight, Bell, User, ChevronLeft, Settings, MessageSquare } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { useBrand } from '../../context/BrandContext'

export function AppLayout({ children, title, showBack, rightAction }) {
  const { brandId } = useParams()
  const navigate = useNavigate()
  const { unreadCount } = useNotifications() || {}
  const { isManager, brandSettings } = useBrand()

  const navItems = [
    { to: `/${brandId}`, icon: Home, label: 'Home', end: true },
    { to: `/${brandId}/calendar`, icon: Calendar, label: 'Calendar' },
    brandSettings?.enable_chat !== false ? { to: `/${brandId}/chat`, icon: MessageSquare, label: 'Chat' } : null,
    { to: `/${brandId}/leaves`, icon: ArrowLeftRight, label: 'Requests' },
    { to: `/${brandId}/notifications`, icon: Bell, label: 'Alerts', badge: unreadCount },
  ].filter(Boolean)

  return (
    <div className="flex flex-col min-h-dvh bg-surface">
      {/* Header */}
      <header className="bg-white border-b border-outline-variant sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-3 px-4 h-14">
          {showBack && (
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-md text-on-surface-variant hover:bg-surface-container transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="flex-1 text-title-lg text-on-surface font-semibold truncate">{title}</h1>
          {isManager && (
            <NavLink to={`/${brandId}/manage/staffs`} className={({ isActive }) => `p-2 rounded-md transition-colors ${isActive ? 'bg-primary-50 text-primary-500' : 'text-on-surface-variant hover:bg-surface-container'}`}>
              <Settings className="w-5 h-5" />
            </NavLink>
          )}
          <NavLink to={`/${brandId}/profile`} className={({ isActive }) => `p-2 rounded-md transition-colors ${isActive ? 'bg-primary-50 text-primary-500' : 'text-on-surface-variant hover:bg-surface-container'}`}>
            <User className="w-5 h-5" />
          </NavLink>
          {rightAction}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-outline-variant z-40 safe-bottom">
        <div className="flex items-center justify-around px-2 h-16">
          {navItems.map(({ to, icon: Icon, label, badge, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-6 h-6 ${isActive ? 'fill-primary-100' : ''}`} strokeWidth={isActive ? 2.5 : 1.5} />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-label-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
