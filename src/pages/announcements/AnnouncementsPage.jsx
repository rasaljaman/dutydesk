import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Megaphone, Plus, Trash2, Pin } from 'lucide-react'
import { AppLayout } from '../../components/layout/AppLayout'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { useBrand } from '../../context/BrandContext'
import { useAuth } from '../../context/AuthContext'

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const { currentBrand, isManager, brandSettings } = useBrand()
  const { announcements, loading, getAnnouncements, publishAnnouncement, markAsRead, deleteAnnouncement } = useAnnouncements()

  const [showPost, setShowPost] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (currentBrand) {
      getAnnouncements(currentBrand.id)
    }
  }, [currentBrand?.id])

  // Mark as read when viewing (for simplicity, we'll mark everything on screen as read after a short delay)
  // But doing it dynamically might trigger too many requests. 
  // Let's mark a specific one when they expand it, or just mark them all as read.
  useEffect(() => {
    if (announcements.length > 0 && user) {
      announcements.forEach(a => {
        const hasRead = a.announcement_reads?.some(r => r.user_id === user.id)
        if (!hasRead) {
          markAsRead(a.id, currentBrand.id, user.id)
        }
      })
    }
  }, [announcements, user, currentBrand?.id])

  if (!brandSettings?.enable_announcements) {
    return (
      <AppLayout title="Announcements">
        <EmptyState icon={Megaphone} title="Announcements Disabled" description="This feature is not enabled for your brand." />
      </AppLayout>
    )
  }

  const handlePost = async () => {
    if (!title || !message) return
    setSubmitting(true)
    const success = await publishAnnouncement({
      brand_id: currentBrand.id,
      title,
      message,
      is_pinned: isPinned,
      expires_at: null // Optional: implement expiration date
    })
    if (success) {
      setShowPost(false)
      setTitle('')
      setMessage('')
      setIsPinned(false)
      getAnnouncements(currentBrand.id)
    }
    setSubmitting(false)
  }

  return (
    <AppLayout title="Announcements" rightAction={
      isManager && (
        <button onClick={() => setShowPost(true)} className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      )
    }>
      <div className="px-4 py-4 space-y-4">
        {loading ? <LoadingSkeleton rows={4} /> : announcements.length === 0 ? (
          <EmptyState icon={Megaphone} title="No Announcements" description="Stay tuned for updates from your manager." />
        ) : announcements.map(a => (
          <div key={a.id} className={`card border-l-4 ${a.is_pinned ? 'border-primary-500 bg-primary-50/20' : 'border-transparent'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Avatar name={a.profiles?.name} avatarUrl={a.profiles?.avatar_url} size="sm" />
                <div>
                  <h4 className="text-body-lg font-bold text-on-surface flex items-center gap-2">
                    {a.title}
                    {a.is_pinned && <Pin className="w-4 h-4 text-primary-500 fill-current" />}
                  </h4>
                  <p className="text-label-sm text-on-surface-variant">
                    {a.profiles?.name} • {format(new Date(a.created_at), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
              {isManager && (
                <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 text-on-surface-variant hover:text-error-500 hover:bg-error-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <p className="text-body-md text-on-surface whitespace-pre-wrap mt-3">{a.message}</p>
          </div>
        ))}
      </div>

      {isManager && (
        <BottomSheet isOpen={showPost} onClose={() => setShowPost(false)} title="New Announcement">
          <div className="space-y-4">
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g., Upcoming Holiday Schedule" className="input-base" />
            </div>
            <div>
              <label className="block text-label-md font-medium text-on-surface mb-2">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your announcement here..." rows={4} className="input-base resize-none" />
            </div>
            <label className="flex items-center gap-3">
              <button 
                onClick={() => setIsPinned(!isPinned)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isPinned ? 'bg-primary-500' : 'bg-outline-variant'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isPinned ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
              <div>
                <p className="text-body-lg font-medium text-on-surface">Pin to top</p>
                <p className="text-label-md text-on-surface-variant">Keep this announcement at the top of the list</p>
              </div>
            </label>
            <button onClick={handlePost} disabled={submitting || !title || !message} className="btn-primary w-full py-3">
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </BottomSheet>
      )}
    </AppLayout>
  )
}
