import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function VerifyEmailPage() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  
  const [method, setMethod] = useState(null) // 'link' | 'otp'
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  
  // If no profile or already verified, skip
  useEffect(() => {
    if (profile && profile.email_verified) {
      navigate('/brands')
    }
  }, [profile, navigate])

  const sendVerification = async (selectedMethod) => {
    setSending(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ method: selectedMethod })
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send verification')
      
      if (data.alreadyVerified) {
        await refreshProfile()
        navigate('/brands')
        return
      }

      setMethod(selectedMethod)
      toast.success(selectedMethod === 'link' ? 'Verification link sent!' : 'Verification code sent!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    if (otp.length < 6) return
    
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ otp_code: otp })
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Invalid code')

      toast.success('Email verified!')
      await refreshProfile()
      navigate('/brands')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        
        <h1 className="text-headline-md text-on-surface mb-3">Verify your email</h1>
        <p className="text-body-lg text-on-surface-variant mb-8">
          Please verify your email address to secure your account. You can skip this for now, but some features may be limited.
        </p>

        {!method ? (
          <div className="space-y-3">
            <button 
              onClick={() => sendVerification('link')} 
              disabled={sending}
              className="btn-primary w-full py-4"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Verification Link'}
            </button>
            
            <button 
              onClick={() => sendVerification('otp')} 
              disabled={sending}
              className="btn-secondary w-full py-4"
            >
              Send Verification Code (OTP)
            </button>
            
            <button 
              onClick={() => navigate('/brands')} 
              className="btn-ghost w-full py-4 mt-4"
            >
              Skip for now
            </button>
          </div>
        ) : method === 'otp' ? (
          <form onSubmit={verifyOtp} className="space-y-4 text-left">
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Enter 6-digit code</label>
              <input 
                type="text" 
                value={otp} 
                onChange={e => setOtp(e.target.value.replace(/\\D/g, '').slice(0, 6))} 
                placeholder="000000" 
                className="input-base text-center text-title-lg tracking-widest"
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={otp.length !== 6 || loading} 
              className="btn-primary w-full py-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify Code'}
            </button>
            
            <button 
              type="button"
              onClick={() => setMethod(null)} 
              className="btn-ghost w-full py-2 mt-2"
            >
              Go Back
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-body-md text-emerald-800">
                We've sent a verification link to your email. Please check your inbox and click the link to verify.
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/brands')} 
              className="btn-primary w-full py-4 flex justify-center gap-2"
            >
              Continue to App <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
