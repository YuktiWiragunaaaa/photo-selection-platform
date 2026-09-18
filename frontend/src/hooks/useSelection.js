import { useCallback, useEffect, useMemo, useState } from 'react'

const read = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}
const write = (key, v) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {}
}

/**
 * Selection + per-photo notes, persisted per gallery so a refresh on mobile
 * doesn't lose picks. `limit` is the hard cap (package + allowed extras).
 */
export function useSelection(slug, limit, initial = []) {
  const idsKey = `psp_sel_${slug}`
  const notesKey = `psp_notes_${slug}`
  const [ids, setIds] = useState(() => (initial.length ? initial : read(idsKey, [])))
  const [notes, setNotes] = useState(() => read(notesKey, {}))
  const [warning, setWarning] = useState('')

  useEffect(() => write(idsKey, ids), [idsKey, ids])
  useEffect(() => write(notesKey, notes), [notesKey, notes])

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

  const setNote = useCallback((id, text) => {
    setNotes((prev) => {
      const next = { ...prev }
      if (text && text.trim()) next[id] = text.trim().slice(0, 300)
      else delete next[id]
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setIds([])
    setNotes({})
    try {
      localStorage.removeItem(idsKey)
      localStorage.removeItem(notesKey)
    } catch {}
  }, [idsKey, notesKey])

  const set = useMemo(() => new Set(ids), [ids])
  return {
    ids,
    set,
    notes,
    setNote,
    count: ids.length,
    atLimit: ids.length >= limit,
    toggle,
    clear,
    warning,
    clearWarning: () => setWarning(''),
  }
}
