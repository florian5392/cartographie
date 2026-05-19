import { useState } from 'react'
import useSessionStore from '../../stores/sessionStore'
import * as api from '../../api/api'

const PERIMETRES = [
  { value: 'mono-site', label: 'Mono-site' },
  { value: 'multi-sites', label: 'Multi-sites' },
]

export default function SessionSelector({ onViewChange }) {
  const { sessions, etablissements, setSession, demoMode, applications } = useSessionStore()
  const [showForm, setShowForm] = useState(false)
  const [compareIds, setCompareIds] = useState(new Set())
  const [form, setForm] = useState({
    nom: '',
    date: new Date().toISOString().slice(0, 10),
    perimetre: 'mono-site',
    etablissementCible: '',
    statut: 'en cours',
    preloadApps: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.nom.trim()) return
    setLoading(true)
    setError(null)
    try {
      const sessionData = {
        nom: form.nom.trim(),
        date: form.date,
        perimetre: form.perimetre,
        etablissementCible: form.perimetre === 'mono-site' ? form.etablissementCible : null,
        statut: 'en cours',
      }

      let newSession
      if (demoMode) {
        newSession = { ...sessionData, id: crypto.randomUUID() }
      } else {
        newSession = await api.createSession(sessionData)
        if (!newSession.id && newSession.Id) newSession.id = newSession.Id
      }

      // If preloadApps, copy existing applications to new session
      if (form.preloadApps && applications.length > 0) {
        newSession._preloadedApps = applications.map((a) => ({
          ...a,
          id: crypto.randomUUID(),
          sessionId: newSession.id,
        }))
      }

      await setSession(newSession)
    } catch (e) {
      setError(e.message || 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async (session) => {
    setLoading(true)
    await setSession(session)
    setLoading(false)
  }

  const toggleCompare = (id) => {
    setCompareIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); return next }
      if (next.size < 2) { next.add(id); return next }
      return prev
    })
  }

  const handleCompare = () => {
    const [id1, id2] = [...compareIds]
    const s1 = sessions.find(s => s.id === id1)
    const s2 = sessions.find(s => s.id === id2)
    if (s1 && s2) onViewChange?.({ type: 'compare', sessions: [s1, s2] })
  }

  const handleDuplicate = async (session) => {
    setLoading(true)
    const dup = {
      ...session,
      id: crypto.randomUUID(),
      nom: `${session.nom} (copie)`,
      statut: 'en cours',
      _appCount: undefined,
      _fluxCount: undefined,
    }
    if (!demoMode) {
      try {
        const created = await api.createSession(dup)
        if (created.Id && !created.id) created.id = created.Id
        await setSession(created)
        setLoading(false)
        return
      } catch {
        // fall through
      }
    }
    await setSession(dup)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">◈</div>
          <h1 className="text-3xl font-bold text-white mb-2">Cartographie SI</h1>
          <p className="text-gray-400">Outil d&apos;atelier de cartographie applicative</p>
          {demoMode && (
            <div className="mt-3 inline-block bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              Mode démo — PostgREST non disponible
            </div>
          )}
          {/* Vue globale / Référentiel */}
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => onViewChange?.('consolidated')}
              className="text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 px-3 py-1.5 rounded transition-colors"
            >
              Vue globale
            </button>
            <button
              onClick={() => onViewChange?.('referentiel')}
              className="text-xs bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 px-3 py-1.5 rounded transition-colors"
            >
              Référentiel
            </button>
          </div>
        </div>

        {/* Sessions list */}
        {sessions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Sessions existantes
              </h2>
              {compareIds.size === 2 && (
                <button
                  onClick={handleCompare}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded transition-colors font-medium"
                >
                  Comparer les 2 sessions
                </button>
              )}
              {compareIds.size === 1 && (
                <span className="text-xs text-gray-500">Sélectionnez une 2e session pour comparer</span>
              )}
            </div>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`bg-gray-800 border rounded-lg p-4 flex items-center justify-between gap-4 transition-colors ${
                    compareIds.has(s.id) ? 'border-indigo-600' : 'border-gray-700'
                  }`}
                >
                  {/* Checkbox comparaison */}
                  <button
                    onClick={() => toggleCompare(s.id)}
                    title="Sélectionner pour comparaison"
                    className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      compareIds.has(s.id)
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-gray-600 hover:border-indigo-500'
                    }`}
                  >
                    {compareIds.has(s.id) && <span className="text-[10px] font-bold leading-none">✓</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white truncate">{s.nom}</span>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                          s.statut === 'en cours'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {s.statut}
                      </span>
                      {s.statut === 'terminée' && (
                        <span className="shrink-0 text-gray-500 text-xs">🔒</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{s.date}</span>
                      <span className="capitalize">{s.perimetre}</span>
                      {s.etablissementCible && (
                        <span className="text-blue-400">{s.etablissementCible}</span>
                      )}
                      {(s._appCount !== undefined || s._fluxCount !== undefined) && (
                        <span className="text-gray-600">
                          {s._appCount ?? '?'} apps · {s._fluxCount ?? '?'} flux
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleResume(s)}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      Reprendre
                    </button>
                    <button
                      onClick={() => handleDuplicate(s)}
                      disabled={loading}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      Dupliquer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New session */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-200">Nouvelle session</h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                + Créer
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom de la session *</label>
                <input
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  autoFocus
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Atelier cartographie — Juin 2024"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Périmètre</label>
                  <div className="flex gap-2">
                    {PERIMETRES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, perimetre: p.value }))}
                        className={`flex-1 py-2 text-xs rounded border transition-colors ${
                          form.perimetre === p.value
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Etablissement cible — mono-site only */}
              {form.perimetre === 'mono-site' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Établissement cible</label>
                  {etablissements.length > 0 ? (
                    <select
                      name="etablissementCible"
                      value={form.etablissementCible}
                      onChange={handleChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">— Sélectionner —</option>
                      {etablissements.map((e) => (
                        <option key={e.id} value={e.nom}>{e.nom}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name="etablissementCible"
                      value={form.etablissementCible}
                      onChange={handleChange}
                      placeholder="Nom de l'établissement"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              )}

              {/* Preload apps */}
              {applications.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="preloadApps"
                    checked={form.preloadApps}
                    onChange={handleChange}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  Pré-charger les {applications.length} applications existantes
                </label>
              )}

              {error && <div className="text-red-400 text-sm">{error}</div>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer et ouvrir'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
