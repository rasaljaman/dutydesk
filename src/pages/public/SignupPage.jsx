import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [form, setForm] = useState({ name: '', username: '', email: '', phone: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.username || !form.email || !form.password) return toast.error('Name, username, email, and password are required')
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      await signUp({ email: form.email, phone: form.phone || undefined, password: form.password, name: form.name, username: form.username.toLowerCase().replace(/\s/g, '_') })
      toast.success('Account created! Welcome to DutyDesk.')
      navigate(redirect || '/brands')
    } catch (err) {
      toast.error(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface px-6 pb-10">
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

      <h1 className="text-headline-lg text-on-surface mb-2">Create account</h1>
      <p className="text-body-lg text-on-surface-variant mb-8">Join DutyDesk to manage your shifts</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Full Name *</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder="John Smith" className="input-base" autoComplete="name" />
        </div>
        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Username *</label>
          <input type="text" value={form.username} onChange={e => update('username', e.target.value.toLowerCase())} placeholder="johnsmith" className="input-base" autoCapitalize="none" autoComplete="username" />
        </div>
        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Email *</label>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@example.com" className="input-base" autoComplete="email" />
        </div>
        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Phone <span className="text-on-surface-variant font-normal">(optional)</span></label>
          <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 555 000 0000" className="input-base" autoComplete="tel" />
        </div>
        <div>
          <label className="block text-label-md font-medium text-on-surface mb-2">Password *</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 8 characters" className="input-base pr-12" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-body-md text-on-surface-variant mt-6">
        Already have an account?{' '}
        <Link to={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-primary-500 font-semibold">Sign in</Link>
      </p>
    </div>
  )
}
