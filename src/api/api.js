import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const client = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 10000,
})

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

// ── Mappers ──────────────────────────────────────────────────────────────────

function toSession(r) {
  return {
    id: r.id, nom: r.nom, date: r.date, perimetre: r.perimetre, statut: r.statut,
    etablissementCible: r.etablissement_cible,
    _fluxCount: r.flux_count ?? 0,
    _appCount: r.app_count ?? 0,
  }
}

function fromSession(d) {
  const row = { nom: d.nom, date: d.date, perimetre: d.perimetre, statut: d.statut, etablissement_cible: d.etablissementCible }
  if (d.id) row.id = d.id
  return row
}

function toApplication(r) {
  return { id: r.id, sessionId: r.session_id, nom: r.nom, type: r.type, editeur: r.editeur, version: r.version, criticite: r.criticite, perimetre: r.perimetre, statut: r.statut, description: r.description, responsable: r.responsable, hebergement: r.hebergement, portee: r.portee }
}

function fromApplication(d) {
  return { id: d.id, session_id: d.sessionId, nom: d.nom, type: d.type, editeur: d.editeur, version: d.version, criticite: d.criticite, perimetre: d.perimetre, statut: d.statut, description: d.description, responsable: d.responsable, hebergement: d.hebergement, portee: d.portee }
}

function toFlux(r) {
  return { id: r.id, sessionId: r.session_id, sourceId: r.source_id, cibleId: r.cible_id, type: r.type, label: r.label, description: r.description, frequence: r.frequence, critique: r.critique }
}

function fromFlux(d) {
  return { id: d.id, session_id: d.sessionId, source_id: d.sourceId, cible_id: d.cibleId, type: d.type, label: d.label, description: d.description, frequence: d.frequence, critique: d.critique }
}

function toEtablissement(r) { return { id: r.id, nom: r.nom, couleur: r.couleur } }

function toDeploiement(r) {
  return { id: r.id, sessionId: r.session_id, applicationId: r.application_id, etablissementId: r.etablissement_id, environnement: r.environnement }
}

function fromDeploiement(d) {
  return { id: d.id, session_id: d.sessionId, application_id: d.applicationId, etablissement_id: d.etablissementId, environnement: d.environnement }
}

// ── Health check ─────────────────────────────────────────────────────────────

export async function isAPIReachable() {
  try {
    const check = axios.create({ baseURL: BASE_URL, timeout: 5000 })
    await check.get('/api/')
    return true
  } catch (err) {
    if (err.response && err.response.status < 500) return true
    return false
  }
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions() {
  return withRetry(async () => {
    const res = await client.get('/sessions_view?order=date.desc&limit=200')
    return res.data.map(toSession)
  })
}

export async function createSession(data) {
  return withRetry(async () => {
    const res = await client.post('/sessions', fromSession(data), {
      headers: { Prefer: 'return=representation' },
    })
    return toSession(res.data[0])
  })
}

export async function updateSession(id, data) {
  return withRetry(async () => {
    await client.patch(`/sessions?id=eq.${id}`, data)
  })
}

// ── Applications ─────────────────────────────────────────────────────────────

export async function getApplications(sessionId) {
  return withRetry(async () => {
    const filter = sessionId ? `?session_id=eq.${sessionId}&limit=500` : '?limit=500'
    const res = await client.get(`/applications${filter}`)
    return res.data.map(toApplication)
  })
}

export async function upsertApplication(data) {
  return withRetry(async () => {
    await client.post('/applications', fromApplication(data), {
      headers: { Prefer: 'resolution=merge-duplicates' },
    })
  })
}

export async function deleteApplication(id) {
  return withRetry(async () => {
    await client.delete(`/applications?id=eq.${id}`)
  })
}

// ── Flux ─────────────────────────────────────────────────────────────────────

export async function getFlux(sessionId) {
  return withRetry(async () => {
    const filter = sessionId ? `?session_id=eq.${sessionId}&limit=500` : '?limit=500'
    const res = await client.get(`/flux${filter}`)
    return res.data.map(toFlux)
  })
}

export async function createFlux(data) {
  return withRetry(async () => {
    const res = await client.post('/flux', fromFlux(data), {
      headers: { Prefer: 'return=representation' },
    })
    return toFlux(res.data[0])
  })
}

export async function updateFlux(id, data) {
  return withRetry(async () => {
    await client.patch(`/flux?id=eq.${id}`, fromFlux(data))
  })
}

export async function deleteFlux(id) {
  return withRetry(async () => {
    await client.delete(`/flux?id=eq.${id}`)
  })
}

// ── Établissements ───────────────────────────────────────────────────────────

export async function getEtablissements() {
  return withRetry(async () => {
    const res = await client.get('/etablissements?limit=200')
    return res.data.map(toEtablissement)
  })
}

export async function createEtablissement(data) {
  return withRetry(async () => {
    const res = await client.post(
      '/etablissements',
      { id: data.id, nom: data.nom, couleur: data.couleur },
      { headers: { Prefer: 'return=representation' } },
    )
    return toEtablissement(res.data[0])
  })
}

// ── Déploiements ─────────────────────────────────────────────────────────────

export async function getDeploiements(sessionId) {
  return withRetry(async () => {
    const filter = sessionId ? `?session_id=eq.${sessionId}&limit=500` : '?limit=500'
    const res = await client.get(`/deploiements${filter}`)
    return res.data.map(toDeploiement)
  })
}

export async function createDeploiement(data) {
  return withRetry(async () => {
    const res = await client.post('/deploiements', fromDeploiement(data), {
      headers: { Prefer: 'return=representation' },
    })
    return toDeploiement(res.data[0])
  })
}

export async function deleteDeploiement(id) {
  return withRetry(async () => {
    await client.delete(`/deploiements?id=eq.${id}`)
  })
}

// ── Positions ─────────────────────────────────────────────────────────────────

export async function getPositions(sessionId) {
  return withRetry(async () => {
    const res = await client.get(`/positions?session_id=eq.${sessionId}&limit=500`)
    return res.data.reduce((acc, row) => {
      acc[row.application_id] = { x: row.x, y: row.y }
      return acc
    }, {})
  })
}

export async function savePositions(sessionId, positions) {
  return withRetry(async () => {
    const rows = Object.entries(positions).map(([appId, pos]) => ({
      session_id: sessionId,
      application_id: appId,
      x: pos.x,
      y: pos.y,
    }))
    if (rows.length === 0) return
    // Composite PK (session_id, application_id) — upsert via merge-duplicates
    await client.post('/positions', rows, {
      headers: { Prefer: 'resolution=merge-duplicates' },
    })
  })
}
