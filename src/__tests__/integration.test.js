/**
 * Scénario d'intégration : atelier complet
 *
 * Teste le cycle de vie complet d'un mapping applicatif au niveau du store :
 * création de données → modifications → sauvegarde → undo/redo → reset session.
 * Aucune couche UI ni appel réseau réel.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

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

const { default: useSessionStore } = await import('../stores/sessionStore')

function gs() {
  return useSessionStore.getState()
}

function resetStore() {
  useSessionStore.setState({
    session: { id: 'sess-int', nom: 'Intégration', perimetre: 'mono-site' },
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

function makeApp(i) {
  return { id: `app-${i}`, nom: `Application ${i}`, criticite: 'basse', sessionId: 'sess-int' }
}

function makeFlux(i, src, tgt) {
  return { id: `flux-${i}`, sourceId: src, cibleId: tgt, type: 'API', sessionId: 'sess-int' }
}

beforeEach(resetStore)

// ─── Ajout d'applications ──────────────────────────────────────────────────────

describe('intégration — ajout applications', () => {
  it('ajoute 5 applications et marque isDirty', () => {
    const store = gs()
    for (let i = 0; i < 5; i++) store.addApplication(makeApp(i))

    expect(gs().applications).toHaveLength(5)
    expect(gs().isDirty).toBe(true)
  })

  it('chaque ajout pousse une entrée dans l\'historique', () => {
    const store = gs()
    store.addApplication(makeApp(0))
    store.addApplication(makeApp(1))

    // historyIndex = 1 (2 snapshots, index démarre à 0)
    expect(gs().historyIndex).toBe(1)
    expect(gs().history).toHaveLength(2)
  })
})

// ─── Ajout de flux ─────────────────────────────────────────────────────────────

describe('intégration — ajout flux', () => {
  it('ajoute 4 flux entre 5 applications', () => {
    const store = gs()
    for (let i = 0; i < 5; i++) store.addApplication(makeApp(i))
    store.addFlux(makeFlux(0, 'app-0', 'app-1'))
    store.addFlux(makeFlux(1, 'app-1', 'app-2'))
    store.addFlux(makeFlux(2, 'app-2', 'app-3'))
    store.addFlux(makeFlux(3, 'app-3', 'app-4'))

    expect(gs().flux).toHaveLength(4)
  })
})

// ─── Suppression en cascade ────────────────────────────────────────────────────

describe('intégration — suppression en cascade', () => {
  beforeEach(() => {
    const store = gs()
    for (let i = 0; i < 5; i++) store.addApplication(makeApp(i))
    // app-1 est source de flux-0, cible de flux-1
    store.addFlux(makeFlux(0, 'app-0', 'app-1'))
    store.addFlux(makeFlux(1, 'app-1', 'app-2'))
    store.addFlux(makeFlux(2, 'app-2', 'app-3'))
    store.addFlux(makeFlux(3, 'app-3', 'app-4'))
  })

  it('supprime app-1 et ses 2 flux associés', () => {
    gs().removeApplication('app-1')

    expect(gs().applications).toHaveLength(4)
    expect(gs().flux).toHaveLength(2)
    const ids = gs().flux.map(f => f.id)
    expect(ids).not.toContain('flux-0')
    expect(ids).not.toContain('flux-1')
    expect(ids).toContain('flux-2')
    expect(ids).toContain('flux-3')
  })
})

// ─── Undo / Redo ───────────────────────────────────────────────────────────────

describe('intégration — undo/redo', () => {
  it('undo annule la suppression en cascade et restaure app + flux', () => {
    const store = gs()
    for (let i = 0; i < 5; i++) store.addApplication(makeApp(i))
    store.addFlux(makeFlux(0, 'app-0', 'app-1'))
    store.addFlux(makeFlux(1, 'app-1', 'app-2'))

    store.removeApplication('app-1')
    expect(gs().applications).toHaveLength(4)
    expect(gs().flux).toHaveLength(0)

    store.undo()
    expect(gs().applications).toHaveLength(5)
    expect(gs().flux).toHaveLength(2)
  })

  it('redo rétablit la suppression après undo', () => {
    const store = gs()
    for (let i = 0; i < 5; i++) store.addApplication(makeApp(i))
    store.addFlux(makeFlux(0, 'app-0', 'app-1'))
    store.addFlux(makeFlux(1, 'app-1', 'app-2'))

    store.removeApplication('app-1')
    store.undo()
    store.redo()

    expect(gs().applications).toHaveLength(4)
    expect(gs().flux).toHaveLength(0)
  })

  it('une nouvelle action après undo efface la branche redo', () => {
    const store = gs()
    store.addApplication(makeApp(0))
    store.addApplication(makeApp(1))
    store.addApplication(makeApp(2))

    store.undo()
    store.undo()
    // historyIndex = 0 (1 app dans le snapshot), 2 entrées de redo disponibles

    // Nouvelle action
    store.addApplication(makeApp(99))

    // Redo ne doit plus rien faire
    const indexBefore = gs().historyIndex
    store.redo()
    expect(gs().historyIndex).toBe(indexBefore)
    expect(gs().applications.map(a => a.id)).not.toContain('app-2')
  })

  it('undo bloque au premier snapshot : 5 ajouts → 5 undos → 1 app reste', () => {
    const store = gs()
    for (let i = 0; i < 5; i++) store.addApplication(makeApp(i))
    // 5 ajouts → historyIndex = 4, snapshot[0] contient 1 app
    // undo bloque quand historyIndex <= 0, donc on ne peut pas revenir à 0 app

    for (let i = 0; i < 5; i++) store.undo()

    expect(gs().applications).toHaveLength(1) // bloqué au snapshot[0]
    expect(gs().historyIndex).toBe(0)
  })
})

// ─── Positions ─────────────────────────────────────────────────────────────────

describe('intégration — positions', () => {
  it('met à jour les positions sans pousser dans l\'historique', () => {
    const store = gs()
    store.addApplication(makeApp(0))
    const histBefore = gs().history.length

    store.updatePositions({ 'app-0': { x: 100, y: 200 } })

    expect(gs().positions['app-0']).toEqual({ x: 100, y: 200 })
    expect(gs().history.length).toBe(histBefore) // pas de nouvelle entrée
    expect(gs().isDirty).toBe(true)
  })

  it('fusionne les positions existantes', () => {
    const store = gs()
    store.updatePositions({ 'app-0': { x: 10, y: 20 } })
    store.updatePositions({ 'app-1': { x: 50, y: 60 } })

    expect(gs().positions['app-0']).toEqual({ x: 10, y: 20 })
    expect(gs().positions['app-1']).toEqual({ x: 50, y: 60 })
  })
})

// ─── markSaved / reset session ────────────────────────────────────────────────

describe('intégration — markSaved et reset session', () => {
  it('markSaved passe isDirty à false', () => {
    const store = gs()
    store.addApplication(makeApp(0))
    expect(gs().isDirty).toBe(true)

    store.markSaved()
    expect(gs().isDirty).toBe(false)
  })

  it('setSession(null) remet toutes les données à zéro', async () => {
    const store = gs()
    store.addApplication(makeApp(0))
    store.addFlux(makeFlux(0, 'app-0', 'app-x'))
    store.updatePositions({ 'app-0': { x: 1, y: 2 } })

    await store.setSession(null)

    const s = gs()
    expect(s.session).toBeNull()
    expect(s.applications).toHaveLength(0)
    expect(s.flux).toHaveLength(0)
    expect(s.positions).toEqual({})
    expect(s.isDirty).toBe(false)
    expect(s.history).toHaveLength(0)
    expect(s.historyIndex).toBe(-1)
  })
})

// ─── Scénario complet ──────────────────────────────────────────────────────────

describe('intégration — scénario atelier complet', () => {
  it('crée 5 apps, 4 flux, modifie, supprime, undo, redo, sauvegarde', () => {
    const store = gs()

    // 1. Ajouter 5 applications
    for (let i = 0; i < 5; i++) store.addApplication(makeApp(i))
    expect(gs().applications).toHaveLength(5)

    // 2. Ajouter 4 flux en chaîne
    for (let i = 0; i < 4; i++) {
      store.addFlux(makeFlux(i, `app-${i}`, `app-${i + 1}`))
    }
    expect(gs().flux).toHaveLength(4)

    // 3. Modifier une application
    store.updateApplication('app-0', { nom: 'Application 0 — Modifiée' })
    expect(gs().applications.find(a => a.id === 'app-0').nom).toBe('Application 0 — Modifiée')

    // 4. Supprimer app-2 (source de flux-1, cible de flux-2)
    store.removeApplication('app-2')
    expect(gs().applications).toHaveLength(4)
    expect(gs().flux).toHaveLength(2) // flux-1 et flux-2 supprimés

    // 5. Undo : restaurer app-2 et ses flux
    store.undo()
    expect(gs().applications).toHaveLength(5)
    expect(gs().flux).toHaveLength(4)

    // 6. Redo : re-supprimer app-2
    store.redo()
    expect(gs().applications).toHaveLength(4)
    expect(gs().flux).toHaveLength(2)

    // 7. Marquer comme sauvegardé
    store.markSaved()
    expect(gs().isDirty).toBe(false)
  })
})
