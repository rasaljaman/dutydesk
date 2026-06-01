import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { AppLayout } from './components/layout/AppLayout'

// Auth pages
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import Verify from './pages/auth/Verify'

// App pages
import Dashboard from './pages/dashboard/Dashboard'
import CalendarPage from './pages/calendar/Calendar'
import Schedule from './pages/schedule/Schedule'
import Leaves from './pages/leaves/Leaves'
import Swaps from './pages/swaps/Swaps'
import Notifications from './pages/notifications/Notifications'
import Profile from './pages/profile/Profile'

// Manager pages
import ManagerStaffs from './pages/manager/Staffs'
import ManagerShifts from './pages/manager/Shifts'
import SpecialDays from './pages/manager/SpecialDays'
import ManagerSwaps from './pages/manager/ManagerSwaps'

// Admin pages
import AdminSettings from './pages/admin/Settings'
import AdminManagers from './pages/admin/Managers'

// ── Route Guards ─────────────────────────────────────────────

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function ManagerRoute({ children }) {
  const { user, loading, isManager } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isManager) return <Navigate to="/dashboard" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center animate-pulse-soft">
          <span className="text-white font-bold text-xl">D</span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Theme Init ───────────────────────────────────────────────
function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  }, [])
  return null
}

// ── App ──────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <BrowserRouter>
      <ThemeInit />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--toast-bg, #fff)',
            color: '#1e293b',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            fontSize: '14px',
            fontWeight: 500,
          },
          success: { iconTheme: { primary: '#F59E0B', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
        <Route path="/verify" element={<ProtectedRoute><Verify /></ProtectedRoute>} />

        {/* Authenticated routes wrapped in AppLayout */}
        <Route element={
          <ProtectedRoute>
            <NotificationProvider>
              <AppLayout />
            </NotificationProvider>
          </ProtectedRoute>
        }>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/swaps" element={<Swaps />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />

          {/* Manager routes */}
          <Route path="/manager/staffs" element={<ManagerRoute><ManagerStaffs /></ManagerRoute>} />
          <Route path="/manager/shifts" element={<ManagerRoute><ManagerShifts /></ManagerRoute>} />
          <Route path="/manager/special-days" element={<ManagerRoute><SpecialDays /></ManagerRoute>} />
          <Route path="/manager/swaps" element={<ManagerRoute><ManagerSwaps /></ManagerRoute>} />

          {/* Admin routes */}
          <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
          <Route path="/admin/managers" element={<AdminRoute><AdminManagers /></AdminRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
