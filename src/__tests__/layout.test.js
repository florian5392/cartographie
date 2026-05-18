import { describe, it, expect } from 'vitest'

// ── Copie des fonctions pures de GraphCanvas (non exportées, on les extrait ici)
// Si ces fonctions sont un jour extraites dans un module utilitaire, importer depuis là.

function computeGridLayout(apps) {
  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(apps.length))))
  const colW = 260
  const rowH = 170
  return apps.reduce((acc, app, i) => {
    acc[app.id] = { x: (i % cols) * colW + 60, y: Math.floor(i / cols) * rowH + 60 }
    return acc
  }, {})
}

function computeMultiSiteLayout(apps, deploiements, etablissements) {
  const appEtabMap = {}
  for (const dep of deploiements) {
    if (!appEtabMap[dep.applicationId]) appEtabMap[dep.applicationId] = new Set()
    appEtabMap[dep.applicationId].add(dep.etablissementId)
  }

  const transverseIds = new Set(
    apps
      .filter(a => a.perimetre === 'global' || (appEtabMap[a.id]?.size > 1))
      .map(a => a.id),
  )

  const colApps = {}
  for (const e of etablissements) colApps[e.id] = []
  colApps['_none'] = []

  for (const app of apps) {
    if (transverseIds.has(app.id)) continue
    const etabs = appEtabMap[app.id]
    if (etabs?.size === 1) {
      const etabId = [...etabs][0]
      ;(colApps[etabId] || colApps['_none']).push(app)
    } else {
      colApps['_none'].push(app)
    }
  }

  const positions = {}
  const COL_W = 270
  const ROW_H = 175
  const APP_W = 220
  const TRANS_Y = 60
  const COL_Y = 280

  const transverse = apps.filter(a => transverseIds.has(a.id))
  transverse.forEach((app, i) => {
    positions[app.id] = { x: i * (APP_W + 30) + 60, y: TRANS_Y }
  })

  let colIdx = 0
  for (const etab of etablissements) {
    if (!colApps[etab.id]?.length) continue
    colApps[etab.id].forEach((app, i) => {
      positions[app.id] = { x: colIdx * COL_W + 60, y: COL_Y + i * ROW_H }
    })
    colIdx++
  }
  if (colApps['_none'].length) {
    colApps['_none'].forEach((app, i) => {
      positions[app.id] = { x: colIdx * COL_W + 60, y: COL_Y + i * ROW_H }
    })
  }

  return { positions }
}

// ─── computeGridLayout ────────────────────────────────────────────────────────

describe('computeGridLayout', () => {
  const makeApps = (n) => Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}` }))

  it('une seule app → position de départ (60, 60)', () => {
    const pos = computeGridLayout(makeApps(1))
    expect(pos['a1']).toEqual({ x: 60, y: 60 })
  })

  it('4 apps → 2 colonnes (sqrt(4) = 2)', () => {
    const pos = computeGridLayout(makeApps(4))
    // col 0 : a1, a3 ; col 1 : a2, a4
    expect(pos['a1'].x).toBe(60)           // col 0
    expect(pos['a2'].x).toBe(60 + 260)     // col 1
    expect(pos['a3'].y).toBe(60 + 170)     // row 1
  })

  it('8 apps → au plus 4 colonnes', () => {
    const pos = computeGridLayout(makeApps(8))
    const xs = Object.values(pos).map(p => p.x)
    const uniqueX = new Set(xs)
    expect(uniqueX.size).toBeLessThanOrEqual(4)
  })

  it('16 apps → au plus 4 colonnes (plafond à 4)', () => {
    const pos = computeGridLayout(makeApps(16))
    const xs = Object.values(pos).map(p => p.x)
    const uniqueX = new Set(xs)
    expect(uniqueX.size).toBeLessThanOrEqual(4)
  })

  it('aucune collision de positions', () => {
    const pos = computeGridLayout(makeApps(12))
    const keys = Object.values(pos).map(p => `${p.x},${p.y}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(12)
  })

  it('tableau vide → objet vide', () => {
    expect(computeGridLayout([])).toEqual({})
  })
})

// ─── computeMultiSiteLayout ───────────────────────────────────────────────────

describe('computeMultiSiteLayout', () => {
  const etab1 = { id: 'e1', nom: 'CHU Central', couleur: '#3b82f6' }
  const etab2 = { id: 'e2', nom: 'Clinique Sud', couleur: '#22c55e' }

  it('place les apps globales dans la zone transverse (y = 60)', () => {
    const apps = [
      { id: 'a1', perimetre: 'global' },
      { id: 'a2', perimetre: 'local' },
    ]
    const deps = [{ applicationId: 'a2', etablissementId: 'e1' }]
    const { positions } = computeMultiSiteLayout(apps, deps, [etab1])

    expect(positions['a1'].y).toBe(60)   // zone transverse
    expect(positions['a2'].y).toBeGreaterThan(60) // zone colonne
  })

  it('place une app présente dans 2 établissements en zone transverse', () => {
    const apps = [{ id: 'a1', perimetre: 'local' }]
    const deps = [
      { applicationId: 'a1', etablissementId: 'e1' },
      { applicationId: 'a1', etablissementId: 'e2' },
    ]
    const { positions } = computeMultiSiteLayout(apps, deps, [etab1, etab2])

    expect(positions['a1'].y).toBe(60) // transverse car 2 étabs
  })

  it('apps sans déploiement vont dans la colonne "Non assigné"', () => {
    const apps = [
      { id: 'a1', perimetre: 'local' },
      { id: 'a2', perimetre: 'local' }, // aucun déploiement
    ]
    const deps = [{ applicationId: 'a1', etablissementId: 'e1' }]
    const { positions } = computeMultiSiteLayout(apps, deps, [etab1])

    // a2 doit avoir une position (colonne _none)
    expect(positions['a2']).toBeDefined()
    expect(positions['a2'].y).toBeGreaterThan(60)
  })

  it('toutes les apps ont une position', () => {
    const apps = [
      { id: 'a1', perimetre: 'global' },
      { id: 'a2', perimetre: 'local' },
      { id: 'a3', perimetre: 'local' },
    ]
    const deps = [
      { applicationId: 'a2', etablissementId: 'e1' },
      { applicationId: 'a3', etablissementId: 'e2' },
    ]
    const { positions } = computeMultiSiteLayout(apps, deps, [etab1, etab2])

    expect(Object.keys(positions)).toHaveLength(3)
    for (const app of apps) {
      expect(positions[app.id]).toBeDefined()
    }
  })

  it('tableau vide → positions vide', () => {
    const { positions } = computeMultiSiteLayout([], [], [])
    expect(positions).toEqual({})
  })
})
