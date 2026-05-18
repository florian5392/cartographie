import { useState, useEffect } from 'react'
import useSessionStore from '../../stores/sessionStore'
import * as api from '../../api/nocodb'

const PERIMETRES = ['mono-site', 'multi-sites', 'domaine métier']

export default function SessionSelector() {
  const { sessions, setSession, demoMode } = useSessionStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    date: new Date().toISOString().slice(0, 10),
    perimetre: 'mono-site',
    statut: 'en cours',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.nom.trim()) return
    setLoading(true)
    setError(null)
    try {
      let newSession
      if (demoMode) {
        newSession = {
          ...form,
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        }
      } else {
        newSession = await api.createSession(form)
        if (!newSession.id && newSession.Id) newSession.id = newSession.Id
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

  const handleDuplicate = async (session) => {
    const dup = {
      ...session,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      nom: `${session.nom} (copie)`,
      statut: 'en cours',
    }
    if (!demoMode) {
      try {
        const created = await api.createSession(dup)
        if (created.Id && !created.id) created.id = created.Id
        await setSession(created)
        return
      } catch {
        // fall through to demo handling
      }
    }
    await setSession(dup)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Cartographie SI</h1>
          <p className="text-gray-400">Outil d&apos;atelier de cartographie applicative</p>
          {demoMode && (
            <div className="mt-3 inline-block bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
              Mode démo — NocoDB non disponible
            </div>
          )}
        </div>

        {/* Sessions list */}
        {sessions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-3">Sessions existantes</h2>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-white">{s.nom}</div>
                    <div className="text-sm text-gray-400 flex gap-3 mt-1">
                      <span>{s.date}</span>
                      <span className="capitalize">{s.perimetre}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs ${
                          s.statut === 'en cours'
                            ? 'bg-green-900 text-green-300'
                            : s.statut === 'terminé'
                            ? 'bg-gray-700 text-gray-400'
                            : 'bg-blue-900 text-blue-300'
                        }`}
                      >
                        {s.statut}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
            <h2 className="text-lg font-semibold text-gray-200">Nouvelle session</h2>
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
                  <select
                    name="perimetre"
                    value={form.perimetre}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {PERIMETRES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

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
                  onClick={() => setShowForm(false)}
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
