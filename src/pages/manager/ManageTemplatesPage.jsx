import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Calendar, Users, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useScheduleTemplates } from '../../hooks/useScheduleTemplates'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import toast from 'react-hot-toast'

export default function ManageTemplatesPage() {
  const { brandId } = useParams()
  const navigate = useNavigate()
  const { templates, loading, fetchTemplates, createTemplate, deleteTemplate } = useScheduleTemplates(brandId)
  
  const [showSheet, setShowSheet] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  
  const [staff, setStaff] = useState([])
  const [slots, setSlots] = useState([])
  
  // Mapping of userId -> slotId for the new template
  const [assignments, setAssignments] = useState({})

  useEffect(() => {
    fetchTemplates()
    fetchFormData()
  }, [brandId])

  const fetchFormData = async () => {
    const [staffRes, slotsRes] = await Promise.all([
      supabase.from('brand_members').select('user_id, profiles!brand_members_user_id_fkey(name, avatar_url)').eq('brand_id', brandId).eq('is_active', true),
      supabase.from('shift_slots').select('*').eq('brand_id', brandId).order('start_time')
    ])
    if (staffRes.data) setStaff(staffRes.data)
    if (slotsRes.data) setSlots(slotsRes.data)
  }

  const openAdd = () => {
    setFormName('')
    setAssignments({})
    setShowSheet(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return toast.error('Please enter a template name')
    
    const entries = Object.entries(assignments)
      .filter(([_, slotId]) => slotId !== '')
      .map(([userId, slotId]) => ({ user_id: userId, slot_id: slotId }))
      
    if (entries.length === 0) return toast.error('Please assign at least one shift')

    try {
      setIsSubmitting(true)
      await createTemplate(formName, entries)
      toast.success('Template created successfully')
      setShowSheet(false)
    } catch (err) {
      toast.error(err.message || 'Failed to create template')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return
    try {
      await deleteTemplate(id)
      toast.success('Template deleted')
    } catch (err) {
      toast.error('Failed to delete template')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-on-surface-variant">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-title-lg font-semibold text-on-surface">Schedule Templates</h1>
          <button onClick={openAdd} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : templates.length === 0 ? (
          <EmptyState 
            icon={Calendar} 
            title="No templates yet" 
            description="Create schedule templates for standard weeks to easily apply them later." 
            action={<button onClick={openAdd} className="btn-primary px-6">Create Template</button>} 
          />
        ) : (
          templates.map(tmpl => (
            <div key={tmpl.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-body-lg font-semibold text-on-surface">{tmpl.name}</h3>
                  <p className="text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {tmpl.schedule_template_entries?.length || 0} assignments
                  </p>
                </div>
                <button 
                  onClick={() => handleDelete(tmpl.id)} 
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="bg-surface-container rounded-lg p-3 space-y-2 mt-2">
                {tmpl.schedule_template_entries?.slice(0, 3).map(entry => (
                  <div key={entry.id} className="flex justify-between items-center text-body-sm">
                    <span className="text-on-surface truncate">{entry.profiles?.name}</span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={{ backgroundColor: entry.shift_slots?.color_hex + '20', color: entry.shift_slots?.color_hex }}>
                      <Clock className="w-3 h-3" />
                      {entry.shift_slots?.label}
                    </span>
                  </div>
                ))}
                {(tmpl.schedule_template_entries?.length || 0) > 3 && (
                  <div className="text-center text-label-sm text-on-surface-variant pt-1">
                    + {(tmpl.schedule_template_entries?.length || 0) - 3} more
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title="Create Template">
        <div className="space-y-6 pb-6">
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-2">Template Name *</label>
            <input 
              value={formName} 
              onChange={e => setFormName(e.target.value)} 
              placeholder="e.g. Standard Summer Week" 
              className="input-base" 
            />
          </div>
          
          <div>
            <label className="block text-label-md font-medium text-on-surface mb-3">Assign Default Shifts</label>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {staff.map(member => (
                <div key={member.user_id} className="flex items-center justify-between gap-3 p-3 bg-surface-container rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {member.profiles?.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary-700 font-medium text-sm">{member.profiles?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <span className="text-body-sm font-medium text-on-surface truncate">{member.profiles?.name}</span>
                  </div>
                  
                  <select 
                    value={assignments[member.user_id] || ''}
                    onChange={(e) => setAssignments(prev => ({ ...prev, [member.user_id]: e.target.value }))}
                    className="input-base py-1.5 text-body-sm min-w-[120px] max-w-[150px]"
                  >
                    <option value="">No Shift</option>
                    {slots.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Creating...' : 'Save Template'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
