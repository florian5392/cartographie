import { useEffect, useRef, useState, useCallback } from 'react'
import useSessionStore from '../stores/sessionStore'
import * as api from '../api/nocodb'

export function useAutoSave(interval = 30000) {
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving' | 'unsaved'
  const { session, positions, isDirty, markSaved, demoMode } = useSessionStore()
  const offlineQueue = useRef([])
  const timerRef = useRef(null)

  const performSave = useCallback(async () => {
    if (!isDirty || !session || demoMode) return
    setSaveStatus('saving')
    try {
      // Save positions
      await api.savePositions(session.id, positions)
      // Process offline queue
      for (const item of offlineQueue.current) {
        await item()
      }
      offlineQueue.current = []
      markSaved()
      setSaveStatus('saved')
    } catch {
      setSaveStatus('unsaved')
    }
  }, [isDirty, session, positions, demoMode, markSaved])

  useEffect(() => {
    if (isDirty) setSaveStatus('unsaved')
  }, [isDirty])

  useEffect(() => {
    timerRef.current = setInterval(performSave, interval)
    return () => clearInterval(timerRef.current)
  }, [performSave, interval])

  return { saveStatus, save: performSave, offlineQueue }
}
