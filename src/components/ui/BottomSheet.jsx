import { useEffect, useRef } from 'react'

export function BottomSheet({ isOpen, onClose, title, children }) {
  const sheetRef = useRef(null)

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-on-surface/40 animate-fade-in" onClick={onClose} />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full bg-white rounded-t-xl shadow-sheet animate-slide-up max-h-[90dvh] overflow-y-auto"
      >
        <div className="px-4 pt-3 pb-2">
          <div className="drag-handle" />
          {title && <h2 className="text-title-lg text-on-surface text-center mb-4">{title}</h2>}
        </div>
        <div className="px-4 pb-8 safe-bottom">
          {children}
        </div>
      </div>
    </div>
  )
}
