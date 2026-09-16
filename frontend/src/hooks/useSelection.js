import { useState, useCallback } from 'react'

export function useSelection(limit) {
  const [selected, setSelected] = useState(new Map()) // Map<file_id, photo_object>
  const [warningMessage, setWarningMessage] = useState(null)

  const toggle = useCallback((photo) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(photo.file_id)) {
        next.delete(photo.file_id)
        setWarningMessage(null)
      } else {
        if (next.size >= limit) {
          setWarningMessage(`Batas maksimal ${limit} foto sudah tercapai.`)
          return prev
        }
        next.set(photo.file_id, photo)
        setWarningMessage(null)
      }
      return next
    })
  }, [limit])

  const isSelected = useCallback((file_id) => selected.has(file_id), [selected])

  const selectedList = Array.from(selected.values())
  const count = selected.size
  const isAtLimit = count >= limit
  const canSubmit = count >= 1

  const clearWarning = () => setWarningMessage(null)

  return { selected, selectedList, count, isAtLimit, canSubmit, isSelected, toggle, warningMessage, clearWarning }
}
