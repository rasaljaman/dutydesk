import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useBrand } from '../../context/BrandContext'
import toast from 'react-hot-toast'

const toggleSettings = [
  { key: 'enable_temp_staff', label: 'Allow Temp Staff', desc: 'Enable on-call/temporary staff role' },
  { key: 'enable_shift_swap', label: 'Shift Swaps', desc: 'Allow staff to request shift swaps' },
  { key: 'enable_leave_requests', label: 'Leave Requests', desc: 'Allow staff to submit leave requests' },
  { key: 'enable_special_days', label: 'Special Days', desc: 'Mark special calendar events' },
  { key: 'enable_staff_view_others', label: 'Staff See Others', desc: 'Staff can see other members\' schedules' },
  { key: 'enable_open_shifts', label: 'Open Shifts', desc: 'Allow managers to post extra shifts' },
  { key: 'enable_announcements', label: 'Announcements', desc: 'Enable brand-wide announcements' },
  { key: 'enable_chat', label: 'Team Chat', desc: 'Enable in-app team messaging' },
  { key: 'enable_shift_confirmations', label: 'Shift Confirmations', desc: 'Require staff to confirm shifts' },
  { key: 'enable_availability', label: 'Staff Availability', desc: 'Allow staff to set unavailability' },
  { key: 'reminder_enabled', label: 'Shift Reminders', desc: 'Send automated push reminders before shifts' },
]

export default function BrandSettingsPage() {
  const { brandId } = useParams()
  const { brandSettings, setBrandSettings } = useBrand()
  const navigate = useNavigate()
  const [settings, setSettings] = useState(brandSettings || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (brandSettings) setSettings(brandSettings) }, [brandSettings])

  const toggle = (key) => setSettings(p => ({ ...p, [key]: !p[key] }))

  const handleSave = async () => {
    setSaving(true)
    const { data, error } = await supabase.from('brand_settings').update(settings).eq('brand_id', brandId).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    setBrandSettings(data)
    toast.success('Settings saved!')
    setSaving(false)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-on-surface-variant"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Brand Settings</h1>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-body-md font-semibold hover:bg-primary-600 transition-colors">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        <div className="card space-y-0 divide-y divide-outline-variant">
          {toggleSettings.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-4">
              <div className="flex-1 mr-4">
                <p className="text-body-lg font-medium text-on-surface">{label}</p>
                <p className="text-body-md text-on-surface-variant">{desc}</p>
              </div>
              <button onClick={() => toggle(key)} className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${settings[key] ? 'bg-primary-500' : 'bg-outline-variant'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="text-title-lg text-on-surface mb-4">Capacity & Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Max Staff Count <span className="text-on-surface-variant font-normal">(leave empty for unlimited)</span></label>
              <input type="number" value={settings.max_staff_count || ''} onChange={e => setSettings(p => ({ ...p, max_staff_count: e.target.value ? +e.target.value : null }))} placeholder="Unlimited" min={1} className="input-base" />
            </div>
            
            {settings.reminder_enabled && (
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-2">Shift Reminder Hours Before</label>
                <input type="number" value={settings.reminder_hours_before || 1} onChange={e => setSettings(p => ({ ...p, reminder_hours_before: e.target.value ? +e.target.value : 1 }))} min={1} max={24} className="input-base" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
