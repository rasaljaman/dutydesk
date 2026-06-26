import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Send, Users, Info } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import { useChatRoom } from '../../hooks/useChat'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'

export default function ChatRoomPage() {
  const { brandId, conversationId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  
  const [conversation, setConversation] = useState(null)
  const { messages, loading: messagesLoading, sendMessage, markAsRead } = useChatRoom(conversationId, profile?.id)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const fetchConv = async () => {
      const { data } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          chat_members(user_id, profiles(name, avatar_url))
        `)
        .eq('id', conversationId)
        .single()
      setConversation(data)
    }
    if (conversationId) fetchConv()
  }, [conversationId])

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    // Mark as read when viewing messages
    if (messages.length > 0) markAsRead()
  }, [messages, markAsRead])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(newMessage.trim())
      setNewMessage('')
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  if (!conversation) return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top h-14" />
      <div className="p-4"><LoadingSkeleton rows={5} /></div>
    </div>
  )

  let title = conversation.name
  let avatar = null
  if (conversation.type === 'dm') {
    const other = conversation.chat_members.find(m => m.user_id !== profile.id)
    if (other) {
      title = other.profiles?.name
      avatar = other.profiles?.avatar_url
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <header className="bg-white border-b border-outline-variant px-4 safe-top sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => navigate(`/${brandId}/chat`)} className="p-1 -ml-1 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {conversation.type === 'group' ? (
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
            ) : (
              <Avatar name={title} avatarUrl={avatar} size="md" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-title-md font-semibold text-on-surface truncate">{title}</h1>
              {conversation.type === 'group' && (
                <p className="text-label-sm text-on-surface-variant truncate">
                  {conversation.chat_members.length} members
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messagesLoading ? (
          <LoadingSkeleton rows={8} />
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant space-y-2 mt-20">
            <Info className="w-12 h-12 text-outline opacity-50" />
            <p className="text-body-lg">Say hi!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === profile.id
            const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== msg.sender_id)
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                {!isMe && (
                  <div className="w-8 flex-shrink-0 mr-2 flex items-end">
                    {showAvatar && <Avatar name={msg.profiles?.name} avatarUrl={msg.profiles?.avatar_url} size="sm" />}
                  </div>
                )}
                
                <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && conversation.type === 'group' && (
                    <span className="text-label-sm text-on-surface-variant ml-1 mb-1">{msg.profiles?.name}</span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl ${
                    isMe 
                      ? 'bg-primary-500 text-white rounded-br-sm' 
                      : 'bg-surface-container text-on-surface rounded-bl-sm'
                  }`}>
                    <p className="text-body-lg whitespace-pre-wrap break-words leading-snug">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-on-surface-variant mt-1 px-1">
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-outline-variant p-4 safe-bottom">
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-base flex-1 min-h-[44px] max-h-32 py-2.5 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              newMessage.trim() && !sending ? 'bg-primary-500 text-white' : 'bg-surface-container text-outline'
            }`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
