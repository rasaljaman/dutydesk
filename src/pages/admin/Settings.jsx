import { useState, useEffect } from 'react'
import { Settings, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card, Button, Input } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const [settings, setSettings] = useState([])
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('system_settings').select('*').then(({ data }) => {
      setSettings(data || [])
      const f = {}
      data?.forEach((s) => { f[s.key] = s.value })
      setForm(f)
    })
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(form)) {
        await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      }
      toast.success('Settings saved!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const LABELS = {
    app_name: { label: 'App Name', description: 'Display name for the application' },
    deletion_delay_minutes: { label: 'Staff Deletion Delay (minutes)', description: 'How long to wait before staff removal takes effect' },
    vapid_public_key: { label: 'VAPID Public Key', description: 'Web push notification VAPID key' },
    push_notifications_enabled: { label: 'Push Notifications', description: 'Enable/disable push notifications (true/false)' },
  }

  return (
    <div className="page-container max-w-lg">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">System Settings</h1>

      <form onSubmit={handleSave}>
        <Card>
          <div className="space-y-5">
            {settings.map((s) => {
              const meta = LABELS[s.key] || { label: s.key, description: '' }
              return (
                <div key={s.key}>
                  <label className="form-label">{meta.label}</label>
                  {meta.description && <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">{meta.description}</p>}
                  <input
                    className="input-field"
                    value={form[s.key] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                  />
                </div>
              )
            })}
          </div>

          <Button type="submit" variant="primary" icon={Save} loading={saving} className="mt-6">
            Save Settings
          </Button>
        </Card>
      </form>
    </div>
  )
}
