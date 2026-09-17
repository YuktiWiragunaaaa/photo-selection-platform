import { useCallback, useEffect, useMemo, useState } from 'react'

/** Selection state, persisted per gallery so a refresh on mobile doesn't lose picks. */
export function useSelection(slug, limit, initial = []) {
  const key = `psp_sel_${slug}`
  const [ids, setIds] = useState(() => {
    if (initial.length) return initial
    try {
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      return []
    }
  })
  const [warning, setWarning] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(ids))
    } catch {}
  }, [key, ids])

  const toggle = useCallback(
    (id) => {
      setIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id)
        if (prev.length >= limit) {
          setWarning(`Maksimal ${limit} foto. Batalkan salah satu untuk mengganti.`)
          return prev
        }
        return [...prev, id]
      })
    },
    [limit],
  )

  const clear = useCallback(() => {
    setIds([])
    try {
      localStorage.removeItem(key)
    } catch {}
  }, [key])

  const set = useMemo(() => new Set(ids), [ids])
  return { ids, set, count: ids.length, atLimit: ids.length >= limit, toggle, clear, warning, clearWarning: () => setWarning('') }
}
