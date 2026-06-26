import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">D</span>
        </div>
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (profile?.must_change_password && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />
  }
  return children
}
