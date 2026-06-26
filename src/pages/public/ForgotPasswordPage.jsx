import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your email')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface px-6">
      <div className="flex items-center gap-3 pt-14 mb-10">
        <Link to="/login" className="p-2 -ml-2 text-on-surface-variant"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center"><Clock className="w-4 h-4 text-white" strokeWidth={2.5} /></div>
          <span className="text-title-lg font-semibold text-on-surface">DutyDesk</span>
        </div>
      </div>

      {sent ? (
        <div className="flex flex-col items-center text-center py-12">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-headline-md text-on-surface mb-3">Check your email</h2>
          <p className="text-body-lg text-on-surface-variant mb-8">We've sent a password reset link to <strong>{email}</strong></p>
          <Link to="/login" className="btn-primary block w-full">Back to Login</Link>
        </div>
      ) : (
        <>
          <h1 className="text-headline-lg text-on-surface mb-2">Forgot password?</h1>
          <p className="text-body-lg text-on-surface-variant mb-8">Enter your email and we'll send you a reset link</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className="input-base" autoComplete="email" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send reset link'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
