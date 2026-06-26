import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Info, Eye, EyeOff, Loader2, CheckCircle, Copy } from 'lucide-react'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { AppLayout } from '../../components/layout/AppLayout'
import { BottomSheet } from '../../components/ui/BottomSheet'

export default function AddStaffPage() {
  const { brandId } = useParams()
  const navigate = useNavigate()
  const { currentBrand, brandSettings } = useBrand()
  const { session } = useAuth()
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'permanent',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState(null) // { email, password, name }

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const isValid = 
    form.name.length >= 2 &&
    form.email.includes('@') &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          brand_id: brandId,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          role: form.role,
          temp_password: form.password
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add staff')
      }

      setSuccessData({
        name: form.name,
        email: form.email.toLowerCase(),
        password: form.password
      })

    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied!`)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(`/${brandId}/manage/staffs`)} className="p-1 -ml-1 text-on-surface-variant">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Add Staff</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-body-md text-indigo-900">
            Staff will receive no email when added. Share their email and temporary password with them directly. They will be asked to verify their email and change their password on first login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Full Name *</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={e => update('name', e.target.value)} 
              placeholder="e.g. Ahmed Riyaz" 
              className="input-base" 
              required
            />
          </div>

          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Email Address *</label>
            <input 
              type="email" 
              value={form.email} 
              onChange={e => update('email', e.target.value.toLowerCase())} 
              placeholder="email@example.com" 
              className="input-base"
              autoCapitalize="none"
              required
            />
          </div>

          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Phone Number <span className="text-on-surface-variant font-normal">(Optional)</span></label>
            <input 
              type="tel" 
              value={form.phone} 
              onChange={e => update('phone', e.target.value)} 
              placeholder="+91 9876543210" 
              className="input-base" 
            />
          </div>

          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Role</label>
            <div className="flex p-1 bg-surface-container rounded-lg">
              <button
                type="button"
                onClick={() => update('role', 'permanent')}
                className={`flex-1 py-1.5 text-label-md font-medium rounded-md transition-colors ${
                  form.role === 'permanent' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}
              >
                Permanent Staff
              </button>
              {brandSettings?.enable_temp_staff && (
                <button
                  type="button"
                  onClick={() => update('role', 'temp')}
                  className={`flex-1 py-1.5 text-label-md font-medium rounded-md transition-colors ${
                    form.role === 'temp' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  Temp Staff
                </button>
              )}
            </div>
          </div>

          <div className="h-px bg-outline-variant my-2" />

          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Temporary Password *</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={form.password} 
                onChange={e => update('password', e.target.value)} 
                placeholder="Min. 8 characters" 
                className="input-base pr-12"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {form.password && form.password.length < 8 && (
              <p className="text-red-500 text-label-sm mt-1">Minimum 8 characters required</p>
            )}
            <p className="text-body-sm text-on-surface-variant mt-2">
              Share this password directly with the staff member. They must change it on first login.
            </p>
          </div>

          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Confirm Password *</label>
            <div className="relative">
              <input 
                type={showConfirm ? 'text' : 'password'} 
                value={form.confirmPassword} 
                onChange={e => update('confirmPassword', e.target.value)} 
                placeholder="Confirm temporary password" 
                className="input-base pr-12"
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-red-500 text-label-sm mt-1">Passwords do not match</p>
            )}
          </div>
        </form>

        <button 
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="btn-primary w-full py-4 mt-6"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Staff Member'}
        </button>
      </div>

      <BottomSheet isOpen={!!successData} onClose={() => {}} snapPoints={[0.8]}>
        {successData && (
          <div className="px-4 pb-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-headline-md text-on-surface mb-2">Staff Added!</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              {successData.name} has been added to your team.
            </p>

            <div className="w-full card bg-surface-container border-0 mb-6 text-left">
              <h3 className="text-label-md font-semibold text-on-surface mb-3">Share these login details:</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-label-sm text-on-surface-variant mb-1">Email</p>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-outline-variant">
                    <span className="text-body-lg text-on-surface font-medium">{successData.email}</span>
                    <button onClick={() => copyToClipboard(successData.email, 'Email')} className="p-2 -mr-2 text-primary-600">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <p className="text-label-sm text-on-surface-variant mb-1">Temporary Password</p>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-outline-variant">
                    <span className="text-body-lg text-on-surface font-mono tracking-widest">
                      {showPassword ? successData.password : '••••••••'}
                    </span>
                    <div className="flex items-center gap-1 -mr-2">
                      <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-outline hover:text-on-surface">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => copyToClipboard(successData.password, 'Password')} className="p-2 text-primary-600">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-label-sm text-amber-900">
                  Share these securely. The staff member must change their password on first login.
                </p>
              </div>
            </div>

            <button 
              onClick={() => navigate(`/${brandId}/manage/staffs`)} 
              className="btn-primary w-full mb-3"
            >
              Done
            </button>
            <button 
              onClick={() => {
                setForm({ name: '', email: '', phone: '', role: 'permanent', password: '', confirmPassword: '' })
                setSuccessData(null)
              }} 
              className="btn-ghost w-full"
            >
              Add Another
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
