import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useShiftConfirmations() {
  const [loading, setLoading] = useState(false)
  const [confirmations, setConfirmations] = useState([])

  const getConfirmations = useCallback(async (brandId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shift_confirmations')
        .select('*')
        .eq('brand_id', brandId)

      if (error) throw error
      setConfirmations(data || [])
      return data
    } catch (err) {
      console.error('Error fetching confirmations:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const confirmShift = async (brandId, scheduleId, userId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('shift_confirmations')
        .insert({ brand_id: brandId, schedule_id: scheduleId, user_id: userId })
        .select()
        .single()

      if (error) throw error
      setConfirmations(prev => [...prev, data])
      toast.success('Shift confirmed!')
      return data
    } catch (err) {
      console.error('Error confirming shift:', err)
      toast.error('Failed to confirm shift')
      return null
    } finally {
      setLoading(false)
    }
  }
  
  const unconfirmShift = async (scheduleId, userId) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('shift_confirmations')
        .delete()
        .eq('schedule_id', scheduleId)
        .eq('user_id', userId)

      if (error) throw error
      setConfirmations(prev => prev.filter(c => c.schedule_id !== scheduleId || c.user_id !== userId))
      return true
    } catch (err) {
      console.error('Error unconfirming shift:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    confirmations,
    getConfirmations,
    confirmShift,
    unconfirmShift
  }
}
