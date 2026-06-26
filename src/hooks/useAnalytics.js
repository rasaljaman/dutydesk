import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAnalytics(brandId) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalHours: 0,
    shiftsPerStaff: [],
    shiftTypeDistribution: []
  })

  const fetchAnalytics = useCallback(async (startDate, endDate) => {
    setLoading(true)
    
    // Fetch schedule for the date range
    const { data: scheduleData, error } = await supabase
      .from('schedule')
      .select(`
        id, date, status,
        user_id,
        profiles (name, avatar_url),
        shift_slots (id, label, start_time, end_time, color_hex)
      `)
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error || !scheduleData) {
      setLoading(false)
      return
    }

    let totalHours = 0
    const staffStats = {}
    const typeStats = {}

    scheduleData.forEach(shift => {
      const slot = shift.shift_slots
      const profile = shift.profiles
      if (!slot || !profile) return

      // Calculate hours
      const [startH, startM] = slot.start_time.split(':').map(Number)
      const [endH, endM] = slot.end_time.split(':').map(Number)
      let hours = endH - startH + (endM - startM) / 60
      if (hours < 0) hours += 24 // Overnight shift
      totalHours += hours

      // Staff stats
      if (!staffStats[shift.user_id]) {
        staffStats[shift.user_id] = { name: profile.name, avatar: profile.avatar_url, count: 0, hours: 0 }
      }
      staffStats[shift.user_id].count += 1
      staffStats[shift.user_id].hours += hours

      // Type stats
      if (!typeStats[slot.id]) {
        typeStats[slot.id] = { label: slot.label, color: slot.color_hex, count: 0 }
      }
      typeStats[slot.id].count += 1
    })

    const shiftsPerStaff = Object.values(staffStats).sort((a, b) => b.hours - a.hours)
    const shiftTypeDistribution = Object.values(typeStats).sort((a, b) => b.count - a.count)

    setMetrics({
      totalHours: Math.round(totalHours * 10) / 10,
      shiftsPerStaff,
      shiftTypeDistribution
    })
    
    setLoading(false)
  }, [brandId])

  return {
    metrics,
    loading,
    fetchAnalytics
  }
}
