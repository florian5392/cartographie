import { useState } from 'react'
import useSessionStore from '../../stores/sessionStore'
import * as api from '../../api/api'

export default function QuickAddEtablissement({ readOnly }) {
  const { session, etablissements, applications, deploiements, addEtablissement, addDeploiement, removeDeploiement, demoMode } =
    useSessionStore()

  const [etabForm, setEtabForm] = useState({ nom: '', couleur: '#3b82f6', description: '' })
  const [depForm, setDepForm] = useState({ applicationId: '', etablissementId: '', environnement: 'production' })
  const [etabSuccess, setEtabSuccess] = useState(false)
  const [depSuccess, setDepSuccess] = useState(false)
  const [error, setError] = useState(null)

  if (readOnly) {
    return <div className="text-gray-500 text-sm p-4 text-center">Session en lecture seule</div>
  }

  // Only show in multi-sites mode
  if (session?.perimetre !== 'multi-sites') {
    return (
      <div className="p-3 text-gray-400 text-sm">
        Ce panneau est disponible uniquement pour les sessions multi-sites.
      </div>
    )
  }

  const handleEtabChange = (e) => {
    const { name, value } = e.target
    setEtabForm((f) => ({ ...f, [name]: value }))
  }

  const handleEtabSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!etabForm.nom.trim()) return
    const newEtab = {
      ...etabForm,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    }
    if (!demoMode) {
      try {
        const created = await api.createEtablissement(newEtab)
        addEtablissement({ ...newEtab, ...created })
      } catch {
        setError('Erreur lors de la création.')
        return
      }
    } else {
      addEtablissement(newEtab)
    }
    setEtabForm({ nom: '', couleur: '#3b82f6', description: '' })
    setEtabSuccess(true)
    setTimeout(() => setEtabSuccess(false), 2000)
  }

  const handleDepChange = (e) => {
    const { name, value } = e.target
    setDepForm((f) => ({ ...f, [name]: value }))
  }

  const handleDepSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!depForm.applicationId || !depForm.etablissementId) {
      setError('Application et établissement sont requis.')
      return
    }
    const alreadyExists = deploiements.some(
      (d) => d.applicationId === depForm.applicationId && d.etablissementId === depForm.etablissementId,
    )
    if (alreadyExists) {
      setError('Ce déploiement existe déjà.')
      return
    }
    const newDep = {
      ...depForm,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      sessionId: session?.id,
    }
    if (!demoMode) {
      try {
        const created = await api.createDeploiement(newDep)
        addDeploiement({ ...newDep, ...created })
      } catch {
        setError('Erreur lors de la création du déploiement.')
        return
      }
    } else {
      addDeploiement(newDep)
    }
    setDepForm({ applicationId: '', etablissementId: '', environnement: 'production' })
    setDepSuccess(true)
    setTimeout(() => setDepSuccess(false), 2000)
  }

  const handleRemoveDep = async (id) => {
    if (!demoMode) {
      try {
        await api.deleteDeploiement(id)
      } catch {
        // continue anyway
      }
    }
    removeDeploiement(id)
  }

  return (
    <div className="space-y-5 p-1">
      {/* Ajouter un établissement */}
      <section>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Ajouter un établissement</h3>
        <form onSubmit={handleEtabSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              name="nom"
              value={etabForm.nom}
              onChange={handleEtabChange}
              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Nom de l'établissement"
              required
            />
            <input
              type="color"
              name="couleur"
              value={etabForm.couleur}
              onChange={handleEtabChange}
              className="w-10 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
            />
          </div>
          <input
            name="description"
            value={etabForm.description}
            onChange={handleEtabChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Description (optionnel)"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded text-sm transition-colors"
          >
            Créer l&apos;établissement
          </button>
          {etabSuccess && <div className="text-green-400 text-xs text-center">Établissement créé !</div>}
        </form>
      </section>

      {/* Liste des établissements */}
      {etablissements.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Établissements ({etablissements.length})</h3>
          <div className="space-y-1">
            {etablissements.map((etab) => (
              <div key={etab.id} className="flex items-center gap-2 py-1 px-2 rounded bg-gray-800">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: etab.couleur }}
                />
                <span className="text-sm text-gray-200">{etab.nom}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Assigner une application */}
      <section>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Assigner une application</h3>
        <form onSubmit={handleDepSubmit} className="space-y-2">
          <select
            name="applicationId"
            value={depForm.applicationId}
            onChange={handleDepChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">— Application —</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>{app.nom}</option>
            ))}
          </select>
          <select
            name="etablissementId"
            value={depForm.etablissementId}
            onChange={handleDepChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">— Établissement —</option>
            {etablissements.map((etab) => (
              <option key={etab.id} value={etab.id}>{etab.nom}</option>
            ))}
          </select>
          <select
            name="environnement"
            value={depForm.environnement}
            onChange={handleDepChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="production">Production</option>
            <option value="recette">Recette</option>
            <option value="développement">Développement</option>
          </select>
          {error && <div className="text-red-400 text-xs">{error}</div>}
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-3 rounded text-sm transition-colors"
          >
            Assigner
          </button>
          {depSuccess && <div className="text-green-400 text-xs text-center">Déploiement créé !</div>}
        </form>
      </section>

      {/* Liste des déploiements */}
      {deploiements.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Déploiements ({deploiements.length})</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {deploiements.map((dep) => {
              const app = applications.find((a) => a.id === dep.applicationId)
              const etab = etablissements.find((e) => e.id === dep.etablissementId)
              return (
                <div key={dep.id} className="flex items-center gap-2 py-1 px-2 rounded bg-gray-800 text-xs">
                  <span className="flex-1 text-gray-300">
                    {app?.nom || dep.applicationId} → {etab?.nom || dep.etablissementId}
                  </span>
                  <span className="text-gray-500">{dep.environnement}</span>
                  <button
                    onClick={() => handleRemoveDep(dep.id)}
                    className="text-red-400 hover:text-red-300 ml-1"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
