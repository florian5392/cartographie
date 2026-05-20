import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock API before any imports
vi.mock('../api/api', () => ({
  isAPIReachable: vi.fn().mockResolvedValue(true),
  getSessions: vi.fn().mockResolvedValue([]),
  getApplications: vi.fn().mockResolvedValue([]),
  getFlux: vi.fn().mockResolvedValue([]),
  getPositions: vi.fn().mockResolvedValue({}),
  getDeploiements: vi.fn().mockResolvedValue([]),
  getEtablissements: vi.fn().mockResolvedValue([]),
  updateSession: vi.fn().mockResolvedValue({}),
  savePositions: vi.fn().mockResolvedValue({}),
  upsertApplication: vi.fn().mockResolvedValue({}),
  deleteApplication: vi.fn().mockResolvedValue({}),
  createFlux: vi.fn().mockResolvedValue({ id: 'flux-new' }),
  updateFlux: vi.fn().mockResolvedValue({}),
  deleteFlux: vi.fn().mockResolvedValue({}),
}))

const { useAutoSave } = await import('../hooks/useAutoSave')
const api = await import('../api/api')
const { default: useSessionStore } = await import('../stores/sessionStore')

const SESSION = { id: 'sess-1', nom: 'Test', perimetre: 'mono-site' }
const APP1 = { id: 'app-1', nom: 'Alpha', criticite: 'haute', sessionId: 'sess-1' }
const APP2 = { id: 'app-2', nom: 'Beta', criticite: 'basse', sessionId: 'sess-1' }
const FLUX1 = { id: 'flux-1', sourceId: 'app-1', cibleId: 'app-2', type: 'API', sessionId: 'sess-1' }

function resetStore(overrides = {}) {
  useSessionStore.setState({
    session: SESSION,
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
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetStore()
})

// ─── Conditions de skip ────────────────────────────────────────────────────────

describe('useAutoSave — conditions de non-sauvegarde', () => {
  it('ne sauvegarde pas quand isDirty est false', async () => {
    resetStore({ isDirty: false })
    const { result } = renderHook(() => useAutoSave(99999))
    await act(() => result.current.save())
    expect(api.savePositions).not.toHaveBeenCalled()
  })

  it('ne sauvegarde pas en demoMode', async () => {
    resetStore({ isDirty: true, demoMode: true })
    const { result } = renderHook(() => useAutoSave(99999))
    await act(() => result.current.save())
    expect(api.savePositions).not.toHaveBeenCalled()
  })

  it('ne sauvegarde pas sans session', async () => {
    resetStore({ isDirty: true, session: null })
    const { result } = renderHook(() => useAutoSave(99999))
    await act(() => result.current.save())
    expect(api.savePositions).not.toHaveBeenCalled()
  })
})

// ─── Diff Applications ─────────────────────────────────────────────────────────

describe('useAutoSave — diff applications', () => {
  it('upsert une application absente du dernier snapshot', async () => {
    resetStore({ applications: [APP1], isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    await act(() => result.current.save())

    expect(api.upsertApplication).toHaveBeenCalledOnce()
    expect(api.upsertApplication).toHaveBeenCalledWith(expect.objectContaining({ id: APP1.id }))
  })

  it('upsert une application modifiée depuis le dernier snapshot', async () => {
    resetStore({ applications: [APP1], isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    // 1re save : APP1 devient "connu"
    await act(() => result.current.save())
    vi.clearAllMocks()

    // Modification puis 2e save
    const modified = { ...APP1, nom: 'Alpha Modifiée' }
    resetStore({ applications: [modified], isDirty: true })
    await act(() => result.current.save())

    expect(api.upsertApplication).toHaveBeenCalledOnce()
    expect(api.upsertApplication).toHaveBeenCalledWith(expect.objectContaining({ id: APP1.id }))
  })

  it('ne upsert pas une application inchangée', async () => {
    resetStore({ applications: [APP1], isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    await act(() => result.current.save())
    vi.clearAllMocks()

    // Même état, isDirty remis à true manuellement
    resetStore({ applications: [APP1], isDirty: true })
    await act(() => result.current.save())

    expect(api.upsertApplication).not.toHaveBeenCalled()
  })

  it('supprime une application retirée depuis le dernier snapshot', async () => {
    resetStore({ applications: [APP1, APP2], isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    await act(() => result.current.save())
    vi.clearAllMocks()

    // APP2 supprimée du store
    resetStore({ applications: [APP1], isDirty: true })
    await act(() => result.current.save())

    expect(api.deleteApplication).toHaveBeenCalledOnce()
    expect(api.deleteApplication).toHaveBeenCalledWith(APP2.id)
  })
})

// ─── Diff Flux ─────────────────────────────────────────────────────────────────

describe('useAutoSave — diff flux', () => {
  it('crée un flux absent du dernier snapshot', async () => {
    resetStore({ flux: [FLUX1], isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    await act(() => result.current.save())

    expect(api.createFlux).toHaveBeenCalledOnce()
    expect(api.createFlux).toHaveBeenCalledWith(expect.objectContaining({ id: FLUX1.id }))
  })

  it('met à jour un flux modifié', async () => {
    resetStore({ flux: [FLUX1], isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    await act(() => result.current.save())
    vi.clearAllMocks()

    const modifiedFlux = { ...FLUX1, type: 'BDD' }
    resetStore({ flux: [modifiedFlux], isDirty: true })
    await act(() => result.current.save())

    expect(api.updateFlux).toHaveBeenCalledOnce()
    expect(api.updateFlux).toHaveBeenCalledWith(FLUX1.id, modifiedFlux)
  })

  it('supprime un flux retiré depuis le dernier snapshot', async () => {
    resetStore({ flux: [FLUX1], isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    await act(() => result.current.save())
    vi.clearAllMocks()

    resetStore({ flux: [], isDirty: true })
    await act(() => result.current.save())

    expect(api.deleteFlux).toHaveBeenCalledOnce()
    expect(api.deleteFlux).toHaveBeenCalledWith(FLUX1.id)
  })
})

// ─── File offline ──────────────────────────────────────────────────────────────

describe('useAutoSave — file offline', () => {
  it('vide la file avant d\'appeler l\'API', async () => {
    resetStore({ isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    const order = []
    const offlineOp = vi.fn().mockImplementation(() => {
      order.push('offline')
      return Promise.resolve()
    })
    api.savePositions.mockImplementation(() => {
      order.push('positions')
      return Promise.resolve({})
    })

    result.current.offlineQueue.current.push(offlineOp)
    await act(() => result.current.save())

    expect(offlineOp).toHaveBeenCalledOnce()
    expect(result.current.offlineQueue.current).toHaveLength(0)
    expect(order[0]).toBe('offline')
    expect(order[1]).toBe('positions')
  })

  it('vide toutes les opérations de la file en ordre', async () => {
    resetStore({ isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    const calls = []
    const makeOp = (label) => vi.fn().mockImplementation(() => {
      calls.push(label)
      return Promise.resolve()
    })

    result.current.offlineQueue.current.push(makeOp('op1'), makeOp('op2'), makeOp('op3'))
    await act(() => result.current.save())

    expect(calls).toEqual(['op1', 'op2', 'op3'])
    expect(result.current.offlineQueue.current).toHaveLength(0)
  })
})

// ─── Statut de sauvegarde ──────────────────────────────────────────────────────

describe('useAutoSave — saveStatus', () => {
  it('appelle markSaved après une sauvegarde réussie', async () => {
    resetStore({ isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    await act(() => result.current.save())

    expect(useSessionStore.getState().isDirty).toBe(false)
  })

  it('saveStatus passe à "saved" après la sauvegarde', async () => {
    resetStore({ isDirty: true })
    const { result } = renderHook(() => useAutoSave(99999))

    await act(() => result.current.save())

    expect(result.current.saveStatus).toBe('saved')
  })
})
