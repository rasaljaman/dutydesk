import { useState, useEffect } from 'react'
import { FileText, Edit2, Check, X } from 'lucide-react'
import { useShiftNotes } from '../../hooks/useShiftNotes'
import { useAuth } from '../../context/AuthContext'
import { useBrand } from '../../context/BrandContext'

export function ShiftNoteInline({ date, slotId, initialNote }) {
  const { user } = useAuth()
  const { currentBrand, isManager } = useBrand()
  const { saveNote, loading } = useShiftNotes()
  
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(initialNote?.note || '')
  
  // Keep local state in sync if prop changes
  useEffect(() => {
    setText(initialNote?.note || '')
  }, [initialNote])

  const handleSave = async () => {
    if (text === initialNote?.note) {
      setEditing(false)
      return
    }
    const success = await saveNote(currentBrand.id, date, slotId, text, user.id)
    if (success) {
      setEditing(false)
    }
  }

  const handleCancel = () => {
    setText(initialNote?.note || '')
    setEditing(false)
  }

  if (!isManager && !initialNote?.note) return null

  if (editing) {
    return (
      <div className="mt-2 pl-12">
        <div className="flex gap-2">
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add note for this shift..."
            className="input-base py-1.5 px-3 flex-1 text-body-sm"
          />
          <button onClick={handleCancel} disabled={loading} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded">
            <X className="w-4 h-4" />
          </button>
          <button onClick={handleSave} disabled={loading} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded">
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 pl-12 group flex items-start gap-2">
      {initialNote?.note ? (
        <>
          <FileText className="w-4 h-4 text-on-surface-variant flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-on-surface-variant flex-1">{initialNote.note}</p>
          {isManager && (
            <button onClick={() => setEditing(true)} className="p-1 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      ) : (
        isManager && (
          <button onClick={() => setEditing(true)} className="text-label-sm text-primary-600 hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Note
          </button>
        )
      )}
    </div>
  )
}

function Plus({ className }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
}
