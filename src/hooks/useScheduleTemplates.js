import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useScheduleTemplates(brandId) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('schedule_templates')
      .select(`
        id, name, created_at,
        schedule_template_entries (
          id, user_id, slot_id, profiles(name), shift_slots(label, start_time, end_time, color_hex)
        )
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      
    if (!error && data) {
      setTemplates(data)
    }
    setLoading(false)
  }, [brandId])

  const createTemplate = async (name, entries) => {
    const { data: tmpl, error: tmplErr } = await supabase
      .from('schedule_templates')
      .insert({ brand_id: brandId, name })
      .select('id')
      .single()
      
    if (tmplErr) throw tmplErr
    
    if (entries.length > 0) {
      const inserts = entries.map(e => ({
        template_id: tmpl.id,
        brand_id: brandId,
        user_id: e.user_id,
        slot_id: e.slot_id
      }))
      const { error: entriesErr } = await supabase.from('schedule_template_entries').insert(inserts)
      if (entriesErr) throw entriesErr
    }
    
    await fetchTemplates()
    return tmpl.id
  }
  
  const deleteTemplate = async (id) => {
    const { error } = await supabase.from('schedule_templates').delete().eq('id', id)
    if (error) throw error
    setTemplates(prev => prev.filter(t => t.id !== id))
  }
  
  const applyTemplate = async (templateId, weekStartDate, override = false) => {
    const { data, error } = await supabase.functions.invoke('apply-schedule-template', {
      body: { brand_id: brandId, template_id: templateId, week_start_date: weekStartDate, override }
    })
    if (error) throw error
    return data
  }

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    applyTemplate
  }
}
