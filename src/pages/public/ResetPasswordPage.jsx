import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabase sets the session automatically from the URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Ready to reset
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password || !confirm) return toast.error('Please fill in both fields')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      
      // Clear the must_change_password flag if logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await supabase.from('profiles').update({ must_change_password: false }).eq('id', session.user.id)
      }

      setDone(true)
      setTimeout(() => navigate('/brands'), 2000)
    } catch (err) {
      toast.error(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface px-6 text-center">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-headline-md text-on-surface mb-3">Password Updated!</h2>
      <p className="text-body-lg text-on-surface-variant">Redirecting you to DutyDesk…</p>
    </div>
  )

  return (
    <div className="min-h-dvh flex flex-col bg-surface px-6">
      <div className="flex items-center gap-3 pt-14 mb-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-title-lg font-semibold text-on-surface">DutyDesk</span>
        </div>
      </div>

      <h1 className="text-headline-lg text-on-surface mb-2">Set new password</h1>
      <p className="text-body-lg text-on-surface-variant mb-8">Choose a strong password for your account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="input-base pr-12"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            className="input-base"
            autoComplete="new-password"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
