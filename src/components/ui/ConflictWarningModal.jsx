import { AlertTriangle, X } from 'lucide-react'

export function ConflictWarningModal({ isOpen, warnings, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-title-lg font-semibold">Scheduling Conflict</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-body-md text-on-surface-variant mb-4">
          We found potential issues with this assignment:
        </p>
        
        <ul className="space-y-2 mb-6">
          {warnings.map((warning, idx) => (
            <li key={idx} className="flex items-start gap-2 text-body-md text-on-surface">
              <span className="text-amber-500 font-bold">•</span>
              {warning}
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 btn-primary bg-amber-600 hover:bg-amber-700">
            Assign Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
