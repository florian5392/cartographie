import { useCallback, useEffect } from 'react'
import useSessionStore from '../stores/sessionStore'

export function useUndoRedo() {
  const { undo, redo, history, historyIndex } = useSessionStore()

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const handleUndo = useCallback(() => {
    if (canUndo) undo()
  }, [undo, canUndo])

  const handleRedo = useCallback(() => {
    if (canRedo) redo()
  }, [redo, canRedo])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      }
      if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault()
        if (canRedo) redo()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undo, redo, canUndo, canRedo])

  return { undo: handleUndo, redo: handleRedo, canUndo, canRedo }
}
