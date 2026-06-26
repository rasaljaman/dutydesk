import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { useAuth } from '../context/AuthContext'

export function useLeaves() {
  const { currentBrand } = useBrand()
  const { user } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchLeaves = useCallback(async () => {
    if (!currentBrand) return
    setLoading(true)
    const { data } = await supabase
      .from('leave_requests')
      .select('*, profiles!requester_id(id, name, username, avatar_url), leave_claims(*, profiles!claimant_id(id, name, avatar_url))')
      .eq('brand_id', currentBrand.id)
      .order('created_at', { ascending: false })
    setLeaves(data ?? [])
    setLoading(false)
    return data
  }, [currentBrand])

  const requestLeave = async ({ date, reason }) => {
    const { data, error } = await supabase.from('leave_requests').insert({
      brand_id: currentBrand.id,
      requester_id: user.id,
      date,
      reason,
      status: 'open',
    }).select().single()
    if (error) throw error
    return data
  }

  const cancelLeave = async (leaveId) => {
    const { error } = await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', leaveId).eq('requester_id', user.id)
    if (error) throw error
  }

  const claimLeave = async (leaveRequestId) => {
    const { data, error } = await supabase.from('leave_claims').insert({
      leave_request_id: leaveRequestId,
      brand_id: currentBrand.id,
      claimant_id: user.id,
      status: 'pending',
    }).select().single()
    if (error) throw error
    return data
  }

  const acceptClaim = async (claimId) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-leave-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ claim_id: claimId }),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error)
    return result
  }

  return { leaves, loading, fetchLeaves, requestLeave, cancelLeave, claimLeave, acceptClaim }
}
