import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Building2, CheckCircle, Lock, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function JoinBrandPage() {
  const { token } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('validating') // validating | valid | invalid | joining | joined
  const [brand, setBrand] = useState(null)
  const [inviteId, setInviteId] = useState(null)
  const [requiresKey, setRequiresKey] = useState(false)
  const [accessKey, setAccessKey] = useState('')

  useEffect(() => {
    if (!user) { navigate(`/login?redirect=/join/${token}`); return }
    validateInvite()
  }, [token, user])

  const validateInvite = async (key = '') => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session.access_token}` },
        body: JSON.stringify({ token, access_key: key }),
      })
      const data = await res.json()
      if (data.error === 'Invalid access key') { setStatus('valid'); setRequiresKey(true); return }
      if (data.error) { setStatus('invalid'); return }
      setBrand(data.brand)
      setInviteId(data.invite_id)
      setStatus('valid')
    } catch { setStatus('invalid') }
  }

  const handleJoin = async () => {
    if (requiresKey) { await validateInvite(accessKey); if (status !== 'valid' || !brand) return }
    setStatus('joining')
    try {
      const { error } = await supabase.from('brand_members').insert({ brand_id: brand.id, user_id: user.id, role: 'permanent', is_active: true })
      if (error && error.code === '23505') { toast('You are already a member of this brand!'); navigate(`/${brand.id}`); return }
      if (error) throw error
      setStatus('joined')
      setTimeout(() => navigate(`/${brand.id}`), 1500)
    } catch (err) {
      toast.error(err.message)
      setStatus('valid')
    }
  }

  if (status === 'validating') return (
    <div className="min-h-dvh flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="text-body-md text-on-surface-variant">Validating invite link…</p>
      </div>
    </div>
  )

  if (status === 'invalid') return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface px-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-headline-md text-on-surface mb-2">Invalid or Expired Link</h2>
      <p className="text-body-md text-on-surface-variant mb-8">This invite link is no longer valid. Ask the manager for a new one.</p>
      <button onClick={() => navigate('/brands')} className="btn-primary">Go to My Brands</button>
    </div>
  )

  if (status === 'joined') return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface px-6 text-center">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-headline-md text-on-surface mb-2">Welcome aboard!</h2>
      <p className="text-body-md text-on-surface-variant">You've joined <strong>{brand?.name}</strong>. Redirecting…</p>
    </div>
  )

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
            {brand?.logo_url ? <img src={brand.logo_url} alt={brand.name} className="w-full h-full rounded-xl object-cover" /> : <Building2 className="w-10 h-10 text-primary-500" />}
          </div>
          <h2 className="text-headline-md text-on-surface mb-1">{brand?.name}</h2>
          {brand?.business_type && <span className="chip chip-active">{brand.business_type}</span>}
          {brand?.description && <p className="text-body-md text-on-surface-variant text-center mt-3">{brand.description}</p>}
        </div>

        {requiresKey && (
          <div className="mb-4">
            <label className="block text-label-md font-medium text-on-surface mb-2">Access Key Required</label>
            <input type="text" value={accessKey} onChange={e => setAccessKey(e.target.value)} placeholder="Enter access key" className="input-base mb-3" />
          </div>
        )}

        <button onClick={handleJoin} disabled={status === 'joining'} className="btn-primary w-full">
          {status === 'joining' ? <Loader2 className="w-5 h-5 animate-spin" /> : `Join ${brand?.name}`}
        </button>
        <button onClick={() => navigate('/brands')} className="btn-ghost w-full mt-3">Not now</button>
      </div>
    </div>
  )
}
