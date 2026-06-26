import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useAnnouncements() {
  const [loading, setLoading] = useState(false)
  const [announcements, setAnnouncements] = useState([])

  const getAnnouncements = useCallback(async (brandId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles ( id, name, avatar_url ),
          announcement_reads ( user_id )
        `)
        .eq('brand_id', brandId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Filter out expired unless we are managers wanting history? 
      // For now, let's keep all and filter client-side or assume RLS filters expired for non-managers
      setAnnouncements(data || [])
      return data
    } catch (err) {
      console.error('Error fetching announcements:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const publishAnnouncement = async (announcementData) => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-announcement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(announcementData)
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to publish announcement')
      
      toast.success('Announcement published!')
      return true
    } catch (err) {
      console.error('Error publishing announcement:', err)
      toast.error(err.message || 'Failed to publish announcement')
      return false
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (announcementId, brandId, userId) => {
    try {
      const { error } = await supabase
        .from('announcement_reads')
        .insert({ announcement_id: announcementId, brand_id: brandId, user_id: userId })
        
      if (error) throw error
      
      setAnnouncements(prev => prev.map(a => {
        if (a.id === announcementId) {
          return { ...a, announcement_reads: [...(a.announcement_reads || []), { user_id: userId }] }
        }
        return a
      }))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const deleteAnnouncement = async (id) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        
      if (error) throw error
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      toast.success('Announcement deleted')
      return true
    } catch (err) {
      console.error('Error deleting announcement:', err)
      toast.error('Failed to delete announcement')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    announcements,
    getAnnouncements,
    publishAnnouncement,
    markAsRead,
    deleteAnnouncement
  }
}
