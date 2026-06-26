import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, MessageSquare, ChevronRight, Users, UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { useBrand } from '../../context/BrandContext'
import { useChat } from '../../hooks/useChat'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ChatListPage() {
  const { brandId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { conversations, loading, fetchConversations, getOrCreateDM } = useChat(brandId, profile?.id)
  
  const [showNewChat, setShowNewChat] = useState(false)
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const openNewChat = async () => {
    setShowNewChat(true)
    setLoadingMembers(true)
    const { data } = await supabase
      .from('brand_members')
      .select('user_id, profiles(name, avatar_url, username)')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .neq('user_id', profile.id)
    setMembers(data || [])
    setLoadingMembers(false)
  }

  const startDM = async (otherUserId) => {
    try {
      const conv = await getOrCreateDM(otherUserId)
      setShowNewChat(false)
      fetchConversations()
      navigate(`/${brandId}/chat/${conv.id}`)
    } catch (err) {
      toast.error('Failed to start chat')
    }
  }

  return (
    <AppLayout title="Chat">
      <div className="px-4 py-4 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-title-lg font-semibold text-on-surface">Conversations</h2>
          <button onClick={openNewChat} className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : conversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <EmptyState 
              icon={MessageSquare} 
              title="No chats yet" 
              description="Start a conversation with your team members." 
            />
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto">
            {conversations.map(conv => {
              const otherMembers = conv.chat_members.filter(m => m.user_id !== profile.id)
              
              let title = conv.name
              let avatar = null
              let isUnread = false

              if (conv.type === 'dm') {
                const other = otherMembers[0]
                if (other) {
                  title = other.profiles?.name
                  avatar = other.profiles?.avatar_url
                }
              }

              // Check if unread (if updated_at > my last_read_at)
              const me = conv.chat_members.find(m => m.user_id === profile.id)
              if (me && new Date(conv.updated_at) > new Date(me.last_read_at || 0)) {
                isUnread = true
              }

              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/${brandId}/chat/${conv.id}`)}
                  className="w-full flex items-center gap-3 p-3 bg-surface-container rounded-xl hover:bg-surface-container-high transition-colors text-left"
                >
                  {conv.type === 'group' ? (
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                  ) : (
                    <Avatar name={title} avatarUrl={avatar} size="lg" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p className={`text-body-lg truncate ${isUnread ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}>
                        {title}
                      </p>
                      <span className="text-label-sm text-on-surface-variant flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-body-md truncate ${isUnread ? 'font-medium text-on-surface' : 'text-on-surface-variant'}`}>
                      {conv.last_message || (conv.type === 'group' ? 'Group created' : 'Start chatting')}
                    </p>
                  </div>
                  
                  {isUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 ml-1" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <BottomSheet isOpen={showNewChat} onClose={() => setShowNewChat(false)} title="New Message">
        {loadingMembers ? (
          <LoadingSkeleton rows={3} />
        ) : members.length === 0 ? (
          <p className="text-center py-4 text-on-surface-variant">No other active team members found.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pb-4">
            {members.map(member => (
              <button
                key={member.user_id}
                onClick={() => startDM(member.user_id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-surface-container rounded-xl transition-colors text-left"
              >
                <Avatar name={member.profiles?.name} avatarUrl={member.profiles?.avatar_url} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-body-lg font-medium text-on-surface truncate">{member.profiles?.name}</p>
                  <p className="text-body-md text-on-surface-variant">@{member.profiles?.username}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-outline" />
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </AppLayout>
  )
}
