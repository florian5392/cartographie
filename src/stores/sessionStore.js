import { create } from 'zustand'
import * as api from '../api/api'
import {
  demoSession,
  demoApplications,
  demoFlux,
  demoPositions,
  demoDeploiements,
  demoEtablissements,
} from '../data/demoData'

const MAX_HISTORY = 50

function makeSnapshot(state) {
  return {
    applications: [...state.applications],
    flux: [...state.flux],
  }
}

const useSessionStore = create((set, get) => ({
  // State
  session: null,
  sessions: [],
  applications: [],
  flux: [],
  positions: {},
  etablissements: [],
  deploiements: [],
  isDirty: false,
  demoMode: false,
  history: [],
  historyIndex: -1,

  // ---- initStore ----
  initStore: async () => {
    const reachable = await api.isAPIReachable()
    if (!reachable) {
      set({ demoMode: true, sessions: [{ ...demoSession, _appCount: demoApplications.length, _fluxCount: demoFlux.length }] })
    } else {
      try {
        const sessions = await api.getSessions()
        set({ demoMode: false, sessions })
      } catch {
        set({ demoMode: true, sessions: [{ ...demoSession, _appCount: demoApplications.length, _fluxCount: demoFlux.length }] })
      }
    }
  },

  // ---- setSession ----
  setSession: async (session) => {
    if (!session) {
      set({ session: null, applications: [], flux: [], positions: {}, deploiements: [], isDirty: false, history: [], historyIndex: -1 })
      return
    }
    set({ session })
    // If session carries preloaded apps (from duplicate with preload), inject them
    if (session._preloadedApps) {
      const { applications } = get()
      set({ applications: [...applications, ...session._preloadedApps] })
    }
    await get().loadSessionData(session.id)
  },

  // ---- loadSessionData ----
  loadSessionData: async (sessionId) => {
    const { demoMode } = get()
    if (demoMode) {
      set({
        applications: demoApplications,
        flux: demoFlux.filter((f) => f.sessionId === sessionId || sessionId === 'session-demo'),
        positions: demoPositions,
        deploiements: demoDeploiements.filter(
          (d) => d.sessionId === sessionId || sessionId === 'session-demo',
        ),
        etablissements: demoEtablissements,
        history: [],
        historyIndex: -1,
        isDirty: false,
      })
      return
    }

    try {
      const [applications, flux, positions, deploiements, etablissements] = await Promise.all([
        api.getApplications(),
        api.getFlux(sessionId),
        api.getPositions(sessionId),
        api.getDeploiements(sessionId),
        api.getEtablissements(),
      ])
      set({
        applications,
        flux,
        positions,
        deploiements,
        etablissements,
        history: [],
        historyIndex: -1,
        isDirty: false,
      })
    } catch (err) {
      console.error('loadSessionData error, falling back to demo', err)
      set({
        demoMode: true,
        applications: demoApplications,
        flux: demoFlux,
        positions: demoPositions,
        deploiements: demoDeploiements,
        etablissements: demoEtablissements,
        history: [],
        historyIndex: -1,
        isDirty: false,
      })
    }
  },

  // ---- pushHistory ----
  _pushHistory: (state) => {
    const { history, historyIndex } = get()
    // Truncate forward history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(makeSnapshot(state))
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  // ---- Applications ----
  addApplication: (app) => {
    const current = get()
    const applications = [...current.applications, app]
    current._pushHistory({ applications, flux: current.flux })
    set({ applications, isDirty: true })
  },

  updateApplication: (id, data) => {
    const current = get()
    const applications = current.applications.map((a) => (a.id === id ? { ...a, ...data } : a))
    current._pushHistory({ applications, flux: current.flux })
    set({ applications, isDirty: true })
  },

  removeApplication: (id) => {
    const current = get()
    const applications = current.applications.filter((a) => a.id !== id)
    const flux = current.flux.filter((f) => f.sourceId !== id && f.cibleId !== id)
    current._pushHistory({ applications, flux })
    set({ applications, flux, isDirty: true })
  },

  // ---- Flux ----
  addFlux: (flux) => {
    const current = get()
    const fluxList = [...current.flux, flux]
    current._pushHistory({ applications: current.applications, flux: fluxList })
    set({ flux: fluxList, isDirty: true })
  },

  updateFlux: (id, data) => {
    const current = get()
    const flux = current.flux.map((f) => (f.id === id ? { ...f, ...data } : f))
    current._pushHistory({ applications: current.applications, flux })
    set({ flux, isDirty: true })
  },

  removeFlux: (id) => {
    const current = get()
    const flux = current.flux.filter((f) => f.id !== id)
    current._pushHistory({ applications: current.applications, flux })
    set({ flux, isDirty: true })
  },

  // ---- Positions ----
  updatePositions: (positions) => {
    set((state) => ({
      positions: { ...state.positions, ...positions },
      isDirty: true,
    }))
  },

  // ---- Etablissements ----
  addEtablissement: (etab) => {
    set((state) => ({ etablissements: [...state.etablissements, etab] }))
  },

  // ---- Deploiements ----
  addDeploiement: (dep) => {
    set((state) => ({ deploiements: [...state.deploiements, dep] }))
  },

  removeDeploiement: (id) => {
    set((state) => ({ deploiements: state.deploiements.filter((d) => d.id !== id) }))
  },

  // ---- Undo / Redo ----
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const snapshot = history[newIndex]
    set({
      applications: snapshot.applications,
      flux: snapshot.flux,
      historyIndex: newIndex,
      isDirty: true,
    })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    const snapshot = history[newIndex]
    set({
      applications: snapshot.applications,
      flux: snapshot.flux,
      historyIndex: newIndex,
      isDirty: true,
    })
  },

  // ---- markSaved ----
  markSaved: () => set({ isDirty: false }),

  // ---- setDemoMode ----
  setDemoMode: (bool) => set({ demoMode: bool }),

  // ---- updateSessionStatus ----
  updateSessionStatus: async (newStatus) => {
    const { session, demoMode } = get()
    if (!session) return
    const updated = { ...session, statut: newStatus }
    set({ session: updated })
    if (!demoMode) {
      try {
        await api.updateSession(session.id, { statut: newStatus })
      } catch (err) {
        console.warn('Could not update session status', err)
      }
    }
    // Update in sessions list
    set((state) => ({
      sessions: state.sessions.map((s) => s.id === session.id ? { ...s, statut: newStatus } : s),
    }))
  },

  // ---- refreshSessions ----
  refreshSessions: async () => {
    const { demoMode } = get()
    if (demoMode) {
      set({ sessions: [{ ...demoSession, _appCount: demoApplications.length, _fluxCount: demoFlux.length }] })
    } else {
      try {
        const sessions = await api.getSessions()
        set({ sessions })
      } catch {
        // keep existing
      }
    }
  },
}))

export default useSessionStore
