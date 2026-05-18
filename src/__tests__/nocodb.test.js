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

const api = await import('../api/nocodb')

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── getApplications ──────────────────────────────────────────────────────────

describe('getApplications', () => {
  it('retourne le tableau list de la réponse', async () => {
    const apps = [{ Id: 1, Nom: 'SAP' }, { Id: 2, Nom: 'Mediboard' }]
    mockInstance.get.mockResolvedValue({ data: { list: apps } })

    const result = await api.getApplications()

    expect(result).toEqual(apps)
    expect(mockInstance.get).toHaveBeenCalledWith('/Applications?limit=200')
  })

  it('retourne un tableau vide si list est absent', async () => {
    mockInstance.get.mockResolvedValue({ data: {} })

    const result = await api.getApplications()

    expect(result).toEqual([])
  })
})

// ─── createApplication ────────────────────────────────────────────────────────

describe('createApplication', () => {
  it('envoie les données en POST et retourne la réponse', async () => {
    const payload = { nom: 'SAP ERP', criticite: 'haute' }
    const created = { Id: 42, ...payload }
    mockInstance.post.mockResolvedValue({ data: created })

    const result = await api.createApplication(payload)

    expect(mockInstance.post).toHaveBeenCalledWith('/Applications', payload)
    expect(result).toEqual(created)
  })
})

// ─── updateApplication ────────────────────────────────────────────────────────

describe('updateApplication', () => {
  it('envoie un PATCH avec l\'id et les données', async () => {
    mockInstance.patch.mockResolvedValue({ data: { Id: 1, nom: 'SAP S/4HANA' } })

    await api.updateApplication('app-1', { nom: 'SAP S/4HANA' })

    expect(mockInstance.patch).toHaveBeenCalledWith('/Applications/app-1', { nom: 'SAP S/4HANA' })
  })
})

// ─── deleteApplication ────────────────────────────────────────────────────────

describe('deleteApplication', () => {
  it('appelle DELETE avec le bon identifiant', async () => {
    mockInstance.delete.mockResolvedValue({ data: {} })

    await api.deleteApplication('app-123')

    expect(mockInstance.delete).toHaveBeenCalledWith('/Applications/app-123')
  })
})

// ─── getFlux ──────────────────────────────────────────────────────────────────

describe('getFlux', () => {
  it('filtre par sessionId si fourni', async () => {
    mockInstance.get.mockResolvedValue({ data: { list: [] } })

    await api.getFlux('session-1')

    const url = mockInstance.get.mock.calls[0][0]
    expect(url).toContain('session-1')
  })

  it('ne filtre pas si sessionId est absent', async () => {
    mockInstance.get.mockResolvedValue({ data: { list: [] } })

    await api.getFlux()

    const url = mockInstance.get.mock.calls[0][0]
    expect(url).not.toContain('where')
  })
})

// ─── Retry logic ──────────────────────────────────────────────────────────────

describe('retry sur erreur réseau', () => {
  it('réessaie jusqu\'à 3 fois sur erreur réseau et réussit', async () => {
    const networkError = new Error('Network Error')
    mockInstance.get
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ data: { list: [{ Id: 1 }] } })

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
  it('crée une nouvelle position si elle n\'existe pas encore', async () => {
    mockInstance.get.mockResolvedValue({ data: { list: [] } })
    mockInstance.post.mockResolvedValue({ data: {} })

    await api.savePositions('session-1', { 'app-1': { x: 100, y: 200 } })

    expect(mockInstance.post).toHaveBeenCalledWith('/Positions', {
      sessionId: 'session-1',
      applicationId: 'app-1',
      x: 100,
      y: 200,
    })
  })

  it('met à jour une position existante via PATCH', async () => {
    mockInstance.get.mockResolvedValue({
      data: { list: [{ Id: 99, applicationId: 'app-1', x: 0, y: 0 }] },
    })
    mockInstance.patch.mockResolvedValue({ data: {} })

    await api.savePositions('session-1', { 'app-1': { x: 350, y: 450 } })

    expect(mockInstance.patch).toHaveBeenCalledWith('/Positions/99', { x: 350, y: 450 })
    expect(mockInstance.post).not.toHaveBeenCalled()
  })

  it('gère plusieurs positions en parallèle', async () => {
    mockInstance.get.mockResolvedValue({ data: { list: [] } })
    mockInstance.post.mockResolvedValue({ data: {} })

    await api.savePositions('session-1', {
      'app-1': { x: 100, y: 200 },
      'app-2': { x: 300, y: 400 },
    })

    expect(mockInstance.post).toHaveBeenCalledTimes(2)
  })
})
