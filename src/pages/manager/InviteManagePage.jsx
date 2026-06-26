import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QrCode, Copy, Share2, RefreshCw, ChevronLeft, Link, Lock, Clock } from 'lucide-react'
import QRCode from 'react-qr-code'
import { supabase } from '../../lib/supabase'
import { generateToken } from '../../lib/utils'
import { useBrand } from '../../context/BrandContext'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'

export default function InviteManagePage() {
  const { brandId } = useParams()
  const { user } = useAuth()
  const { brandSettings } = useBrand()
  const navigate = useNavigate()
  const [activeInvite, setActiveInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [config, setConfig] = useState({ link_type: 'timed', duration: 24, require_key: false })

  const fetchActiveInvite = async () => {
    setLoading(true)
    const { data } = await supabase.from('invite_links').select('*').eq('brand_id', brandId).eq('is_active', true).order('created_at', { ascending: false }).limit(1).single()
    setActiveInvite(data)
    setLoading(false)
  }

  useEffect(() => { fetchActiveInvite() }, [])

  const generateInvite = async () => {
    setGenerating(true)
    // Deactivate existing
    await supabase.from('invite_links').update({ is_active: false }).eq('brand_id', brandId).eq('is_active', true)
    const token = generateToken(16)
    const expires_at = config.link_type === 'timed' ? new Date(Date.now() + config.duration * 3600000).toISOString() : null
    const access_key = config.require_key ? generateToken(6).toUpperCase() : null
    const { data, error } = await supabase.from('invite_links').insert({
      brand_id: brandId,
      created_by: user.id,
      link_token: token,
      link_type: config.link_type,
      expires_at,
      max_uses: config.link_type === 'one_time' ? 1 : null,
      access_key,
      is_active: true,
    }).select().single()
    if (error) { toast.error(error.message); setGenerating(false); return }
    setActiveInvite(data)
    toast.success('New invite link generated!')
    setGenerating(false)
  }

  const inviteUrl = activeInvite ? `${window.location.origin}/join/${activeInvite.link_token}` : ''

  const copyLink = () => { navigator.clipboard.writeText(inviteUrl); toast.success('Link copied!') }
  const shareLink = () => { if (navigator.share) navigator.share({ title: 'Join our team on DutyDesk', url: inviteUrl }); else copyLink() }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-on-surface-variant"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Invite Staff</h1>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* QR Code */}
        <div className="card flex flex-col items-center gap-4">
          <h2 className="text-title-lg text-on-surface self-start">Invite via QR Code</h2>
          {loading ? (
            <div className="w-48 h-48 skeleton" />
          ) : activeInvite ? (
            <>
              <div className="p-4 bg-white rounded-xl border border-outline-variant">
                <QRCode value={inviteUrl} size={180} fgColor="#151C27" />
              </div>
              <p className="text-label-md text-on-surface-variant text-center">Staff scan this to join your team</p>
              {activeInvite.expires_at && (
                <div className="flex items-center gap-1.5 text-body-md text-amber-600">
                  <Clock className="w-4 h-4" />
                  Expires {format(new Date(activeInvite.expires_at), 'MMM d, h:mm a')}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <QrCode className="w-12 h-12 text-outline mx-auto mb-3" />
              <p className="text-body-md text-on-surface-variant">No active invite link. Generate one below.</p>
            </div>
          )}
        </div>

        {/* Link actions */}
        {activeInvite && (
          <div className="card space-y-3">
            <h3 className="text-title-lg text-on-surface">Share Link</h3>
            <div className="flex items-center gap-2 p-3 bg-surface-container rounded-lg">
              <Link className="w-4 h-4 text-outline flex-shrink-0" />
              <p className="text-body-md text-on-surface-variant truncate flex-1">{inviteUrl}</p>
            </div>
            {activeInvite.access_key && (
              <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-100 rounded-lg">
                <div className="flex items-center gap-2 text-primary-700">
                  <Lock className="w-4.5 h-4.5" />
                  <span className="text-body-md font-medium">Access Key Required</span>
                </div>
                <strong className="text-body-md font-bold text-primary-600 tracking-wider bg-white px-2.5 py-1 rounded border border-primary-200 select-all">{activeInvite.access_key}</strong>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copyLink} className="btn-secondary py-2.5 gap-1.5 text-body-md"><Copy className="w-4 h-4" /> Copy</button>
              <button onClick={shareLink} className="btn-primary py-2.5 gap-1.5 text-body-md"><Share2 className="w-4 h-4" /> Share</button>
            </div>
          </div>
        )}

        {/* Config */}
        <div className="card space-y-4">
          <h3 className="text-title-lg text-on-surface">Link Settings</h3>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Link Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['timed', 'permanent', 'one_time'].map(t => (
                <button key={t} onClick={() => setConfig(p => ({ ...p, link_type: t }))}
                  className={`py-2 rounded-lg text-label-md font-semibold border transition-all ${config.link_type === t ? 'bg-primary-500 text-white border-primary-500' : 'border-outline-variant text-on-surface-variant'}`}>
                  {t === 'one_time' ? 'One-time' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {config.link_type === 'timed' && (
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Duration (hours)</label>
              <input type="number" value={config.duration} onChange={e => setConfig(p => ({ ...p, duration: +e.target.value }))} min={1} max={720} className="input-base" />
            </div>
          )}
          
          {/* Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-outline-variant">
            <div className="flex flex-col">
              <span className="text-body-md font-semibold text-on-surface">Require Access Token</span>
              <span className="text-label-md text-on-surface-variant">Adds an extra security step</span>
            </div>
            <button
              type="button"
              onClick={() => setConfig(p => ({ ...p, require_key: !p.require_key }))}
              className={`w-11 h-6 rounded-full relative border transition-colors duration-300 ${
                config.require_key ? 'bg-primary-500 border-primary-500' : 'bg-surface-container-high border-outline-variant'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full absolute top-[3px] transition-transform duration-300 shadow-sm ${
                  config.require_key ? 'bg-white translate-x-5' : 'bg-outline translate-x-1'
                }`}
              />
            </button>
          </div>

          <button onClick={generateInvite} disabled={generating} className="btn-primary w-full gap-2">
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : 'Generate New Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
