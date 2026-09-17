import { useEffect } from 'react'

export default function Toast({ message, onClose, duration = 2600 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message, onClose, duration])

  if (!message) return null
  return (
    <div
      role="status"
      className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 animate-rise rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-lg"
    >
      {message}
    </div>
  )
}
