// [ID] Menyimpan pilihan, catatan, dan tanda klien (di perangkat + dikirim ke server).
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
export function useSelection(slug, limit, initial = [], initialNotes = {}, initialMaybe = []) {
  const idsKey = `psp_sel_${slug}`
  const notesKey = `psp_notes_${slug}`
  const maybeKey = `psp_maybe_${slug}`
  const [ids, setIds] = useState(() => (initial.length ? initial : read(idsKey, [])))
  // Server copy (saved from any device) wins; the local copy covers an offline moment.
  const [notes, setNotes] = useState(() => (initial.length ? initialNotes : read(notesKey, {})))
  // "Tandai dulu": a shortlist of photos the client is unsure about. Doesn't count toward the quota.
  const [maybe, setMaybe] = useState(() => (initial.length || initialMaybe.length ? initialMaybe : read(maybeKey, [])))
  const [warning, setWarning] = useState('')

  useEffect(() => write(idsKey, ids), [idsKey, ids])
  useEffect(() => write(notesKey, notes), [notesKey, notes])
  useEffect(() => write(maybeKey, maybe), [maybeKey, maybe])

  const toggleMaybe = useCallback((id) => {
    setMaybe((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const toggle = useCallback(
    (id) => {
      setIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id)
        if (prev.length >= limit) {
          setWarning(`Maksimal ${limit} foto. Batalkan salah satu untuk mengganti.`)
          return prev
        }
        setMaybe((m) => (m.includes(id) ? m.filter((x) => x !== id) : m)) // picked → no longer "maybe"
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
    setMaybe([])
    try {
      localStorage.removeItem(idsKey)
      localStorage.removeItem(notesKey)
      localStorage.removeItem(maybeKey)
    } catch {}
  }, [idsKey, notesKey, maybeKey])

  const set = useMemo(() => new Set(ids), [ids])
  const maybeSet = useMemo(() => new Set(maybe), [maybe])
  return {
    ids,
    set,
    notes,
    setNote,
    maybe,
    maybeSet,
    toggleMaybe,
    count: ids.length,
    atLimit: ids.length >= limit,
    toggle,
    clear,
    warning,
    clearWarning: () => setWarning(''),
  }
}
