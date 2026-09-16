import { useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm">
        <AlertCircle size={16} className="text-amber-400 shrink-0" />
        <span>{message}</span>
        <button onClick={onClose} className="ml-1 text-gray-400 hover:text-white">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
