import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User, Mail, Phone, AtSign, LogOut, Edit2, Check, X, Lock, Shield } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useBrand } from '../../context/BrandContext'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { currentBrand, currentMember, brandSettings } = useBrand()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: profile?.name || '', phone: profile?.phone || '', bio: profile?.bio || '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showSecurity, setShowSecurity] = useState(false)
  const [securityForm, setSecurityForm] = useState({ oldPassword: '', newPassword: '' })
  const [securityLoading, setSecurityLoading] = useState(false)

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (!securityForm.newPassword || securityForm.newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters')
    }
    setSecurityLoading(true)
    try {
      // Re-authenticate with old password to verify
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: securityForm.oldPassword
      })
      if (signInErr) throw new Error('Incorrect current password')

      // Update password
      const { error: updateErr } = await supabase.auth.updateUser({ password: securityForm.newPassword })
      if (updateErr) throw updateErr

      toast.success('Password updated successfully')
      setShowSecurity(false)
      setSecurityForm({ oldPassword: '', newPassword: '' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSecurityLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(form)
      toast.success('Profile updated!')
      setEditing(false)
    } catch (err) { toast.error(err.message) }
    setSaving(false)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${Math.random()}.${fileExt}`

    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      await updateProfile({ avatar_url: data.publicUrl })
      toast.success('Profile photo updated!')
    } catch (err) {
      toast.error('Error uploading photo: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const roleColors = { manager: 'bg-primary-100 text-primary-700', permanent: 'bg-emerald-100 text-emerald-700', temp: 'bg-amber-100 text-amber-700' }

  return (
    <AppLayout title="Profile">
      <div className="px-4 py-6 space-y-6">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar name={profile?.name} avatarUrl={profile?.avatar_url} size="xl" />
            <label className={`absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md border border-outline-variant cursor-pointer hover:bg-surface-container transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Camera className="w-4 h-4 text-primary-600" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>
          <div className="text-center">
            <h2 className="text-headline-md text-on-surface">{profile?.name}</h2>
            <p className="text-body-md text-on-surface-variant">@{profile?.username}</p>
          </div>
          {currentMember && (
            <span className={`chip ${roleColors[currentMember.role] || 'chip-active'} capitalize`}>
              {currentMember.role} at {currentBrand?.name}
            </span>
          )}
        </div>

        {/* Profile details */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-lg text-on-surface">Personal Info</h3>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-ghost py-1.5 px-3 text-body-md gap-1"><Edit2 className="w-4 h-4" /> Edit</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg"><X className="w-4 h-4" /></button>
                <button onClick={handleSave} disabled={saving} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"><Check className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-outline flex-shrink-0" />
              {editing ? (
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-base py-2 flex-1" placeholder="Full name" />
              ) : (
                <div><p className="text-label-md text-on-surface-variant">Full Name</p><p className="text-body-lg text-on-surface">{profile?.name}</p></div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <AtSign className="w-5 h-5 text-outline flex-shrink-0" />
              <div><p className="text-label-md text-on-surface-variant">Username</p><p className="text-body-lg text-on-surface">@{profile?.username}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-outline flex-shrink-0" />
              <div><p className="text-label-md text-on-surface-variant">Email</p><p className="text-body-lg text-on-surface">{profile?.email}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-outline flex-shrink-0" />
              {editing ? (
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="input-base py-2 flex-1" placeholder="Phone number" />
              ) : (
                <div><p className="text-label-md text-on-surface-variant">Phone</p><p className="text-body-lg text-on-surface">{profile?.phone || '—'}</p></div>
              )}
            </div>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-outline flex-shrink-0 mt-1" />
              {editing ? (
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className="input-base py-2 flex-1 min-h-[80px]" placeholder="Short bio..." />
              ) : (
                <div><p className="text-label-md text-on-surface-variant">Bio</p><p className="text-body-lg text-on-surface whitespace-pre-wrap">{profile?.bio || '—'}</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-lg text-on-surface">Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-outline flex-shrink-0" />
                <div>
                  <p className="text-label-md text-on-surface-variant">Password</p>
                  <p className="text-body-lg text-on-surface">••••••••</p>
                </div>
              </div>
              <button onClick={() => setShowSecurity(true)} className="btn-secondary py-1.5 px-3 text-body-md">Change</button>
            </div>
            {(!profile?.email_verified && profile?.added_to_brand_directly) && (
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-label-md text-on-surface-variant">Email Verification</p>
                    <p className="text-body-sm text-amber-600 font-medium">Unverified</p>
                  </div>
                </div>
                <button onClick={() => window.location.href = '/verify-email'} className="btn-secondary py-1.5 px-3 text-body-md text-amber-700 border-amber-300">Verify</button>
              </div>
            )}
          </div>
        </div>

        {brandSettings?.enable_availability && (
          <div className="card">
            <h3 className="text-title-lg text-on-surface mb-2">My Availability</h3>
            <p className="text-body-md text-on-surface-variant mb-4">Let your manager know when you can't work.</p>
            <button 
              onClick={() => window.location.href = `/${currentBrand?.id}/availability`} 
              className="btn-secondary w-full"
            >
              Manage Availability
            </button>
          </div>
        )}

        {/* Notification Preferences */}
        <NotificationPrefs />

        {/* Sign out */}
        <button onClick={signOut} className="btn-secondary w-full text-red-500 border-red-300 hover:bg-red-50 gap-2">
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </div>

      <Modal isOpen={showSecurity} onClose={() => setShowSecurity(false)} title="Change Password">
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Current Password</label>
            <input 
              type="password" 
              value={securityForm.oldPassword} 
              onChange={e => setSecurityForm(p => ({ ...p, oldPassword: e.target.value }))} 
              className="input-base" 
              required
            />
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">New Password</label>
            <input 
              type="password" 
              value={securityForm.newPassword} 
              onChange={e => setSecurityForm(p => ({ ...p, newPassword: e.target.value }))} 
              className="input-base" 
              placeholder="Min. 8 characters"
              required
            />
          </div>
          <div className="pt-2">
            <button type="submit" disabled={securityLoading} className="btn-primary w-full py-3">
              {securityLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}

function NotificationPrefs() {
  const { user } = useAuth()
  const { currentBrand } = useBrand()
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !currentBrand) return
    const fetchPrefs = async () => {
      setLoading(true)
      const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', user.id).eq('brand_id', currentBrand.id).maybeSingle()
      if (data) {
        setPrefs(data)
      } else {
        // Create defaults if not exists
        const { data: newPrefs } = await supabase.from('notification_preferences').insert({ user_id: user.id, brand_id: currentBrand.id }).select().single()
        setPrefs(newPrefs)
      }
      setLoading(false)
    }
    fetchPrefs()
  }, [user, currentBrand])

  const toggle = async (key) => {
    if (!prefs) return
    const newValue = !prefs[key]
    setPrefs(p => ({ ...p, [key]: newValue }))
    await supabase.from('notification_preferences').update({ [key]: newValue }).eq('id', prefs.id)
  }

  if (loading || !prefs) return null

  const settings = [
    { key: 'notify_push', label: 'Push Notifications', desc: 'Receive alerts on this device' },
    { key: 'notify_email', label: 'Email Notifications', desc: 'Receive daily summaries and alerts' },
    { key: 'notify_leave', label: 'Leave Requests', desc: 'Updates about time off' },
    { key: 'notify_swap', label: 'Shift Swaps', desc: 'Requests to swap shifts' },
    { key: 'notify_shift_change', label: 'Schedule Changes', desc: 'When your shifts are modified' },
    { key: 'notify_reminders', label: 'Shift Reminders', desc: 'Alerts before your shift starts' },
  ]

  return (
    <div className="card">
      <h3 className="text-title-lg text-on-surface mb-2">Notification Preferences</h3>
      <div className="divide-y divide-outline-variant">
        {settings.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3">
            <div className="flex-1 mr-4">
              <p className="text-body-lg font-medium text-on-surface">{label}</p>
              <p className="text-body-md text-on-surface-variant">{desc}</p>
            </div>
            <button onClick={() => toggle(key)} className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${prefs[key] ? 'bg-primary-500' : 'bg-outline-variant'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${prefs[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

