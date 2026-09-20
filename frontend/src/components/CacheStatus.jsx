import { useEffect, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { adminApi } from '../api/adminApi'

/**
 * Polls how many photos of a session are already cached. The gallery link is
 * safe to share once every thumbnail is on disk.
 */
export default function CacheStatus({ sessionId, onReady, refreshKey = 0 }) {
  const [st, setSt] = useState(null)

  useEffect(() => {
    let alive = true
    let timer
    const tick = async () => {
      try {
        const s = await adminApi.cacheStatus(sessionId)
        if (!alive) return
        setSt(s)
        onReady?.(s.ready)
        const finished = s.total > 0 && s.full >= s.total && !s.warming
        if (!finished) timer = setTimeout(tick, s.warming ? 2000 : 6000)
      } catch {
        if (alive) timer = setTimeout(tick, 8000)
      }
    }
    tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [sessionId, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!st) return <span className="eyebrow animate-pulse">Memeriksa cache</span>
  if (st.total === 0) return <span className="font-mono text-xs text-danger">Folder tidak terbaca</span>

  const pctThumb = Math.round((st.thumb / st.total) * 100)
  const pctFull = Math.round((st.full / st.total) * 100)
  const allDone = st.full >= st.total

  return (
    <div className="font-mono text-xs">
      <div className="flex items-center gap-2">
        {allDone ? (
          <Check size={13} strokeWidth={3} />
        ) : (
          <RefreshCw size={12} className={clsx(st.warming && 'animate-spin')} />
        )}
        <span className={clsx(st.ready ? 'text-ink' : 'text-mute')}>
          {st.ready ? 'Galeri siap dibagikan' : `Menyiapkan galeri… ${st.thumb} / ${st.total}`}
        </span>
      </div>
      <div className="mt-2 h-[3px] w-full overflow-hidden rounded bg-line">
        <div className="h-full bg-solid transition-[width] duration-500" style={{ width: `${pctThumb}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-mute">
        thumbnail {pctThumb}% · foto besar {pctFull}%
        {!allDone && !st.warming && ' · sisanya dimuat saat dibuka'}
      </p>
    </div>
  )
}
