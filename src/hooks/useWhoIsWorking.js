import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useWhoIsWorking() {
  const [loading, setLoading] = useState(false)
  const [workingNow, setWorkingNow] = useState([])

  const getWorkingNow = useCallback(async (brandId) => {
    try {
      setLoading(true)
      const now = new Date()
      // format to HH:MM:00 for simple comparison, but since timezone might be tricky, we'll let supabase handle it or filter it on the client
      // For simplicity, we get today's schedule, then filter by current time
      const today = now.toLocaleDateString('en-CA') // YYYY-MM-DD local
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM local

      const { data, error } = await supabase
        .from('schedule')
        .select(`
          *,
          profiles ( id, name, username, avatar_url ),
          shift_slots ( start_time, end_time, label, color_hex )
        `)
        .eq('brand_id', brandId)
        .eq('date', today)

      if (error) throw error

      // filter shifts where current time is between start and end
      const active = (data || []).filter(s => {
        if (!s.shift_slots) return false
        const { start_time, end_time } = s.shift_slots
        return currentTime >= start_time && currentTime <= end_time
      })

      setWorkingNow(active)
      return active
    } catch (err) {
      console.error('Error fetching working now:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    workingNow,
    getWorkingNow
  }
}
