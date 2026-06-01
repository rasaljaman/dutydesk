import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Bell, Moon, Sun, LogOut, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, Button, Input, Toggle, Avatar } from '../../components/ui'
import { ROLE_LABELS, ROLE_COLORS } from '../../lib/helpers'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Profile() {
  const { profile, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'))
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({ email: false, sms: false, push: false })

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name, phone: profile.phone || '' })
      setNotifPrefs({
        email: profile.notification_email,
        sms: profile.notification_sms,
        push: profile.notification_push,
      })
    }
  }, [profile])

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ name: form.name, phone: form.phone })
      toast.success('Profile updated!')
      setEditMode(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) {
      toast.error('Passwords do not match.')
      return
    }
    if (pwForm.next.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next })
      if (error) throw error
      toast.success('Password changed successfully!')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPwLoading(false)
    }
  }

  const handleNotifChange = async (key, val) => {
    const next = { ...notifPrefs, [key]: val }
    setNotifPrefs(next)
    await updateProfile({
      notification_email: next.email,
      notification_sms: next.sms,
      notification_push: next.push,
    })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="page-container max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Profile</h1>

      {/* Avatar + role */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={profile?.name || ''} size="lg" />
        <div>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{profile?.name}</p>
          <span className={`badge mt-1 ${ROLE_COLORS[profile?.role]}`}>
            {ROLE_LABELS[profile?.role]}
          </span>
        </div>
      </div>

      {/* Personal info */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <User className="h-4 w-4 text-primary-500" /> Personal Info
          </h2>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">Edit</button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <Input label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditMode(false)} className="flex-1 justify-center">Cancel</Button>
              <Button type="submit" variant="primary" size="sm" loading={saving} className="flex-1 justify-center">Save</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Name</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{profile?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Email</span>
              <span className="font-medium text-slate-800 dark:text-slate-100 text-xs">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Username</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">@{profile?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Phone</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{profile?.phone || '—'}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Change password */}
      <Card className="mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-primary-500" /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div className="relative">
            <Input label="New Password" type={showPw ? 'text' : 'password'} value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} placeholder="Min 8 characters" required />
          </div>
          <Input label="Confirm Password" type={showPw ? 'text' : 'password'} value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat password" required />
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button type="button" onClick={() => setShowPw(!showPw)} className="flex items-center gap-1 hover:text-slate-700">
              {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPw ? 'Hide' : 'Show'} password
            </button>
          </div>
          <Button type="submit" variant="secondary" size="sm" loading={pwLoading}>Update Password</Button>
        </form>
      </Card>

      {/* Notification preferences */}
      <Card className="mb-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-primary-500" /> Notifications
        </h2>
        <div className="space-y-4">
          <Toggle
            label="Email Notifications"
            description="Receive shift and leave updates via email"
            checked={notifPrefs.email}
            onChange={(v) => handleNotifChange('email', v)}
          />
          <Toggle
            label="SMS Notifications"
            description="Receive urgent notifications via SMS"
            checked={notifPrefs.sms}
            onChange={(v) => handleNotifChange('sms', v)}
          />
          <Toggle
            label="Push Notifications"
            description="Browser push notifications"
            checked={notifPrefs.push}
            onChange={(v) => handleNotifChange('push', v)}
          />
        </div>
      </Card>

      {/* Appearance */}
      <Card className="mb-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          {darkMode ? <Moon className="h-4 w-4 text-primary-500" /> : <Sun className="h-4 w-4 text-primary-500" />}
          Appearance
        </h2>
        <Toggle
          label="Dark Mode"
          description="Switch between light and dark theme"
          checked={darkMode}
          onChange={toggleDark}
        />
      </Card>

      {/* Logout */}
      <Button variant="danger" className="w-full justify-center" icon={LogOut} onClick={handleLogout}>
        Sign Out
      </Button>

      <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">DutyDesk v1.0.0</p>
    </div>
  )
}
