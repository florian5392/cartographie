import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the API module so store tests don't make real HTTP calls
vi.mock('../api/nocodb', () => ({
  isNocoDBReachable: vi.fn().mockResolvedValue(false),
  getSessions: vi.fn().mockResolvedValue([]),
  getApplications: vi.fn().mockResolvedValue([]),
  getFlux: vi.fn().mockResolvedValue([]),
  getPositions: vi.fn().mockResolvedValue({}),
  getDeploiements: vi.fn().mockResolvedValue([]),
  getEtablissements: vi.fn().mockResolvedValue([]),
  updateSession: vi.fn().mockResolvedValue({}),
}))

// Import store AFTER mocks are in place
const { default: useSessionStore } = await import('../stores/sessionStore')

function getState() {
  return useSessionStore.getState()
}

function resetStore() {
  useSessionStore.setState({
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
  })
}

// ─── Applications ────────────────────────────────────────────────────────────

describe('sessionStore — applications', () => {
  beforeEach(resetStore)

  it('addApplication ajoute une app et marque isDirty', () => {
    const app = { id: 'a1', nom: 'SAP ERP', criticite: 'haute' }
    getState().addApplication(app)

    expect(getState().applications).toHaveLength(1)
    expect(getState().applications[0]).toMatchObject(app)
    expect(getState().isDirty).toBe(true)
  })

  it('updateApplication modifie une app existante', () => {
    getState().addApplication({ id: 'a1', nom: 'SAP ERP', criticite: 'haute' })
    getState().updateApplication('a1', { nom: 'SAP S/4HANA' })

    expect(getState().applications[0].nom).toBe('SAP S/4HANA')
    expect(getState().applications[0].criticite).toBe('haute') // autres champs préservés
  })

  it('removeApplication supprime l\'app et ses flux associés', () => {
    getState().addApplication({ id: 'a1', nom: 'App A' })
    getState().addApplication({ id: 'a2', nom: 'App B' })
    getState().addFlux({ id: 'f1', sourceId: 'a1', cibleId: 'a2' })
    getState().addFlux({ id: 'f2', sourceId: 'a2', cibleId: 'a1' })
    getState().addFlux({ id: 'f3', sourceId: 'a2', cibleId: 'a2' }) // flux sans a1

    getState().removeApplication('a1')

    expect(getState().applications).toHaveLength(1)
    expect(getState().applications[0].id).toBe('a2')
    // f1 et f2 supprimés car liés à a1, f3 préservé
    expect(getState().flux).toHaveLength(1)
    expect(getState().flux[0].id).toBe('f3')
  })
})

// ─── Flux ────────────────────────────────────────────────────────────────────

describe('sessionStore — flux', () => {
  beforeEach(resetStore)

  it('addFlux ajoute un flux et marque isDirty', () => {
    const flux = { id: 'f1', sourceId: 'a1', cibleId: 'a2', type: 'API' }
    getState().addFlux(flux)

    expect(getState().flux).toHaveLength(1)
    expect(getState().isDirty).toBe(true)
  })

  it('removeFlux supprime uniquement le flux ciblé', () => {
    getState().addFlux({ id: 'f1', sourceId: 'a1', cibleId: 'a2' })
    getState().addFlux({ id: 'f2', sourceId: 'a2', cibleId: 'a3' })
    getState().removeFlux('f1')

    expect(getState().flux).toHaveLength(1)
    expect(getState().flux[0].id).toBe('f2')
  })
})

// ─── Undo / Redo ─────────────────────────────────────────────────────────────

describe('sessionStore — undo/redo', () => {
  beforeEach(resetStore)

  it('undo annule le dernier ajout d\'application', () => {
    getState().addApplication({ id: 'a1', nom: 'App A' })
    getState().addApplication({ id: 'a2', nom: 'App B' })

    expect(getState().applications).toHaveLength(2)

    getState().undo()

    expect(getState().applications).toHaveLength(1)
    expect(getState().applications[0].id).toBe('a1')
  })

  it('redo rétablit une action annulée', () => {
    getState().addApplication({ id: 'a1', nom: 'App A' })
    getState().addApplication({ id: 'a2', nom: 'App B' })
    getState().undo()

    expect(getState().applications).toHaveLength(1)

    getState().redo()

    expect(getState().applications).toHaveLength(2)
  })

  it('undo puis nouvel ajout efface le redo', () => {
    getState().addApplication({ id: 'a1', nom: 'App A' })
    getState().addApplication({ id: 'a2', nom: 'App B' })
    getState().undo()
    getState().addApplication({ id: 'a3', nom: 'App C' }) // nouvelle action

    // redo ne peut plus revenir à a2
    getState().redo()
    const ids = getState().applications.map(a => a.id)
    expect(ids).not.toContain('a2')
    expect(ids).toContain('a3')
  })

  it('undo ne descend pas en dessous de l\'état initial', () => {
    getState().addApplication({ id: 'a1', nom: 'App A' })
    getState().undo()
    getState().undo() // ne doit pas crasher
    getState().undo()

    // L'état minimal : 0 ou 1 app selon le snapshot initial
    expect(getState().applications.length).toBeLessThanOrEqual(1)
  })

  it('enchaîner 10 actions puis 5 undos restaure l\'état intermédiaire', () => {
    for (let i = 1; i <= 10; i++) {
      getState().addApplication({ id: `a${i}`, nom: `App ${i}` })
    }
    expect(getState().applications).toHaveLength(10)

    for (let i = 0; i < 5; i++) getState().undo()

    expect(getState().applications).toHaveLength(5)
  })

  it('l\'historique ne dépasse pas 50 entrées', () => {
    for (let i = 1; i <= 60; i++) {
      getState().addApplication({ id: `a${i}`, nom: `App ${i}` })
    }

    expect(getState().history.length).toBeLessThanOrEqual(50)
  })
})

// ─── Positions ───────────────────────────────────────────────────────────────

describe('sessionStore — positions', () => {
  beforeEach(resetStore)

  it('updatePositions fusionne avec les positions existantes', () => {
    getState().updatePositions({ 'a1': { x: 100, y: 200 } })
    getState().updatePositions({ 'a2': { x: 300, y: 400 } })

    expect(getState().positions['a1']).toEqual({ x: 100, y: 200 })
    expect(getState().positions['a2']).toEqual({ x: 300, y: 400 })
  })

  it('updatePositions écrase une position existante', () => {
    getState().updatePositions({ 'a1': { x: 100, y: 200 } })
    getState().updatePositions({ 'a1': { x: 500, y: 600 } })

    expect(getState().positions['a1']).toEqual({ x: 500, y: 600 })
  })

  it('updatePositions marque isDirty mais ne pousse pas dans l\'historique', () => {
    getState().addApplication({ id: 'a1', nom: 'App A' })
    const historyLenBefore = getState().history.length

    getState().updatePositions({ 'a1': { x: 50, y: 50 } })

    expect(getState().isDirty).toBe(true)
    expect(getState().history.length).toBe(historyLenBefore) // pas de snapshot position
  })
})

// ─── Session lifecycle ────────────────────────────────────────────────────────

describe('sessionStore — cycle de vie session', () => {
  beforeEach(resetStore)

  it('setSession(null) remet le store à zéro', async () => {
    getState().addApplication({ id: 'a1', nom: 'App A' })
    getState().addFlux({ id: 'f1', sourceId: 'a1', cibleId: 'a1' })

    await getState().setSession(null)

    expect(getState().session).toBeNull()
    expect(getState().applications).toHaveLength(0)
    expect(getState().flux).toHaveLength(0)
    expect(getState().isDirty).toBe(false)
  })

  it('markSaved remet isDirty à false', () => {
    getState().addApplication({ id: 'a1', nom: 'App A' })
    expect(getState().isDirty).toBe(true)

    getState().markSaved()
    expect(getState().isDirty).toBe(false)
  })

  it('updateSessionStatus met à jour le statut de la session courante', async () => {
    useSessionStore.setState({ session: { id: 's1', nom: 'Test', statut: 'en cours' }, demoMode: true })

    await getState().updateSessionStatus('terminée')

    expect(getState().session.statut).toBe('terminée')
  })
})
