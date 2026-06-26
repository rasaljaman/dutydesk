import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useBrand } from './BrandContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const { currentBrand } = useBrand()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    if (!user || !currentBrand) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('brand_id', currentBrand.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data ?? [])
    setUnreadCount(data?.filter(n => !n.is_read).length ?? 0)
  }

  useEffect(() => {
    fetchNotifications()
  }, [user?.id, currentBrand?.id])

  const markRead = async (notificationId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    if (!user || !currentBrand) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('brand_id', currentBrand.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
