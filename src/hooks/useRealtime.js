import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { useAuth } from '../context/AuthContext'

export function useRealtime({ onScheduleChange, onLeaveChange, onSwapChange, onNotification, onAvailabilityChange, onOpenShiftChange, onAnnouncementChange, onShiftNoteChange } = {}) {
  const { currentBrand } = useBrand()
  const { user } = useAuth()
  const channelRef = useRef(null)

  useEffect(() => {
    if (!currentBrand || !user) return

    // Generate a unique channel name for this specific hook instance to prevent
    // "cannot add postgres_changes callbacks... after subscribe()" error
    const uniqueId = Math.random().toString(36).substring(7)
    const channel = supabase.channel(`brand-${currentBrand.id}-${uniqueId}`)

    if (onScheduleChange) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'schedule', filter: `brand_id=eq.${currentBrand.id}` }, onScheduleChange)
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'shift_confirmations', filter: `brand_id=eq.${currentBrand.id}` }, onScheduleChange)
    }
    if (onLeaveChange) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests', filter: `brand_id=eq.${currentBrand.id}` }, onLeaveChange)
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'leave_claims', filter: `brand_id=eq.${currentBrand.id}` }, onLeaveChange)
    }
    if (onSwapChange) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests', filter: `brand_id=eq.${currentBrand.id}` }, onSwapChange)
    }
    if (onNotification) {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, onNotification)
    }
    if (onAvailabilityChange) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'availability', filter: `brand_id=eq.${currentBrand.id}` }, onAvailabilityChange)
    }
    if (onOpenShiftChange) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'open_shifts', filter: `brand_id=eq.${currentBrand.id}` }, onOpenShiftChange)
    }
    if (onAnnouncementChange) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `brand_id=eq.${currentBrand.id}` }, onAnnouncementChange)
    }
    if (onShiftNoteChange) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'shift_notes', filter: `brand_id=eq.${currentBrand.id}` }, onShiftNoteChange)
    }

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentBrand?.id, user?.id])

  return channelRef
}
