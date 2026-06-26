import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useHandoverNotes(brandId) {
  const [loading, setLoading] = useState(false)

  // Fetch recent handover notes for the brand
  const getRecentNotes = useCallback(async (limit = 5) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('handover_notes')
      .select(`
        id, content, created_at,
        profiles (name, avatar_url)
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(limit)
      
    setLoading(false)
    if (error) throw error
    return data || []
  }, [brandId])

  // Get note for a specific shift
  const getNoteForShift = useCallback(async (scheduleId) => {
    const { data, error } = await supabase
      .from('handover_notes')
      .select('*')
      .eq('schedule_id', scheduleId)
      .maybeSingle()
      
    if (error) throw error
    return data
  }, [])

  // Save or update a note
  const saveNote = async (scheduleId, authorId, content) => {
    // Check if it already exists
    const existing = await getNoteForShift(scheduleId)
    
    if (existing) {
      const { data, error } = await supabase
        .from('handover_notes')
        .update({ content })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('handover_notes')
        .insert({
          brand_id: brandId,
          schedule_id: scheduleId,
          author_id: authorId,
          content
        })
        .select()
        .single()
      if (error) throw error
      return data
    }
  }

  return {
    loading,
    getRecentNotes,
    getNoteForShift,
    saveNote
  }
}
