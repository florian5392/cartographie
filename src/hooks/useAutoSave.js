import { useEffect, useRef, useState, useCallback } from 'react'
import useSessionStore from '../stores/sessionStore'
import * as api from '../api/api'

export function useAutoSave(interval = 30000) {
  const [saveStatus, setSaveStatus] = useState('saved')
  const offlineQueue = useRef([])
  const lastSavedApps = useRef([])
  const lastSavedFlux = useRef([])

  const storeRef = useRef(null)
  storeRef.current = useSessionStore.getState()

  const { isDirty } = useSessionStore((s) => ({ isDirty: s.isDirty }))

  const performSave = useCallback(async () => {
    const { session, applications, flux, positions, isDirty: dirty, markSaved, demoMode } =
      useSessionStore.getState()

    if (!dirty || !session || demoMode) return
    setSaveStatus('saving')

    try {
      // Drain offline queue first
      if (offlineQueue.current.length > 0) {
        for (const op of offlineQueue.current) await op()
        offlineQueue.current = []
      }

      // 1. Sync applications (positions and flux reference them — must be first)
      const prevAppIds = new Set(lastSavedApps.current.map((a) => a.id))
      for (const app of applications) {
        if (!prevAppIds.has(app.id)) {
          try { await api.createApplication(app) } catch { /* best effort */ }
        } else {
          const prev = lastSavedApps.current.find((a) => a.id === app.id)
          if (prev && JSON.stringify(prev) !== JSON.stringify(app)) {
            try { await api.updateApplication(app.id, app) } catch { /* best effort */ }
          }
        }
      }

      // 2. Sync flux (delete removed before deleting apps, then create/update)
      const prevFluxIds = new Set(lastSavedFlux.current.map((f) => f.id))
      const currentFluxIds = new Set(flux.map((f) => f.id))
      for (const prev of lastSavedFlux.current) {
        if (!currentFluxIds.has(prev.id)) {
          try { await api.deleteFlux(prev.id) } catch { /* best effort */ }
        }
      }
      for (const f of flux) {
        if (!prevFluxIds.has(f.id)) {
          try { await api.createFlux(f) } catch { /* best effort */ }
        } else {
          const prev = lastSavedFlux.current.find((x) => x.id === f.id)
          if (prev && JSON.stringify(prev) !== JSON.stringify(f)) {
            try { await api.updateFlux(f.id, f) } catch { /* best effort */ }
          }
        }
      }
      lastSavedFlux.current = flux

      // 3. Delete removed apps (after flux cleaned up)
      const currentAppIds = new Set(applications.map((a) => a.id))
      for (const prev of lastSavedApps.current) {
        if (!currentAppIds.has(prev.id)) {
          try { await api.deleteApplication(prev.id) } catch { /* best effort */ }
        }
      }
      lastSavedApps.current = applications

      // 4. Save positions (after apps exist in DB)
      await api.savePositions(session.id, positions)

      markSaved()
      setSaveStatus('saved')
    } catch {
      setSaveStatus('unsaved')
    }
  }, [])

  useEffect(() => {
    if (isDirty) setSaveStatus('unsaved')
  }, [isDirty])

  useEffect(() => {
    const timer = setInterval(performSave, interval)
    return () => clearInterval(timer)
  }, [performSave, interval])

  return { saveStatus, save: performSave, offlineQueue }
}
