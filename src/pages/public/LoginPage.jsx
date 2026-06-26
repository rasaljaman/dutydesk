import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)


  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier || !password) return toast.error('Please fill in all fields')
    setLoading(true)
    try {
      const { user } = await signIn({ identifier: identifier.trim(), password })
      // Fetch profile to check if password change is required
      const { data: profile } = await supabase.from('profiles').select('must_change_password').eq('id', user.id).single()
      
      if (profile?.must_change_password) {
        navigate('/change-password')
      } else {
        navigate(redirect || '/brands')
      }
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface px-6">
      <div className="flex items-center gap-3 pt-14 mb-10">
        <Link to="/" className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-title-lg font-semibold text-on-surface">DutyDesk</span>
        </div>
      </div>

      <h1 className="text-headline-lg text-on-surface mb-2">Welcome back</h1>
      <p className="text-body-lg text-on-surface-variant mb-8">Sign in with your email, phone, or username</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Email / Phone / Username</label>
          <input
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="john@example.com"
            className="input-base"
            autoComplete="username"
            autoCapitalize="none"
          />
        </div>

        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-base pr-12"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-primary-500 text-body-md font-medium">Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-body-md text-on-surface-variant mt-6">
        Don't have an account?{' '}
        <Link to={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-primary-500 font-semibold">Sign up</Link>
      </p>
    </div>
  )
}
