import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, ArrowLeftRight,
  Bell, UserCircle, Settings, Shield,
  ClipboardList, Star, LogOut, Menu, X, ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { Avatar } from '../ui'
import { ROLE_LABELS } from '../../lib/helpers'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/schedule', icon: ClipboardList, label: 'Schedule' },
  { to: '/leaves', icon: Users, label: 'Leaves' },
  { to: '/swaps', icon: ArrowLeftRight, label: 'Swaps' },
  { to: '/notifications', icon: Bell, label: 'Notifications', badge: true },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
]

const MANAGER_ITEMS = [
  { to: '/manager/staffs', icon: Users, label: 'Staffs' },
  { to: '/manager/shifts', icon: Star, label: 'Shift Slots' },
  { to: '/manager/special-days', icon: Calendar, label: 'Special Days' },
  { to: '/manager/swaps', icon: ArrowLeftRight, label: 'All Swaps' },
]

const ADMIN_ITEMS = [
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/managers', icon: Shield, label: 'Managers' },
]

// Bottom nav: 5 items max for mobile
const BOTTOM_NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/leaves', icon: Users, label: 'Leaves' },
  { to: '/swaps', icon: ArrowLeftRight, label: 'Swaps' },
  { to: '/notifications', icon: Bell, label: 'Alerts', badge: true },
]

function NavItem({ to, icon: Icon, label, badge, unreadCount, mobile = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        mobile
          ? `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-medium transition-colors ${
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-500 dark:text-slate-400'
            }`
          : `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
            }`
      }
    >
      <div className="relative flex-shrink-0">
        <Icon className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
        {badge && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <span className={mobile ? 'text-[10px] leading-tight mt-0.5 truncate max-w-full' : 'flex-1 truncate'}>
        {label}
      </span>
    </NavLink>
  )
}

export function Sidebar({ onClose }) {
  const { profile, isManager, isAdmin, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-100">DutyDesk</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors lg:hidden"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* User profile */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={profile?.name || ''} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {profile?.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {ROLE_LABELS[profile?.role] || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Main nav — scrollable */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 min-h-0">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} unreadCount={unreadCount} />
        ))}

        {/* Manager panel */}
        {isManager && (
          <>
            <div className="pt-4 pb-1.5 px-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                Manager
              </p>
            </div>
            {MANAGER_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}

        {/* Admin panel */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1.5 px-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                Admin
              </p>
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* Logout — fixed at bottom */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export function BottomNav() {
  const { unreadCount } = useNotifications()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-700/80 shadow-lg">
        <div className="flex items-stretch h-[58px]">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} unreadCount={unreadCount} mobile />
          ))}
        </div>
      </div>
    </nav>
  )
}

export function TopBar({ onMenuClick }) {
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-base">DutyDesk</span>
          </div>

          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 -mr-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
