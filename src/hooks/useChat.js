import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useChat(brandId, userId) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    const { data: memberData, error: memErr } = await supabase
      .from('chat_members')
      .select('conversation_id')
      .eq('user_id', userId)

    if (memErr || !memberData) {
      setLoading(false)
      return
    }

    const convIds = memberData.map(m => m.conversation_id)
    if (convIds.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    const { data: convData, error: convErr } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        chat_members!inner(user_id, last_read_at, profiles(name, avatar_url))
      `)
      .eq('brand_id', brandId)
      .in('id', convIds)
      .order('updated_at', { ascending: false })

    if (!convErr && convData) {
      setConversations(convData)
    }
    setLoading(false)
  }, [brandId, userId])

  useEffect(() => {
    if (brandId && userId) {
      fetchConversations()
    }
  }, [brandId, userId, fetchConversations])

  const getOrCreateDM = async (otherUserId) => {
    const { data, error } = await supabase.functions.invoke('get-or-create-dm', {
      body: { brandId, otherUserId }
    })
    if (error) throw error
    return data
  }

  const createGroupChat = async (name, memberIds) => {
    const { data, error } = await supabase.functions.invoke('create-group-chat', {
      body: { brandId, name, memberIds }
    })
    if (error) throw error
    return data
  }

  return {
    conversations,
    loading,
    fetchConversations,
    getOrCreateDM,
    createGroupChat
  }
}

export function useChatRoom(conversationId, userId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles(name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (!error && data) {
      setMessages(data)
    }
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    if (conversationId) fetchMessages()
  }, [conversationId, fetchMessages])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase.channel(`chat_${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        // Fetch the user's profile for the message
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', payload.new.sender_id)
          .single()
        
        const newMessage = { ...payload.new, profiles: profileData }
        setMessages(prev => [...prev, newMessage])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const sendMessage = async (content) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const markAsRead = async () => {
    await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
  }

  return {
    messages,
    loading,
    sendMessage,
    markAsRead
  }
}
