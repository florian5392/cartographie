import { useState, useEffect, useMemo } from 'react'
import useSessionStore from '../../stores/sessionStore'
import * as api from '../../api/api'
import { demoApplications, demoEtablissements, demoDeploiements } from '../../data/demoData'

const CRITICITE_COLOR = {
  haute:   'text-red-400',
  moyenne: 'text-orange-400',
  basse:   'text-gray-400',
}

const SORT_KEYS = [
  ['nom', 'Nom'],
  ['type', 'Type'],
  ['hebergement', 'Hébergement'],
  ['portee', 'Portée'],
  ['criticite', 'Criticité'],
  ['editeur', 'Éditeur'],
  ['statut', 'Statut'],
]

export default function ReferentielTable({ onBack }) {
  const { demoMode } = useSessionStore()
  const [applications, setApplications]     = useState([])
  const [etablissements, setEtablissements] = useState([])
  const [deploiements, setDeploiements]     = useState([])
  const [loading, setLoading]               = useState(true)

  const [search, setSearch]               = useState('')
  const [filterType, setFilterType]       = useState('')
  const [filterCriticite, setFilterCriticite] = useState('')
  const [sortKey, setSortKey]             = useState('nom')
  const [sortDir, setSortDir]             = useState('asc')

  useEffect(() => {
    async function load() {
      if (demoMode) {
        setApplications(demoApplications)
        setEtablissements(demoEtablissements)
        setDeploiements(demoDeploiements)
        setLoading(false)
        return
      }
      try {
        const [apps, etabs, deps] = await Promise.all([
          api.getApplications(),
          api.getEtablissements(),
          api.getDeploiements(),
        ])
        setApplications(apps)
        setEtablissements(etabs)
        setDeploiements(deps)
      } catch (err) {
        console.error('ReferentielTable load error', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [demoMode])

  const appEtabsMap = useMemo(() => {
    const map = {}
    for (const dep of deploiements) {
      if (!map[dep.applicationId]) map[dep.applicationId] = new Set()
      map[dep.applicationId].add(dep.etablissementId)
    }
    return map
  }, [deploiements])

  const types = useMemo(
    () => [...new Set(applications.map(a => a.type).filter(Boolean))].sort(),
    [applications],
  )

  const filtered = useMemo(() => {
    let list = applications
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.nom.toLowerCase().includes(q) ||
        (a.editeur || '').toLowerCase().includes(q) ||
        (a.type || '').toLowerCase().includes(q),
      )
    }
    if (filterType)      list = list.filter(a => a.type === filterType)
    if (filterCriticite) list = list.filter(a => a.criticite === filterCriticite)
    return [...list].sort((a, b) => {
      const va = (a[sortKey] || '').toString().toLowerCase()
      const vb = (b[sortKey] || '').toString().toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [applications, search, filterType, filterCriticite, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const exportCSV = () => {
    const etabHeaders = etablissements.map(e => `"${e.nom}"`)
    const headers = ['Nom', 'Type', 'Hébergement', 'Portée', 'Criticité', 'Éditeur', 'Version', 'Statut', 'Responsable', ...etabHeaders]
    const rows = filtered.map(app => {
      const etabCells = etablissements.map(e => appEtabsMap[app.id]?.has(e.id) ? '✓' : '')
      return [
        `"${app.nom}"`,
        `"${app.type || ''}"`,
        `"${app.hebergement || ''}"`,
        `"${app.portee || ''}"`,
        `"${app.criticite || ''}"`,
        `"${app.editeur || ''}"`,
        `"${app.version || ''}"`,
        `"${app.statut || ''}"`,
        `"${app.responsable || ''}"`,
        ...etabCells,
      ]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `referentiel_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400 text-sm">Chargement…</div>
      </div>
    )
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="text-gray-700 ml-1">↕</span>
    return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center flex-wrap gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700 shrink-0"
        >
          ← Retour
        </button>
        <div className="w-px h-5 bg-gray-700 shrink-0" />
        <span className="text-white font-semibold shrink-0">Référentiel applicatif</span>
        <span className="text-xs text-gray-500 shrink-0">
          {filtered.length} / {applications.length} applications
        </span>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-40"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Tous les types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterCriticite}
          onChange={e => setFilterCriticite(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Toutes criticités</option>
          <option value="haute">Haute</option>
          <option value="moyenne">Moyenne</option>
          <option value="basse">Basse</option>
        </select>

        <button
          onClick={exportCSV}
          className="ml-auto bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium px-3 py-1.5 rounded transition-colors shrink-0"
        >
          Exporter CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-800 border-b border-gray-700 z-10">
            <tr>
              {SORT_KEYS.map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-200 whitespace-nowrap select-none"
                >
                  {label}<SortIcon col={key} />
                </th>
              ))}
              {etablissements.map(e => (
                <th
                  key={e.id}
                  className="px-3 py-2.5 text-center text-xs font-medium whitespace-nowrap"
                  style={{ color: e.couleur || '#6b7280' }}
                >
                  {e.nom}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={SORT_KEYS.length + etablissements.length}
                  className="px-4 py-10 text-center text-gray-600"
                >
                  Aucune application trouvée
                </td>
              </tr>
            ) : filtered.map((app, idx) => (
              <tr
                key={app.id}
                className={`border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-900/40'}`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {app.couleur && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: app.couleur }} />
                    )}
                    <span className="text-white font-medium">{app.nom}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{app.type}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{app.hebergement}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{app.portee}</td>
                <td className={`px-4 py-2.5 text-xs font-medium capitalize ${CRITICITE_COLOR[app.criticite] || 'text-gray-400'}`}>
                  {app.criticite}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{app.editeur}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs capitalize">{app.statut}</td>
                {etablissements.map(e => (
                  <td key={e.id} className="px-3 py-2.5 text-center text-xs">
                    {appEtabsMap[app.id]?.has(e.id)
                      ? <span className="text-green-400 font-bold">✓</span>
                      : <span className="text-gray-700">—</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
