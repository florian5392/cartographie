import { useState } from 'react'
import useSessionStore from '../../stores/sessionStore'

const defaultForm = {
  sourceId: '',
  cibleId: '',
  type: 'API',
  label: '',
  description: '',
  frequence: '',
  volume: '',
  critique: false,
}

const FLUX_TYPES = ['API', 'Fichier', 'BDD', 'Manuel', 'EDI', 'Autre']
const FREQUENCES = ['Temps réel', 'Toutes les 15 min', 'Horaire', 'Quotidien', 'Hebdomadaire', 'Mensuel', 'Ponctuel']
const VOLUMES = ['Faible', 'Moyen', 'Élevé', 'Continu']

export default function QuickAddFlux() {
  const { applications, session, addFlux } = useSessionStore()
  const [form, setForm] = useState(defaultForm)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    if (!form.sourceId || !form.cibleId) {
      setError('Source et cible sont obligatoires.')
      return
    }
    if (form.sourceId === form.cibleId) {
      setError('La source et la cible ne peuvent pas être identiques.')
      return
    }

    const newFlux = {
      ...form,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      sessionId: session?.id,
    }
    addFlux(newFlux)
    setForm(defaultForm)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-1">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Source *</label>
        <select
          name="sourceId"
          value={form.sourceId}
          onChange={handleChange}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          required
        >
          <option value="">— Sélectionner —</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>{app.nom}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Cible *</label>
        <select
          name="cibleId"
          value={form.cibleId}
          onChange={handleChange}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          required
        >
          <option value="">— Sélectionner —</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>{app.nom}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {FLUX_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fréquence</label>
          <select
            name="frequence"
            value={form.frequence}
            onChange={handleChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">— Choisir —</option>
            {FREQUENCES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Libellé</label>
        <input
          name="label"
          value={form.label}
          onChange={handleChange}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Ex: Synchronisation patients"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Volume</label>
        <select
          name="volume"
          value={form.volume}
          onChange={handleChange}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">— Choisir —</option>
          {VOLUMES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Détail du flux..."
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="critique"
          checked={form.critique}
          onChange={handleChange}
          className="rounded"
        />
        <span className="text-sm text-gray-300">Flux critique</span>
      </label>

      {error && <div className="text-red-400 text-xs">{error}</div>}

      <button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
      >
        Ajouter le flux
      </button>

      {success && (
        <div className="text-green-400 text-xs text-center">Flux ajouté !</div>
      )}
    </form>
  )
}
