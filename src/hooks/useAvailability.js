import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useAvailability() {
  const [loading, setLoading] = useState(false)
  const [availabilities, setAvailabilities] = useState([])

  const getAvailability = useCallback(async (brandId, userId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAvailabilities(data || [])
      return data
    } catch (err) {
      console.error('Error fetching availability:', err)
      toast.error('Failed to load availability')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const addAvailability = async (availabilityData) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('availability')
        .insert(availabilityData)
        .select()
        .single()

      if (error) throw error
      setAvailabilities(prev => [data, ...prev])
      toast.success('Availability saved')
      return data
    } catch (err) {
      console.error('Error adding availability:', err)
      toast.error('Failed to save availability')
      return null
    } finally {
      setLoading(false)
    }
  }

  const removeAvailability = async (id) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', id)

      if (error) throw error
      setAvailabilities(prev => prev.filter(a => a.id !== id))
      toast.success('Availability removed')
      return true
    } catch (err) {
      console.error('Error removing availability:', err)
      toast.error('Failed to remove availability')
      return false
    } finally {
      setLoading(false)
    }
  }

  const checkDateAvailability = useCallback(async (brandId, userId, date) => {
    try {
      // Get day of week (0-6, Sun-Sat)
      const dateObj = new Date(date)
      const dayOfWeek = dateObj.getDay()

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', userId)

      if (error) throw error
      if (!data) return { isAvailable: true, reason: null }

      for (const record of data) {
        if (record.type === 'recurring' && record.day_of_week === dayOfWeek) {
          return { isAvailable: false, reason: record.reason || 'Recurring unavailable day' }
        }
        if (record.type === 'specific_date' && record.specific_date === date) {
          return { isAvailable: false, reason: record.reason || 'Specific date unavailable' }
        }
        if (record.type === 'date_range' && record.start_date <= date && record.end_date >= date) {
          return { isAvailable: false, reason: record.reason || 'Date range unavailable' }
        }
      }
      return { isAvailable: true, reason: null }
    } catch (err) {
      console.error('Error checking availability:', err)
      return { isAvailable: true, reason: null } // Default to true on error
    }
  }, [])

  return {
    loading,
    availabilities,
    getAvailability,
    addAvailability,
    removeAvailability,
    checkDateAvailability,
    setAvailabilities
  }
}
