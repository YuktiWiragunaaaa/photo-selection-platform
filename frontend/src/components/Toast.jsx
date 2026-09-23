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
      className="fixed inset-x-0 top-4 z-[60] mx-auto w-max max-w-[calc(100vw-2rem)] animate-rise rounded-2xl text-center bg-solid px-4 py-2 text-sm text-onsolid shadow-lg"
    >
      {message}
    </div>
  )
}
