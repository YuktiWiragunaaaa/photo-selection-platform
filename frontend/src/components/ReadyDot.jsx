import { useEffect, useState } from 'react'
import { adminApi } from '../api/adminApi'

/** Tiny "is the gallery ready to share?" indicator for the session list. */
export default function ReadyDot({ sessionId }) {
  const [st, setSt] = useState(null)

  useEffect(() => {
    let alive = true
    let timer
    const tick = async () => {
      try {
        const s = await adminApi.cacheStatus(sessionId)
        if (!alive) return
        setSt(s)
        if (!s.ready) timer = setTimeout(tick, 5000)
      } catch {
        /* keep quiet in the list */
      }
    }
    tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [sessionId])

  if (!st || st.total === 0) return null
  return (
    <span className="font-mono text-[11px] text-mute">
      {st.ready ? 'galeri siap' : `menyiapkan ${Math.round((st.thumb / st.total) * 100)}%`}
    </span>
  )
}
