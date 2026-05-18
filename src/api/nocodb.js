import axios from 'axios'

const BASE_URL = import.meta.env.VITE_NOCODB_URL || 'http://localhost:8080'
const TOKEN = import.meta.env.VITE_NOCODB_TOKEN || ''
const BASE_ID = import.meta.env.VITE_NOCODB_BASE_ID || ''

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1/db/data/noco/${BASE_ID}`,
  headers: {
    'xc-token': TOKEN,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Retry logic for network errors only (not 4xx)
async function withRetry(fn, retries = 3, delay = 1000) {
  try {
    return await fn()
  } catch (err) {
    if (retries > 0 && (!err.response || err.code === 'ECONNABORTED')) {
      await new Promise((r) => setTimeout(r, delay))
      return withRetry(fn, retries - 1, delay * 2)
    }
    throw err
  }
}

export async function isNocoDBReachable() {
  try {
    const checkApi = axios.create({
      baseURL: BASE_URL,
      headers: { 'xc-token': TOKEN },
      timeout: 5000,
    })
    await checkApi.get('/api/v1/db/meta/projects/')
    return true
  } catch (err) {
    // Any error (network, 4xx, 5xx) means not reachable for our purposes
    if (err.response && err.response.status < 500) {
      // Got a response (even 401/403) — server is up
      return true
    }
    return false
  }
}

// ---- Applications ----

export async function getApplications() {
  return withRetry(async () => {
    const res = await api.get('/Applications?limit=200')
    return res.data.list || []
  })
}

export async function createApplication(data) {
  return withRetry(async () => {
    const res = await api.post('/Applications', data)
    return res.data
  })
}

export async function updateApplication(id, data) {
  return withRetry(async () => {
    const res = await api.patch(`/Applications/${id}`, data)
    return res.data
  })
}

export async function deleteApplication(id) {
  return withRetry(async () => {
    const res = await api.delete(`/Applications/${id}`)
    return res.data
  })
}

// ---- Flux ----

export async function getFlux(sessionId) {
  return withRetry(async () => {
    const where = sessionId ? `?where=(sessionId,eq,${sessionId})&limit=200` : '?limit=200'
    const res = await api.get(`/Flux${where}`)
    return res.data.list || []
  })
}

export async function createFlux(data) {
  return withRetry(async () => {
    const res = await api.post('/Flux', data)
    return res.data
  })
}

export async function updateFlux(id, data) {
  return withRetry(async () => {
    const res = await api.patch(`/Flux/${id}`, data)
    return res.data
  })
}

export async function deleteFlux(id) {
  return withRetry(async () => {
    const res = await api.delete(`/Flux/${id}`)
    return res.data
  })
}

// ---- Etablissements ----

export async function getEtablissements() {
  return withRetry(async () => {
    const res = await api.get('/Etablissements?limit=200')
    return res.data.list || []
  })
}

export async function createEtablissement(data) {
  return withRetry(async () => {
    const res = await api.post('/Etablissements', data)
    return res.data
  })
}

// ---- Deploiements ----

export async function getDeploiements(sessionId) {
  return withRetry(async () => {
    const where = sessionId ? `?where=(sessionId,eq,${sessionId})&limit=200` : '?limit=200'
    const res = await api.get(`/Deploiements${where}`)
    return res.data.list || []
  })
}

export async function createDeploiement(data) {
  return withRetry(async () => {
    const res = await api.post('/Deploiements', data)
    return res.data
  })
}

export async function deleteDeploiement(id) {
  return withRetry(async () => {
    const res = await api.delete(`/Deploiements/${id}`)
    return res.data
  })
}

// ---- Sessions ----

export async function getSessions() {
  return withRetry(async () => {
    const res = await api.get('/Sessions?limit=200')
    return res.data.list || []
  })
}

export async function createSession(data) {
  return withRetry(async () => {
    const res = await api.post('/Sessions', data)
    return res.data
  })
}

export async function updateSession(id, data) {
  return withRetry(async () => {
    const res = await api.patch(`/Sessions/${id}`, data)
    return res.data
  })
}

// ---- Positions ----

export async function getPositions(sessionId) {
  return withRetry(async () => {
    const where = sessionId ? `?where=(sessionId,eq,${sessionId})&limit=200` : '?limit=200'
    const res = await api.get(`/Positions${where}`)
    const list = res.data.list || []
    // Convert list to { [appId]: { x, y } } map
    return list.reduce((acc, row) => {
      acc[row.applicationId] = { x: row.x, y: row.y }
      return acc
    }, {})
  })
}

export async function savePositions(sessionId, positions) {
  return withRetry(async () => {
    // Fetch existing position rows for this session
    const where = `?where=(sessionId,eq,${sessionId})&limit=200`
    const res = await api.get(`/Positions${where}`)
    const existing = res.data.list || []
    const existingMap = existing.reduce((acc, row) => {
      acc[row.applicationId] = row
      return acc
    }, {})

    const ops = Object.entries(positions).map(async ([appId, pos]) => {
      if (existingMap[appId]) {
        await api.patch(`/Positions/${existingMap[appId].Id}`, { x: pos.x, y: pos.y })
      } else {
        await api.post('/Positions', { sessionId, applicationId: appId, x: pos.x, y: pos.y })
      }
    })
    await Promise.all(ops)
  })
}
