import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useOpenShifts() {
  const [loading, setLoading] = useState(false)
  const [openShifts, setOpenShifts] = useState([])

  const getOpenShifts = useCallback(async (brandId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('open_shifts')
        .select(`
          *,
          shift_slots ( id, label, start_time, end_time, color_hex ),
          profiles ( id, name, avatar_url )
        `)
        .eq('brand_id', brandId)
        .order('date', { ascending: true })

      if (error) throw error
      setOpenShifts(data || [])
      return data
    } catch (err) {
      console.error('Error fetching open shifts:', err)
      toast.error('Failed to load open shifts')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createOpenShift = async (shiftData) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('open_shifts')
        .insert(shiftData)
        .select()
        .single()

      if (error) throw error
      // Note: we can optionally fetch the full joined record here or let realtime handle it
      toast.success('Open shift posted!')
      return data
    } catch (err) {
      console.error('Error creating open shift:', err)
      toast.error('Failed to post open shift')
      return null
    } finally {
      setLoading(false)
    }
  }

  const cancelOpenShift = async (id) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('open_shifts')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (error) throw error
      toast.success('Open shift cancelled')
      return true
    } catch (err) {
      console.error('Error cancelling open shift:', err)
      toast.error('Failed to cancel open shift')
      return false
    } finally {
      setLoading(false)
    }
  }

  const claimOpenShift = async (openShiftId, brandId, claimantId) => {
    try {
      setLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-open-shift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          open_shift_id: openShiftId,
          brand_id: brandId,
          claimant_id: claimantId
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to claim shift')
      
      toast.success('Shift confirmed!')
      return true
    } catch (err) {
      console.error('Error claiming open shift:', err)
      toast.error(err.message || 'Failed to claim open shift')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    openShifts,
    getOpenShifts,
    createOpenShift,
    cancelOpenShift,
    claimOpenShift,
    setOpenShifts
  }
}
