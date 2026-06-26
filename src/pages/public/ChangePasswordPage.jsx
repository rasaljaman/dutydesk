import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ChangePasswordPage() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const isValid = password.length >= 8 && password === confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    try {
      // 1. Update password in Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({ password })
      if (authErr) throw authErr

      // 2. Clear must_change_password flag
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', session.user.id)

      if (profileErr) throw profileErr

      await refreshProfile()
      toast.success('Password updated successfully')

      // 3. Check if email verification is needed
      if (!profile.email_verified && profile.added_to_brand_directly) {
        navigate('/verify-email')
      } else {
        navigate('/brands')
      }

    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-6 h-6 text-primary-600" />
        </div>
        
        <h1 className="text-headline-md text-on-surface mb-2">Change your password</h1>
        <p className="text-body-lg text-on-surface-variant mb-8">
          For security reasons, you must set a new password before you can continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">New Password *</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Min. 8 characters" 
                className="input-base pr-12"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {password && password.length < 8 && (
              <p className="text-red-500 text-label-sm mt-1">Minimum 8 characters required</p>
            )}
          </div>

          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Confirm New Password *</label>
            <div className="relative">
              <input 
                type={showConfirm ? 'text' : 'password'} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="Confirm password" 
                className="input-base pr-12"
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-500 text-label-sm mt-1">Passwords do not match</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={!isValid || loading} 
            className="btn-primary w-full py-4 mt-8"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
