import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'

export function useSchedule() {
  const { currentBrand } = useBrand()
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchSchedule = useCallback(async (startDate, endDate) => {
    if (!currentBrand) return
    setLoading(true)
    const { data, error } = await supabase
      .from('schedule')
      .select('*, profiles(id, name, username, avatar_url), shift_slots(*)')
      .eq('brand_id', currentBrand.id)
      .eq('status', 'active')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
    if (!error) setSchedule(data ?? [])
    setLoading(false)
    return data
  }, [currentBrand])

  const fetchUserSchedule = useCallback(async (userId, startDate, endDate) => {
    if (!currentBrand) return []
    const { data } = await supabase
      .from('schedule')
      .select('*, shift_slots(*)')
      .eq('brand_id', currentBrand.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
    return data ?? []
  }, [currentBrand])

  const assignShift = async ({ userId, slotId, date, type = 'normal' }) => {
    const { data, error } = await supabase.from('schedule').insert({
      brand_id: currentBrand.id,
      user_id: userId,
      slot_id: slotId,
      date,
      type,
      status: 'active',
    }).select().single()
    if (error) throw error
    return data
  }

  const cancelShift = async (scheduleId) => {
    const { error } = await supabase.from('schedule').update({ status: 'cancelled' }).eq('id', scheduleId)
    if (error) throw error
  }

  const getUserShiftOnDate = useCallback(async (userId, date) => {
    if (!currentBrand) return null
    const { data } = await supabase
      .from('schedule')
      .select('*, shift_slots(*)')
      .eq('brand_id', currentBrand.id)
      .eq('user_id', userId)
      .eq('date', date)
      .eq('status', 'active')
      .single()
    return data
  }, [currentBrand])

  return { schedule, loading, fetchSchedule, fetchUserSchedule, assignShift, cancelShift, getUserShiftOnDate }
}
