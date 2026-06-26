import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { useAuth } from '../context/AuthContext'

export function useSwaps() {
  const { currentBrand } = useBrand()
  const { user } = useAuth()
  const [swaps, setSwaps] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchSwaps = useCallback(async () => {
    if (!currentBrand) return
    setLoading(true)
    const { data } = await supabase
      .from('swap_requests')
      .select(`*, requester:profiles!requester_id(id, name, avatar_url), target:profiles!target_id(id, name, avatar_url), requester_slot:shift_slots!requester_slot_id(*), target_slot:shift_slots!target_slot_id(*)`)
      .eq('brand_id', currentBrand.id)
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    setSwaps(data ?? [])
    setLoading(false)
    return data
  }, [currentBrand, user])

  const requestSwap = async ({ targetId, requesterScheduleId, targetScheduleId, requesterSlotId, targetSlotId, date }) => {
    const { data, error } = await supabase.from('swap_requests').insert({
      brand_id: currentBrand.id,
      requester_id: user.id,
      target_id: targetId,
      requester_schedule_id: requesterScheduleId,
      target_schedule_id: targetScheduleId,
      requester_slot_id: requesterSlotId,
      target_slot_id: targetSlotId,
      date,
      status: 'pending',
    }).select().single()
    if (error) throw error
    // Notify target
    await supabase.from('notifications').insert({
      user_id: targetId,
      brand_id: currentBrand.id,
      title: 'New Swap Request',
      message: 'You have received a new shift swap request.',
      type: 'swap',
    })
    return data
  }

  const cancelSwap = async (swapId) => {
    const { error } = await supabase.from('swap_requests').update({ status: 'cancelled' }).eq('id', swapId).eq('requester_id', user.id).eq('status', 'pending')
    if (error) throw error
  }

  const rejectSwap = async (swapId) => {
    const { error } = await supabase.from('swap_requests').update({ status: 'rejected' }).eq('id', swapId).eq('target_id', user.id)
    if (error) throw error
  }

  const acceptSwap = async (swapId) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
      body: JSON.stringify({ swap_id: swapId }),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error)
    return result
  }

  const removeSwap = async (swapId) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
      body: JSON.stringify({ swap_id: swapId }),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error)
    return result
  }

  return { swaps, loading, fetchSwaps, requestSwap, cancelSwap, rejectSwap, acceptSwap, removeSwap }
}
