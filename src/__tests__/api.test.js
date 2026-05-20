import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted s'exécute avant les imports — nécessaire pour que l'instance soit
// disponible dans la factory de vi.mock (qui est elle-même hoistée)
const mockInstance = vi.hoisted(() => ({
  get:    vi.fn(),
  post:   vi.fn(),
  patch:  vi.fn(),
  delete: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockInstance),
    get: vi.fn(),
  },
}))

const api = await import('../api/api')

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── getApplications ──────────────────────────────────────────────────────────

describe('getApplications', () => {
  it('retourne un tableau mappé depuis la réponse', async () => {
    const rows = [
      { id: '1', nom: 'SAP', type: null, editeur: null, version: null, criticite: 'basse', perimetre: null, statut: 'production', description: null, responsable: null },
      { id: '2', nom: 'Mediboard', type: null, editeur: null, version: null, criticite: 'haute', perimetre: null, statut: 'production', description: null, responsable: null },
    ]
    mockInstance.get.mockResolvedValue({ data: rows })

    const result = await api.getApplications()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: '1', nom: 'SAP' })
    expect(mockInstance.get).toHaveBeenCalledWith('/applications?limit=500')
  })

  it('retourne un tableau vide si la réponse est vide', async () => {
    mockInstance.get.mockResolvedValue({ data: [] })

    const result = await api.getApplications()

    expect(result).toEqual([])
  })
})

// ─── upsertApplication ────────────────────────────────────────────────────────

describe('upsertApplication', () => {
  it('envoie les données en POST avec merge-duplicates', async () => {
    mockInstance.post.mockResolvedValue({ data: [] })
    const payload = { id: '42', nom: 'SAP ERP', criticite: 'haute', type: null, editeur: null, version: null, perimetre: null, statut: 'production', description: null, responsable: null }

    await api.upsertApplication(payload)

    expect(mockInstance.post).toHaveBeenCalledWith(
      '/applications',
      expect.objectContaining({ nom: 'SAP ERP' }),
      expect.objectContaining({ headers: expect.objectContaining({ Prefer: 'resolution=merge-duplicates' }) }),
    )
  })
})

// ─── deleteApplication ────────────────────────────────────────────────────────

describe('deleteApplication', () => {
  it('appelle DELETE avec le bon filtre', async () => {
    mockInstance.delete.mockResolvedValue({ data: {} })

    await api.deleteApplication('app-123')

    expect(mockInstance.delete).toHaveBeenCalledWith('/applications?id=eq.app-123')
  })
})

// ─── getFlux ──────────────────────────────────────────────────────────────────

describe('getFlux', () => {
  it('filtre par session_id si sessionId est fourni', async () => {
    mockInstance.get.mockResolvedValue({ data: [] })

    await api.getFlux('session-1')

    const url = mockInstance.get.mock.calls[0][0]
    expect(url).toContain('session_id=eq.session-1')
  })

  it('ne filtre pas si sessionId est absent', async () => {
    mockInstance.get.mockResolvedValue({ data: [] })

    await api.getFlux()

    const url = mockInstance.get.mock.calls[0][0]
    expect(url).not.toContain('session_id')
  })

  it('mappe session_id → sessionId dans les résultats', async () => {
    mockInstance.get.mockResolvedValue({
      data: [{ id: 'f1', session_id: 's1', source_id: 'a1', cible_id: 'a2', type: 'API', label: null, description: null, frequence: null, critique: false }],
    })

    const result = await api.getFlux('s1')

    expect(result[0]).toMatchObject({ id: 'f1', sessionId: 's1', sourceId: 'a1', cibleId: 'a2' })
  })
})

// ─── Retry logic ──────────────────────────────────────────────────────────────

describe('retry sur erreur réseau', () => {
  it('réessaie jusqu\'à 3 fois sur erreur réseau et réussit', async () => {
    const networkError = new Error('Network Error')
    const row = { id: '1', nom: 'SAP', type: null, editeur: null, version: null, criticite: 'basse', perimetre: null, statut: 'production', description: null, responsable: null }
    mockInstance.get
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ data: [row] })

    const result = await api.getApplications()

    expect(mockInstance.get).toHaveBeenCalledTimes(3)
    expect(result).toHaveLength(1)
  }, 15000)

  it('ne réessaie pas sur erreur 404 (4xx)', async () => {
    const notFoundError = new Error('Not Found')
    notFoundError.response = { status: 404 }
    mockInstance.get.mockRejectedValue(notFoundError)

    await expect(api.getApplications()).rejects.toThrow('Not Found')
    expect(mockInstance.get).toHaveBeenCalledTimes(1)
  })

  it('lève une erreur après 3 tentatives réseau échouées', async () => {
    const networkError = new Error('Network Error')
    mockInstance.get.mockRejectedValue(networkError)

    await expect(api.getApplications()).rejects.toThrow('Network Error')
    expect(mockInstance.get).toHaveBeenCalledTimes(4) // 1 essai + 3 retries
  }, 15000)
})

// ─── savePositions ────────────────────────────────────────────────────────────

describe('savePositions', () => {
  it('envoie un POST upsert avec l\'en-tête merge-duplicates', async () => {
    mockInstance.post.mockResolvedValue({ data: {} })

    await api.savePositions('session-1', { 'app-1': { x: 100, y: 200 } })

    expect(mockInstance.post).toHaveBeenCalledWith(
      '/positions',
      [{ session_id: 'session-1', application_id: 'app-1', x: 100, y: 200 }],
      expect.objectContaining({ headers: expect.objectContaining({ Prefer: 'resolution=merge-duplicates' }) }),
    )
  })

  it('n\'appelle pas l\'API si positions est vide', async () => {
    await api.savePositions('session-1', {})

    expect(mockInstance.post).not.toHaveBeenCalled()
  })

  it('gère plusieurs positions en un seul POST', async () => {
    mockInstance.post.mockResolvedValue({ data: {} })

    await api.savePositions('session-1', {
      'app-1': { x: 100, y: 200 },
      'app-2': { x: 300, y: 400 },
    })

    expect(mockInstance.post).toHaveBeenCalledTimes(1)
    const rows = mockInstance.post.mock.calls[0][1]
    expect(rows).toHaveLength(2)
  })
})
