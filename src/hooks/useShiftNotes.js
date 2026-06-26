import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useShiftNotes() {
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState([])

  const getNotes = useCallback(async (brandId, date) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shift_notes')
        .select('*')
        .eq('brand_id', brandId)
        .eq('date', date)

      if (error) throw error
      setNotes(data || [])
      return data
    } catch (err) {
      console.error('Error fetching shift notes:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const saveNote = async (brandId, date, slotId, noteText, userId) => {
    try {
      setLoading(true)
      
      if (!noteText.trim()) {
        // Delete note if empty
        const { error } = await supabase
          .from('shift_notes')
          .delete()
          .eq('brand_id', brandId)
          .eq('date', date)
          .eq('slot_id', slotId)
          
        if (error) throw error
        setNotes(prev => prev.filter(n => !(n.date === date && n.slot_id === slotId)))
        return true
      }
      
      // Upsert note
      const { data, error } = await supabase
        .from('shift_notes')
        .upsert({
          brand_id: brandId,
          date,
          slot_id: slotId,
          note: noteText,
          created_by: userId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'brand_id, date, slot_id' })
        .select()
        .single()
        
      if (error) throw error
      setNotes(prev => {
        const filtered = prev.filter(n => !(n.date === date && n.slot_id === slotId))
        return [...filtered, data]
      })
      toast.success('Note saved')
      return true
    } catch (err) {
      console.error('Error saving note:', err)
      toast.error('Failed to save note')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    notes,
    getNotes,
    saveNote,
    setNotes
  }
}
