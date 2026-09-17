import { useEffect, useMemo, useState } from 'react'

const BREAKPOINTS = [
  [1536, 5],
  [1024, 4],
  [640, 3],
  [0, 2],
]

function countFor(width) {
  return BREAKPOINTS.find(([min]) => width >= min)[1]
}

/**
 * Masonry that keeps reading order: each photo goes to the currently shortest
 * column, so items flow roughly left-to-right, top-to-bottom (unlike CSS
 * `columns`, which fills each column top-to-bottom first).
 */
export function useColumns(photos) {
  const [count, setCount] = useState(() => countFor(typeof window === 'undefined' ? 1024 : window.innerWidth))

  useEffect(() => {
    const onResize = () => setCount(countFor(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return useMemo(() => {
    const cols = Array.from({ length: count }, () => ({ h: 0, items: [] }))
    photos.forEach((p, index) => {
      const col = cols.reduce((a, b) => (b.h < a.h ? b : a))
      col.items.push({ photo: p, index })
      col.h += p.height / p.width
    })
    return cols.map((c) => c.items)
  }, [photos, count])
}
